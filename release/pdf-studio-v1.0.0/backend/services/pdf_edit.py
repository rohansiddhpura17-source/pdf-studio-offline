import io
import math
import base64
import os
from typing import List, Optional, Tuple, Dict, Any
from PIL import Image
from pypdf import PdfReader, PdfWriter, Transformation
from pypdf.generic import (
    DecodedStreamObject,
    NameObject,
    DictionaryObject,
    ArrayObject,
    TextStringObject,
    NumberObject,
    FloatObject,
    create_string_object
)

from schemas.document import DocumentInfo
from schemas.edit import (
    TextAnnotationItem,
    ImageAnnotationItem,
    HighlightAnnotationItem,
    DrawAnnotationItem,
    ShapeAnnotationItem,
    WhiteoutAnnotationItem,
    RedactAnnotationItem,
    SignatureAnnotationItem,
    FormFieldInfo,
    GetFormFieldsResponse,
    BatchApplyEditsRequest,
    Rect,
    Point
)
try:
    from services.pdf_document import PDFDocumentService
    from services.pdf_redact import apply_redaction_to_page, hex_to_rgb, escape_pdf_string
    from utils.storage import get_file_path, save_uploaded_file
except ImportError:
    from .services.pdf_document import PDFDocumentService
    from .services.pdf_redact import apply_redaction_to_page, hex_to_rgb, escape_pdf_string
    from .utils.storage import get_file_path, save_uploaded_file

FONT_NAME_MAP = {
    'helvetica': {
        'normal': 'Helvetica',
        'bold': 'Helvetica-Bold',
        'italic': 'Helvetica-Oblique',
        'bold_italic': 'Helvetica-BoldOblique',
    },
    'times': {
        'normal': 'Times-Roman',
        'bold': 'Times-Bold',
        'italic': 'Times-Italic',
        'bold_italic': 'Times-BoldItalic',
    },
    'times-roman': {
        'normal': 'Times-Roman',
        'bold': 'Times-Bold',
        'italic': 'Times-Italic',
        'bold_italic': 'Times-BoldItalic',
    },
    'courier': {
        'normal': 'Courier',
        'bold': 'Courier-Bold',
        'italic': 'Courier-Oblique',
        'bold_italic': 'Courier-BoldOblique',
    }
}

def resolve_font_name(family: str, bold: bool, italic: bool) -> str:
    fam = family.lower().strip()
    if 'times' in fam:
        style_map = FONT_NAME_MAP['times']
    elif 'courier' in fam:
        style_map = FONT_NAME_MAP['courier']
    else:
        style_map = FONT_NAME_MAP['helvetica']

    if bold and italic:
        return style_map['bold_italic']
    if bold:
        return style_map['bold']
    if italic:
        return style_map['italic']
    return style_map['normal']

def ensure_font_in_page(page: Any, font_id: str, base_font: str):
    """Ensure standard font is declared in page's /Resources /Font dictionary."""
    resources = page.get(NameObject('/Resources'))
    if resources is None:
        resources = DictionaryObject()
        page[NameObject('/Resources')] = resources

    fonts = resources.get(NameObject('/Font'))
    if fonts is None:
        fonts = DictionaryObject()
        resources[NameObject('/Font')] = fonts

    font_key = NameObject(f'/{font_id}')
    if font_key not in fonts:
        fonts[font_key] = DictionaryObject({
            NameObject('/Type'): NameObject('/Font'),
            NameObject('/Subtype'): NameObject('/Type1'),
            NameObject('/BaseFont'): NameObject(f'/{base_font}'),
        })

def ensure_extgstate_opacity(page: Any, gs_id: str, opacity: float):
    """Ensure transparency ExtGState is declared in page's /Resources /ExtGState."""
    resources = page.get(NameObject('/Resources'))
    if resources is None:
        resources = DictionaryObject()
        page[NameObject('/Resources')] = resources

    ext_gstate = resources.get(NameObject('/ExtGState'))
    if ext_gstate is None:
        ext_gstate = DictionaryObject()
        resources[NameObject('/ExtGState')] = ext_gstate

    gs_key = NameObject(f'/{gs_id}')
    if gs_key not in ext_gstate:
        ext_gstate[gs_key] = DictionaryObject({
            NameObject('/Type'): NameObject('/ExtGState'),
            NameObject('/ca'): FloatObject(round(opacity, 2)),
            NameObject('/CA'): FloatObject(round(opacity, 2)),
        })

def append_ops_to_page(page: Any, ops: List[str]):
    """Append PDF operators cleanly to page content stream."""
    ops_str = "\n".join(ops) + "\n"
    ops_bytes = ops_str.encode('latin1')

    existing_contents = page.get_contents()
    if existing_contents is None:
        new_stream = DecodedStreamObject()
        new_stream.set_data(ops_bytes)
        page[NameObject('/Contents')] = new_stream
    elif isinstance(existing_contents, ArrayObject):
        new_stream = DecodedStreamObject()
        new_stream.set_data(ops_bytes)
        existing_contents.append(new_stream)
    else:
        existing_bytes = existing_contents.get_data()
        new_stream = DecodedStreamObject()
        new_stream.set_data(existing_bytes + b"\n" + ops_bytes)
        page[NameObject('/Contents')] = new_stream

def decode_base64_image(image_base64: str) -> Image.Image:
    """Decode base64 image (handles data:image/*;base64, prefixes)."""
    if ',' in image_base64:
        image_base64 = image_base64.split(',', 1)[1]
    raw_data = base64.b64decode(image_base64)
    img = Image.open(io.BytesIO(raw_data))
    return img

class PDFEditService:
    @staticmethod
    def get_form_fields(file_id: str) -> GetFormFieldsResponse:
        """Inspect and return interactive AcroForm fields from PDF."""
        file_path = get_file_path(file_id)
        if not file_path or not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_id}")

        reader = PdfReader(str(file_path))
        fields: List[FormFieldInfo] = []

        try:
            raw_fields = reader.get_fields()
        except Exception:
            raw_fields = None

        if raw_fields:
            for field_name, field_dict in raw_fields.items():
                ft = str(field_dict.get('/FT', 'unknown'))
                field_type = 'unknown'
                if '/Tx' in ft:
                    field_type = 'text'
                elif '/Btn' in ft:
                    field_type = 'checkbox'
                elif '/Ch' in ft:
                    field_type = 'choice'

                current_val = field_dict.get('/V', '')
                if hasattr(current_val, 'get_object'):
                    current_val = str(current_val.get_object())
                elif current_val is not None:
                    current_val = str(current_val)

                fields.append(FormFieldInfo(
                    name=field_name,
                    field_type=field_type,
                    value=current_val,
                ))

        # Also inspect page-level widget annotations for coordinates
        for idx, page in enumerate(reader.pages):
            annots = page.get(NameObject('/Annots'))
            if not annots:
                continue
            for annot_ref in annots:
                try:
                    annot = annot_ref.get_object() if hasattr(annot_ref, 'get_object') else annot_ref
                    if not isinstance(annot, dict):
                        continue
                    if annot.get(NameObject('/Subtype')) == NameObject('/Widget'):
                        t_name = annot.get(NameObject('/T'))
                        if t_name:
                            name_str = str(t_name)
                            rect = annot.get(NameObject('/Rect'))
                            coords = [float(c) for c in rect] if rect else None
                            # Match or update field info
                            existing = next((f for f in fields if f.name == name_str), None)
                            if existing:
                                existing.rect = coords
                                existing.page_number = idx + 1
                            else:
                                fields.append(FormFieldInfo(
                                    name=name_str,
                                    field_type='text',
                                    value=str(annot.get(NameObject('/V', ''))),
                                    rect=coords,
                                    page_number=idx + 1
                                ))
                except Exception:
                    continue

        return GetFormFieldsResponse(
            has_form_fields=len(fields) > 0,
            fields=fields
        )

    @staticmethod
    def apply_batch_edits(file_id: str, edits: BatchApplyEditsRequest) -> DocumentInfo:
        """
        Apply any combination of edit tools to the document and commit changes.
        """
        source_path = get_file_path(file_id)
        if not source_path or not source_path.exists():
            raise FileNotFoundError(f"File not found: {file_id}")

        reader = PdfReader(str(source_path))
        writer = PdfWriter()
        writer.append(reader)

        total_pages = len(writer.pages)

        # 1. First, handle form filling if present
        if edits.form_fills:
            for page in writer.pages:
                try:
                    writer.update_page_form_field_values(page, edits.form_fills)
                except Exception:
                    pass

        # 2. Secure Redactions (Must happen early to sanitize content streams permanently)
        if edits.redactions:
            for redact in edits.redactions:
                if 1 <= redact.page_number <= total_pages:
                    target_page = writer.pages[redact.page_number - 1]
                    pw = float(target_page.mediabox.width)
                    ph = float(target_page.mediabox.height)
                    apply_redaction_to_page(target_page, redact, pw, ph)

        # 3. Whiteout (Cosmetic opaque rectangles)
        if edits.whiteouts:
            for whiteout in edits.whiteouts:
                if 1 <= whiteout.page_number <= total_pages:
                    target_page = writer.pages[whiteout.page_number - 1]
                    ops = ['q', '1.0 1.0 1.0 rg']
                    for r in whiteout.rects:
                        ops.append(f"{r.x:.2f} {r.y:.2f} {r.width:.2f} {r.height:.2f} re")
                        ops.append("f")
                    ops.append('Q')
                    append_ops_to_page(target_page, ops)

        # 4. Highlights (Semi-transparent color overlay)
        if edits.highlights:
            for hl in edits.highlights:
                if 1 <= hl.page_number <= total_pages:
                    target_page = writer.pages[hl.page_number - 1]
                    gs_id = f"HL_GS_{int((hl.opacity or 0.4) * 100)}"
                    ensure_extgstate_opacity(target_page, gs_id, hl.opacity or 0.4)
                    
                    r, g, b = hex_to_rgb(hl.color or "#FFE500")
                    ops = [
                        'q',
                        f'/{gs_id} gs',
                        f'{r:.3f} {g:.3f} {b:.3f} rg'
                    ]
                    for rect in hl.rects:
                        ops.append(f"{rect.x:.2f} {rect.y:.2f} {rect.width:.2f} {rect.height:.2f} re")
                        ops.append("f")
                    ops.append('Q')
                    append_ops_to_page(target_page, ops)

        # 5. Freehand Drawings
        if edits.drawings:
            for draw in edits.drawings:
                if 1 <= draw.page_number <= total_pages:
                    target_page = writer.pages[draw.page_number - 1]
                    for path in draw.paths:
                        if len(path.points) < 2:
                            continue
                        
                        r, g, b = hex_to_rgb(path.color)
                        gs_id = f"DRAW_GS_{int((path.opacity or 1.0) * 100)}"
                        if path.opacity < 1.0:
                            ensure_extgstate_opacity(target_page, gs_id, path.opacity)

                        ops = ['q']
                        if path.opacity < 1.0:
                            ops.append(f'/{gs_id} gs')
                        ops.append(f"{path.width:.1f} w")
                        ops.append("1 J")  # Round cap
                        ops.append("1 j")  # Round join
                        ops.append(f"{r:.3f} {g:.3f} {b:.3f} RG")
                        
                        first_pt = path.points[0]
                        ops.append(f"{first_pt.x:.2f} {first_pt.y:.2f} m")
                        for pt in path.points[1:]:
                            ops.append(f"{pt.x:.2f} {pt.y:.2f} l")
                        ops.append("S")
                        ops.append("Q")
                        append_ops_to_page(target_page, ops)

        # 6. Geometric Shapes (rect, rounded_rect, circle, ellipse, line, arrow)
        if edits.shapes:
            for shape in edits.shapes:
                if 1 <= shape.page_number <= total_pages:
                    target_page = writer.pages[shape.page_number - 1]
                    sr, sg, sb = hex_to_rgb(shape.stroke_color)
                    has_fill = bool(shape.fill_color)
                    fr, fg, fb = hex_to_rgb(shape.fill_color or "#000000")

                    gs_id = f"SHP_GS_{int((shape.opacity or 1.0) * 100)}"
                    if shape.opacity < 1.0:
                        ensure_extgstate_opacity(target_page, gs_id, shape.opacity)

                    ops = ['q']
                    if shape.opacity < 1.0:
                        ops.append(f'/{gs_id} gs')
                    ops.append(f"{shape.stroke_width:.1f} w")
                    ops.append(f"{sr:.3f} {sg:.3f} {sb:.3f} RG")
                    if has_fill:
                        ops.append(f"{fr:.3f} {fg:.3f} {fb:.3f} rg")

                    st = shape.shape_type
                    x, y, w, h = shape.x, shape.y, shape.width, shape.height

                    if st == 'rect':
                        ops.append(f"{x:.2f} {y:.2f} {w:.2f} {h:.2f} re")
                        ops.append("b" if has_fill else "S")
                    elif st == 'rounded_rect':
                        rad = min(shape.radius or 8.0, abs(w) / 2, abs(h) / 2)
                        k = 0.5522847498 * rad
                        x1, y1 = x, y
                        x2, y2 = x + w, y + h
                        ops.append(f"{x1 + rad:.2f} {y1:.2f} m")
                        ops.append(f"{x2 - rad:.2f} {y1:.2f} l")
                        ops.append(f"{x2 - rad + k:.2f} {y1:.2f} {x2:.2f} {y1 + rad - k:.2f} {x2:.2f} {y1 + rad:.2f} c")
                        ops.append(f"{x2:.2f} {y2 - rad:.2f} l")
                        ops.append(f"{x2:.2f} {y2 - rad + k:.2f} {x2 - rad + k:.2f} {y2:.2f} {x2 - rad:.2f} {y2:.2f} c")
                        ops.append(f"{x1 + rad:.2f} {y2:.2f} l")
                        ops.append(f"{x1 + rad - k:.2f} {y2:.2f} {x1:.2f} {y2 - rad + k:.2f} {x1:.2f} {y2 - rad:.2f} c")
                        ops.append(f"{x1:.2f} {y1 + rad:.2f} l")
                        ops.append(f"{x1:.2f} {y1 + rad - k:.2f} {x1 + rad - k:.2f} {y1:.2f} {x1 + rad:.2f} {y1:.2f} c")
                        ops.append("h")
                        ops.append("b" if has_fill else "S")
                    elif st in ('circle', 'ellipse'):
                        cx = x + w / 2.0
                        cy = y + h / 2.0
                        rx = abs(w) / 2.0
                        ry = abs(h) / 2.0
                        k = 0.5522847498
                        ops.append(f"{cx + rx:.2f} {cy:.2f} m")
                        ops.append(f"{cx + rx:.2f} {cy + k*ry:.2f} {cx + k*rx:.2f} {cy + ry:.2f} {cx:.2f} {cy + ry:.2f} c")
                        ops.append(f"{cx - k*rx:.2f} {cy + ry:.2f} {cx - rx:.2f} {cy + k*ry:.2f} {cx - rx:.2f} {cy:.2f} c")
                        ops.append(f"{cx - rx:.2f} {cy - k*ry:.2f} {cx - k*rx:.2f} {cy - ry:.2f} {cx:.2f} {cy - ry:.2f} c")
                        ops.append(f"{cx + k*rx:.2f} {cy - ry:.2f} {cx + rx:.2f} {cy - k*ry:.2f} {cx + rx:.2f} {cy:.2f} c")
                        ops.append("h")
                        ops.append("b" if has_fill else "S")
                    elif st == 'line':
                        ops.append(f"{x:.2f} {y:.2f} m")
                        ops.append(f"{x + w:.2f} {y + h:.2f} l")
                        ops.append("S")
                    elif st == 'arrow':
                        x1, y1 = x, y
                        x2, y2 = x + w, y + h
                        ops.append(f"{x1:.2f} {y1:.2f} m")
                        ops.append(f"{x2:.2f} {y2:.2f} l")
                        ops.append("S")
                        # Arrowhead
                        theta = math.atan2(y2 - y1, x2 - x1)
                        arrow_len = min(16.0, max(8.0, shape.stroke_width * 4))
                        phi = math.pi / 6.0
                        lx = x2 - arrow_len * math.cos(theta - phi)
                        ly = y2 - arrow_len * math.sin(theta - phi)
                        rx_pt = x2 - arrow_len * math.cos(theta + phi)
                        ry_pt = y2 - arrow_len * math.sin(theta + phi)
                        ops.append(f"{sr:.3f} {sg:.3f} {sb:.3f} rg")
                        ops.append(f"{x2:.2f} {y2:.2f} m")
                        ops.append(f"{lx:.2f} {ly:.2f} l")
                        ops.append(f"{rx_pt:.2f} {ry_pt:.2f} l")
                        ops.append("h f")

                    ops.append("Q")
                    append_ops_to_page(target_page, ops)

        # 7. Text Elements (Helvetica, Times, Courier, custom sizes, bold, italic, color)
        if edits.texts:
            for txt in edits.texts:
                if 1 <= txt.page_number <= total_pages:
                    target_page = writer.pages[txt.page_number - 1]
                    base_font = resolve_font_name(txt.font_family, txt.bold, txt.italic)
                    font_alias = f"F_{base_font.replace('-', '_')}"
                    ensure_font_in_page(target_page, font_alias, base_font)

                    r, g, b = hex_to_rgb(txt.color)
                    gs_id = f"TXT_GS_{int((txt.opacity or 1.0) * 100)}"
                    if txt.opacity < 1.0:
                        ensure_extgstate_opacity(target_page, gs_id, txt.opacity)

                    lines = txt.text.split('\n')
                    line_height = txt.font_size * 1.25

                    ops = ['q']
                    if txt.opacity < 1.0:
                        ops.append(f'/{gs_id} gs')
                    ops.append('BT')
                    ops.append(f'/{font_alias} {txt.font_size:.1f} Tf')
                    ops.append(f'{r:.3f} {g:.3f} {b:.3f} rg')

                    curr_y = txt.y
                    for line in lines:
                        clean_line = escape_pdf_string(line)
                        ops.append(f"{txt.x:.2f} {curr_y:.2f} Td")
                        ops.append(f"({clean_line}) Tj")
                        # Reset for next line
                        ops.append(f"{-txt.x:.2f} {-curr_y:.2f} Td")
                        curr_y -= line_height

                    ops.append('ET')
                    ops.append('Q')
                    append_ops_to_page(target_page, ops)

        # 8. Images
        if edits.images:
            for img_item in edits.images:
                if 1 <= img_item.page_number <= total_pages:
                    target_page = writer.pages[img_item.page_number - 1]
                    try:
                        pil_img = decode_base64_image(img_item.image_base64)
                        img_buf = io.BytesIO()
                        # Save image to temporary single-page PDF
                        pil_img.save(img_buf, format='PDF')
                        img_buf.seek(0)
                        img_reader = PdfReader(img_buf)
                        img_page = img_reader.pages[0]

                        orig_w = float(img_page.mediabox.width)
                        orig_h = float(img_page.mediabox.height)
                        sx = img_item.width / orig_w
                        sy = img_item.height / orig_h

                        t = Transformation().scale(sx, sy).translate(img_item.x, img_item.y)
                        target_page.merge_transformed_page(img_page, t)
                    except Exception as e:
                        print(f"Error embedding image: {e}")

        # 9. Digital Signatures (Visual handwritten / typed / uploaded)
        if edits.signatures:
            for sig in edits.signatures:
                if 1 <= sig.page_number <= total_pages:
                    target_page = writer.pages[sig.page_number - 1]
                    try:
                        pil_sig = decode_base64_image(sig.signature_image_base64)
                        sig_buf = io.BytesIO()
                        pil_sig.save(sig_buf, format='PDF')
                        sig_buf.seek(0)
                        sig_reader = PdfReader(sig_buf)
                        sig_page = sig_reader.pages[0]

                        sw = float(sig_page.mediabox.width)
                        sh = float(sig_page.mediabox.height)
                        scale_x = sig.width / sw
                        scale_y = sig.height / sh

                        t = Transformation().scale(scale_x, scale_y).translate(sig.x, sig.y)
                        target_page.merge_transformed_page(sig_page, t)

                        # Optional signer name or timestamp text underneath
                        meta_text = []
                        if sig.signer_name:
                            meta_text.append(f"Signed by: {sig.signer_name}")
                        if sig.include_timestamp and sig.timestamp_text:
                            meta_text.append(f"Date: {sig.timestamp_text}")

                        if meta_text:
                            meta_ops = ['q', 'BT']
                            ensure_font_in_page(target_page, 'F_SigMeta', 'Helvetica')
                            meta_ops.append('/F_SigMeta 8.0 Tf')
                            meta_ops.append('0.3 0.3 0.3 rg')
                            sub_y = sig.y - 10.0
                            for m in meta_text:
                                clean_m = escape_pdf_string(m)
                                meta_ops.append(f"{sig.x:.2f} {sub_y:.2f} Td")
                                meta_ops.append(f"({clean_m}) Tj")
                                meta_ops.append(f"{-sig.x:.2f} {-sub_y:.2f} Td")
                                sub_y -= 9.0
                            meta_ops.extend(['ET', 'Q'])
                            append_ops_to_page(target_page, meta_ops)
                    except Exception as e:
                        print(f"Error placing signature: {e}")

        # Write output PDF to new file
        buf = io.BytesIO()
        writer.write(buf)
        new_file_id, new_path = save_uploaded_file(buf.getvalue(), source_path.name)
        return PDFDocumentService.inspect_document(new_file_id)
