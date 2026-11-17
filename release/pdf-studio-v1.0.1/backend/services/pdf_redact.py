import re
import io
from typing import List, Optional, Tuple, Dict, Any
from PIL import Image, ImageDraw
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

def find_image_positions_in_page(page: Any, page_width: float, page_height: float) -> Dict[str, Tuple[float, float, float, float]]:
    """
    Scan content stream graphics state (q, Q, cm, Do) to calculate page bounding box for images.
    Returns mapping from image XObject name to (min_x, min_y, max_x, max_y) in points.
    """
    contents = page.get_contents()
    if contents is None:
        return {}
    if hasattr(contents, "get_data"):
        data = contents.get_data()
    elif isinstance(contents, (list, ArrayObject)):
        data = b"".join(c.get_data() for c in contents if hasattr(c, "get_data"))
    else:
        data = b""
    stream = data.decode("latin1", errors="ignore")
    tokens = stream.split()
    stack = [[1.0, 0.0, 0.0, 1.0, 0.0, 0.0]]
    num_stack = []
    image_boxes = {}
    for t in tokens:
        if t == "q":
            stack.append(list(stack[-1]))
            num_stack.clear()
        elif t == "Q":
            if len(stack) > 1:
                stack.pop()
            num_stack.clear()
        elif t == "cm" and len(num_stack) >= 6:
            try:
                m = [float(x) for x in num_stack[-6:]]
                c0, c1, c2, c3, c4, c5 = stack[-1]
                a, b, c, d, e, f = m
                na = a * c0 + b * c2
                nb = a * c1 + b * c3
                nc = c * c0 + d * c2
                nd = c * c1 + d * c3
                ne = e * c0 + f * c2 + c4
                nf = e * c1 + f * c3 + c5
                stack[-1] = [na, nb, nc, nd, ne, nf]
            except Exception:
                pass
            num_stack.clear()
        elif t == "Do" and num_stack:
            name = num_stack[-1]
            a, b, c, d, e, f = stack[-1]
            pts = [(e, f), (a + e, b + f), (c + e, d + f), (a + c + e, b + d + f)]
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            image_boxes[name] = (min(xs), min(ys), max(xs), max(ys))
            num_stack.clear()
        else:
            num_stack.append(t)
    return image_boxes

def redact_raster_images_on_page(page: Any, rects: List[Rect], page_width: float, page_height: float) -> int:
    """
    Permanently modify underlying raster image pixels for any XObject intersecting redaction rects.
    Destroys the covered bitmap data in-place so unredacted pixels cannot be recovered from the PDF.
    """
    res = page.get(NameObject("/Resources"))
    if not res:
        return 0
    xobjects = res.get(NameObject("/XObject"))
    if not xobjects:
        return 0
    xobjects_dict = xobjects.get_object() if hasattr(xobjects, "get_object") else xobjects
    if not isinstance(xobjects_dict, dict):
        return 0

    img_positions = find_image_positions_in_page(page, page_width, page_height)
    images_redacted = 0

    extracted_images = {}
    try:
        for img_file in page.images:
            base_name = img_file.name.split(".")[0]
            extracted_images[base_name] = img_file.image
            extracted_images[f"/{base_name}"] = img_file.image
    except Exception:
        pass

    for name_obj, obj_ref in list(xobjects_dict.items()):
        img_obj = obj_ref.get_object() if hasattr(obj_ref, "get_object") else obj_ref
        if not isinstance(img_obj, dict) or img_obj.get(NameObject("/Subtype")) != NameObject("/Image"):
            continue

        name_str = str(name_obj)
        box = img_positions.get(name_str) or img_positions.get(name_str.lstrip("/"))
        if not box:
            box = (0.0, 0.0, page_width, page_height)

        img_x0, img_y0, img_x1, img_y1 = box
        img_w_pt = max(1.0, img_x1 - img_x0)
        img_h_pt = max(1.0, img_y1 - img_y0)

        # Calculate all intersecting redaction bounds
        intersecting_rects = []
        for r in rects:
            rx0, rx1 = float(r.x), float(r.x) + float(r.width)
            ry0, ry1 = float(r.y), float(r.y) + float(r.height)
            ix0 = max(img_x0, rx0)
            iy0 = max(img_y0, ry0)
            ix1 = min(img_x1, rx1)
            iy1 = min(img_y1, ry1)
            if ix1 > ix0 and iy1 > iy0:
                intersecting_rects.append((ix0, iy0, ix1, iy1))

        if not intersecting_rects:
            continue

        pil_img = extracted_images.get(name_str) or extracted_images.get(name_str.lstrip("/"))
        if not pil_img:
            try:
                raw_data = img_obj.get_data()
                pil_img = Image.open(io.BytesIO(raw_data))
            except Exception:
                continue

        pil_img = pil_img.copy()
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")

        W, H = pil_img.size
        draw = ImageDraw.Draw(pil_img)
        total_inter_area = 0.0

        for ix0, iy0, ix1, iy1 in intersecting_rects:
            area = (ix1 - ix0) * (iy1 - iy0)
            total_inter_area += area
            px0 = int(round(((ix0 - img_x0) / img_w_pt) * W))
            px1 = int(round(((ix1 - img_x0) / img_w_pt) * W))
            py0 = int(round(((img_y1 - iy1) / img_h_pt) * H))
            py1 = int(round(((img_y1 - iy0) / img_h_pt) * H))
            px0, px1 = max(0, min(px0, W)), max(0, min(px1, W))
            py0, py1 = max(0, min(py0, H)), max(0, min(py1, H))
            draw.rectangle([px0, py0, px1, py1], fill=(0, 0, 0))

        if total_inter_area >= 0.85 * (img_w_pt * img_h_pt):
            draw.rectangle([0, 0, W, H], fill=(0, 0, 0))

        # Re-encode modified image to JPEG stream
        buf = io.BytesIO()
        pil_img.save(buf, format="JPEG", quality=90)
        new_bytes = buf.getvalue()

        # Update XObject dictionary and byte payload permanently
        img_obj._data = new_bytes
        img_obj[NameObject("/Filter")] = NameObject("/DCTDecode")
        img_obj[NameObject("/ColorSpace")] = NameObject("/DeviceRGB")
        img_obj[NameObject("/BitsPerComponent")] = NumberObject(8)
        img_obj[NameObject("/Width")] = NumberObject(W)
        img_obj[NameObject("/Height")] = NumberObject(H)
        img_obj[NameObject("/Length")] = NumberObject(len(new_bytes))
        if NameObject("/DecodeParms") in img_obj:
            del img_obj[NameObject("/DecodeParms")]

        images_redacted += 1

    return images_redacted

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

    # 4. Permanently sanitize intersecting raster image pixels in XObjects
    if redaction_item.rects:
        redact_raster_images_on_page(page, redaction_item.rects, page_width, page_height)

    # 5. Generate opaque redaction block operations
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
