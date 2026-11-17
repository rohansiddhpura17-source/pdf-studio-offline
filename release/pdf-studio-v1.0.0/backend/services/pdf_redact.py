import re
from typing import List, Optional, Tuple, Dict, Any
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    DecodedStreamObject,
    NameObject,
    DictionaryObject,
    ArrayObject,
    FloatObject,
    NumberObject
)
from schemas.edit import Rect, RedactAnnotationItem

def hex_to_rgb(hex_str: str) -> Tuple[float, float, float]:
    """Convert hex string (#RRGGBB) to 0.0-1.0 RGB tuple."""
    hex_str = hex_str.lstrip('#')
    if len(hex_str) == 3:
        hex_str = ''.join(c * 2 for c in hex_str)
    if len(hex_str) != 6:
        return 0.0, 0.0, 0.0
    r = int(hex_str[0:2], 16) / 255.0
    g = int(hex_str[2:4], 16) / 255.0
    b = int(hex_str[4:6], 16) / 255.0
    return r, g, b

def escape_pdf_string(text: str) -> str:
    """Escape parentheses and backslashes for PDF literal strings."""
    return text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

def sanitize_content_stream_by_text(stream_bytes: bytes, target_texts: List[str]) -> bytes:
    """
    Remove all occurrences of target_texts from the PDF content stream.
    Replaces literal string operands in Tj and TJ operations.
    """
    if not target_texts:
        return stream_bytes

    try:
        stream_str = stream_bytes.decode('latin1')
    except Exception:
        stream_str = stream_bytes.decode('utf-8', errors='ignore')

    for target in target_texts:
        if not target.strip():
            continue
        
        # 1. Plain exact string replacement in stream
        escaped_target = escape_pdf_string(target)
        stream_str = stream_str.replace(f"({escaped_target})", "()")
        stream_str = stream_str.replace(f"({target})", "()")
        
        # 2. Case-insensitive pattern inside Tj: (.*?) Tj
        # E.g. (Secret SSN: 123-45-6789) Tj
        pattern = re.compile(rf'\((?:[^\)]*{re.escape(target)}[^\)]*)\)\s*Tj', re.IGNORECASE)
        stream_str = pattern.sub('() Tj', stream_str)
        
        # 3. Handle TJ arrays: [ (Secret) -20 (SSN) ... ] TJ
        # When elements contain target
        pattern_tj = re.compile(rf'\[([^\]]*{re.escape(target)}[^\]]*)\]\s*TJ', re.IGNORECASE)
        stream_str = pattern_tj.sub('[] TJ', stream_str)

        # 4. Also sanitize plain occurrences in binary
        raw_target_bytes = target.encode('latin1', errors='ignore')
        stream_bytes = stream_str.encode('latin1')
        stream_bytes = stream_bytes.replace(raw_target_bytes, b'')
        stream_str = stream_bytes.decode('latin1')

    return stream_str.encode('latin1')

def sanitize_page_annotations(page: Any, rects: List[Rect], page_height: float):
    """
    Remove any annotations (links, text notes, widgets) overlapping any redaction box.
    """
    annots = page.get(NameObject('/Annots'))
    if not annots:
        return

    kept_annots = ArrayObject()
    for annot_ref in annots:
        try:
            annot_obj = annot_ref.get_object() if hasattr(annot_ref, 'get_object') else annot_ref
            if not isinstance(annot_obj, dict):
                kept_annots.append(annot_ref)
                continue
            
            annot_rect = annot_obj.get(NameObject('/Rect'))
            if not annot_rect or len(annot_rect) < 4:
                kept_annots.append(annot_ref)
                continue

            ax1, ay1, ax2, ay2 = [float(v) for v in annot_rect[:4]]
            annot_min_x, annot_max_x = min(ax1, ax2), max(ax1, ax2)
            annot_min_y, annot_max_y = min(ay1, ay2), max(ay1, ay2)

            overlaps = False
            for r in rects:
                # PDF coordinates: r.y is from top in frontend or bottom?
                # We normalize incoming rect to PDF bottom-left coordinate
                rx1 = r.x
                rx2 = r.x + r.width
                ry1 = r.y
                ry2 = r.y + r.height

                # Check box intersection
                if not (annot_max_x < rx1 or annot_min_x > rx2 or annot_max_y < ry1 or annot_min_y > ry2):
                    overlaps = True
                    break

            if not overlaps:
                kept_annots.append(annot_ref)
        except Exception:
            kept_annots.append(annot_ref)

    page[NameObject('/Annots')] = kept_annots

def apply_redaction_to_page(
    page: Any,
    redaction_item: RedactAnnotationItem,
    page_width: float,
    page_height: float
):
    """
    Permanently sanitize page content stream for the given redaction item,
    and append an opaque redaction block.
    """
    # 1. Target text sanitization
    target_texts = []
    if redaction_item.target_text:
        target_texts.append(redaction_item.target_text)

    # If rects are provided without explicit target text, find all text inside those rects
    # using pypdf's visitor_text to extract any text strings within the redaction bounding boxes
    if redaction_item.rects:
        text_inside_boxes = []
        def visitor(text, cm, tm, font_dict, font_size):
            if not text.strip():
                return
            # tm[4] is x, tm[5] is y in PDF point space
            tx, ty = tm[4], tm[5]
            for r in redaction_item.rects:
                # Check if point falls inside rect
                if (r.x <= tx <= r.x + r.width + 10) and (r.y <= ty <= r.y + r.height + 10):
                    text_inside_boxes.append(text.strip())

        try:
            page.extract_text(visitor_text=visitor)
        except Exception:
            pass

        target_texts.extend(text_inside_boxes)

    # 2. Get and sanitize existing content streams
    existing_contents = page.get_contents()
    if existing_contents is not None:
        if isinstance(existing_contents, ArrayObject):
            combined_data = b"".join(c.get_data() for c in existing_contents)
        else:
            combined_data = existing_contents.get_data()
        
        sanitized_data = sanitize_content_stream_by_text(combined_data, target_texts)
    else:
        sanitized_data = b""

    # 3. Purge overlapping annotations
    sanitize_page_annotations(page, redaction_item.rects, page_height)

    # 4. Generate opaque redaction block operations
    r, g, b = hex_to_rgb(redaction_item.fill_color or "#000000")
    tr, tg, tb = hex_to_rgb(redaction_item.text_color or "#FFFFFF")
    
    redact_ops = []
    redact_ops.append("q")  # push graphics state
    
    # Ensure font resources for overlay text
    resources = page.get(NameObject('/Resources'))
    if resources is None:
        resources = DictionaryObject()
        page[NameObject('/Resources')] = resources
    
    fonts = resources.get(NameObject('/Font'))
    if fonts is None:
        fonts = DictionaryObject()
        resources[NameObject('/Font')] = fonts
        
    if NameObject('/RedactFont') not in fonts:
        fonts[NameObject('/RedactFont')] = DictionaryObject({
            NameObject('/Type'): NameObject('/Font'),
            NameObject('/Subtype'): NameObject('/Type1'),
            NameObject('/BaseFont'): NameObject('/Helvetica-Bold'),
        })

    for rect in redaction_item.rects:
        rx = float(rect.x)
        ry = float(rect.y)
        rw = float(rect.width)
        rh = float(rect.height)

        # Draw solid fill rectangle
        redact_ops.append(f"{r:.3f} {g:.3f} {b:.3f} rg")
        redact_ops.append(f"{rx:.2f} {ry:.2f} {rw:.2f} {rh:.2f} re")
        redact_ops.append("f")

        # Optional overlay text (e.g. "[REDACTED]")
        if redaction_item.overlay_text and rw > 20 and rh > 8:
            overlay = escape_pdf_string(redaction_item.overlay_text)
            # Estimate text width and font size to fit inside box
            font_size = min(max(8.0, rh * 0.5), 14.0)
            text_x = rx + max(4.0, (rw - (len(redaction_item.overlay_text) * font_size * 0.55)) / 2)
            text_y = ry + max(2.0, (rh - font_size) / 2)

            redact_ops.append("BT")
            redact_ops.append("/RedactFont {:.1f} Tf".format(font_size))
            redact_ops.append(f"{tr:.3f} {tg:.3f} {tb:.3f} rg")
            redact_ops.append(f"{text_x:.2f} {text_y:.2f} Td")
            redact_ops.append(f"({overlay}) Tj")
            redact_ops.append("ET")

    redact_ops.append("Q\n")  # pop graphics state

    final_stream_data = sanitized_data + b"\n" + "\n".join(redact_ops).encode('latin1')
    
    # Overwrite existing content object in-place so writer._objects holds zero orphaned leaked bytes
    raw_contents = page.get(NameObject('/Contents'))
    if raw_contents is not None:
        target_obj = raw_contents.get_object() if hasattr(raw_contents, 'get_object') else raw_contents
        if isinstance(target_obj, ArrayObject):
            for idx, item in enumerate(target_obj):
                sub_obj = item.get_object() if hasattr(item, 'get_object') else item
                if hasattr(sub_obj, '_data'):
                    sub_obj._data = final_stream_data if idx == 0 else b""
                if hasattr(sub_obj, 'set_data'):
                    sub_obj.set_data(final_stream_data if idx == 0 else b"")
        else:
            if hasattr(target_obj, '_data'):
                target_obj._data = final_stream_data
            if hasattr(target_obj, 'set_data'):
                target_obj.set_data(final_stream_data)
    else:
        new_stream = DecodedStreamObject()
        new_stream.set_data(final_stream_data)
        page[NameObject('/Contents')] = new_stream
