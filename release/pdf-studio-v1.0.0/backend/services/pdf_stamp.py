import io
import math
import os
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from PIL import Image
from pypdf import PdfReader, PdfWriter, Transformation
from pypdf.generic import (
    DecodedStreamObject,
    NameObject,
    DictionaryObject,
    ArrayObject,
    FloatObject,
)

from schemas.document import DocumentInfoResponse
from schemas.stamp import (
    WatermarkRequest,
    PageNumbersRequest,
    HeaderFooterRequest,
    DateStampRequest,
)
from services.pdf_document import PDFDocumentService
from services.pdf_edit import (
    resolve_font_name,
    ensure_font_in_page,
    ensure_extgstate_opacity,
    append_ops_to_page,
    decode_base64_image,
)
from services.pdf_redact import hex_to_rgb, escape_pdf_string
from utils.storage import get_file_path, save_uploaded_file

def int_to_roman(num: int, lower: bool = False) -> str:
    """Convert positive integer to Roman numerals."""
    if num <= 0:
        return str(num)
    val = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
    syb = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
    res = ''
    i = 0
    while num > 0:
        for _ in range(num // val[i]):
            res += syb[i]
            num -= val[i]
        i += 1
    return res.lower() if lower else res

def parse_target_pages(
    total_pages: int,
    selection: Optional[List[int]] = None,
    page_range: Optional[str] = None,
    exclude: Optional[List[int]] = None,
) -> List[int]:
    """Resolve target 1-indexed pages from selection, ranges, and exclusions."""
    if page_range:
        pages = set()
        for part in page_range.split(','):
            part = part.strip()
            if not part:
                continue
            if '-' in part:
                try:
                    s, e = part.split('-', 1)
                    start = max(1, int(s.strip()))
                    end = min(total_pages, int(e.strip()))
                    pages.update(range(start, end + 1))
                except ValueError:
                    pass
            else:
                try:
                    p = int(part)
                    if 1 <= p <= total_pages:
                        pages.add(p)
                except ValueError:
                    pass
        target_set = pages
    elif selection is not None and len(selection) > 0:
        target_set = {p for p in selection if 1 <= p <= total_pages}
    else:
        target_set = set(range(1, total_pages + 1))

    if exclude:
        target_set = target_set - set(exclude)

    return sorted(target_set)

def prepend_ops_to_page(page: Any, ops: List[str]):
    """Prepend operations before existing page content stream (for background underlay)."""
    ops_str = "\n".join(ops) + "\n"
    new_stream = DecodedStreamObject()
    new_stream.set_data(ops_str.encode('latin1'))

    existing_contents = page.get_contents()
    if existing_contents is None:
        page[NameObject('/Contents')] = new_stream
    elif isinstance(existing_contents, ArrayObject):
        existing_contents.insert(0, new_stream)
    else:
        page[NameObject('/Contents')] = ArrayObject([new_stream, existing_contents])

def format_custom_date(dt: datetime, fmt: str) -> str:
    """Format datetime object into requested format."""
    f = fmt.strip().upper()
    if f in ('DD/MM/YYYY', 'DD-MM-YYYY'):
        return dt.strftime('%d/%m/%Y')
    elif f in ('MM/DD/YYYY', 'MM-DD-YYYY'):
        return dt.strftime('%m/%d/%Y')
    elif f in ('YYYY-MM-DD', 'YYYY/MM/DD'):
        return dt.strftime('%Y-%m-%d')
    elif 'MMMM' in f or 'MONTH' in f or 'NOVEMBER' in f:
        return dt.strftime('%d %B %Y')
    else:
        try:
            return dt.strftime(fmt)
        except Exception:
            return dt.strftime('%d/%m/%Y')

class PDFStampService:
    @staticmethod
    def apply_watermark(req: WatermarkRequest) -> DocumentInfoResponse:
        file_path = get_file_path(req.file_id)
        if not file_path or not file_path.exists():
            raise FileNotFoundError(f"Document with ID {req.file_id} not found.")

        reader = PdfReader(str(file_path))
        writer = PdfWriter()
        writer.append(reader)
        total_pages = len(writer.pages)

        target_pages = parse_target_pages(
            total_pages,
            selection=req.page_selection,
            page_range=req.page_range,
            exclude=req.exclude_pages,
        )

        for p_num in target_pages:
            page = writer.pages[p_num - 1]
            pw = float(page.mediabox.width)
            ph = float(page.mediabox.height)

            if req.watermark_type == 'image' and req.image_base64:
                try:
                    pil_img = decode_base64_image(req.image_base64)
                    img_buf = io.BytesIO()
                    pil_img.save(img_buf, format='PDF')
                    img_buf.seek(0)
                    img_page = PdfReader(img_buf).pages[0]

                    iw = float(img_page.mediabox.width)
                    ih = float(img_page.mediabox.height)
                    scale = req.image_scale or 1.0

                    target_w = iw * scale
                    target_h = ih * scale
                    tx = (pw - target_w) / 2.0
                    ty = (ph - target_h) / 2.0

                    t = Transformation().scale(scale, scale).translate(tx, ty)
                    if req.rotation != 0:
                        t = t.rotate(req.rotation)

                    # Merge onto target page
                    page.merge_transformed_page(img_page, t)
                except Exception as e:
                    print(f"Error embedding image watermark: {e}")

            else:
                # Text Watermark
                text = req.text or "CONFIDENTIAL"
                base_font = resolve_font_name(req.font_family, bold=True, italic=False)
                ensure_font_in_page(page, 'F_WM', base_font)

                gs_id = f"WM_GS_{int((req.opacity or 0.2) * 100)}"
                ensure_extgstate_opacity(page, gs_id, req.opacity or 0.2)

                r, g, b = hex_to_rgb(req.color or "#D92828")
                rad = math.radians(req.rotation)
                cos_t = math.cos(rad)
                sin_t = math.sin(rad)

                # Center anchor offset approximation
                text_len = len(text)
                approx_width = text_len * req.font_size * 0.55
                x_offset = -approx_width / 2.0
                y_offset = -req.font_size / 3.0

                positions = []
                if req.repeat:
                    # Tile across the page
                    step_x = max(180.0, approx_width + 60.0)
                    step_y = max(140.0, req.font_size * 4)
                    for gx in range(int(step_x / 2), int(pw), int(step_x)):
                        for gy in range(int(step_y / 2), int(ph), int(step_y)):
                            positions.append((float(gx), float(gy)))
                else:
                    if req.position == 'top':
                        positions.append((pw / 2.0, ph * 0.8))
                    elif req.position == 'bottom':
                        positions.append((pw / 2.0, ph * 0.2))
                    else:
                        positions.append((pw / 2.0, ph / 2.0))

                clean_text = escape_pdf_string(text)
                ops = [
                    'q',
                    f'/{gs_id} gs',
                    f'{r:.3f} {g:.3f} {b:.3f} rg',
                ]

                for cx, cy in positions:
                    ops.extend([
                        'BT',
                        f'{cos_t:.4f} {sin_t:.4f} {-sin_t:.4f} {cos_t:.4f} {cx:.2f} {cy:.2f} Tm',
                        f'/F_WM {req.font_size:.1f} Tf',
                        f'{x_offset:.2f} {y_offset:.2f} Td',
                        f'({clean_text}) Tj',
                        'ET',
                    ])

                ops.append('Q')

                if req.placement == 'background':
                    prepend_ops_to_page(page, ops)
                else:
                    append_ops_to_page(page, ops)

        buf = io.BytesIO()
        writer.write(buf)
        new_file_id, new_path = save_uploaded_file(buf.getvalue(), file_path.name)
        return PDFDocumentService.inspect_document(new_file_id)

    @staticmethod
    def apply_page_numbers(req: PageNumbersRequest) -> DocumentInfoResponse:
        file_path = get_file_path(req.file_id)
        if not file_path or not file_path.exists():
            raise FileNotFoundError(f"Document with ID {req.file_id} not found.")

        reader = PdfReader(str(file_path))
        writer = PdfWriter()
        writer.append(reader)
        total_pages = len(writer.pages)

        target_pages = parse_target_pages(
            total_pages,
            selection=req.page_selection,
            exclude=req.exclude_pages,
        )

        base_font = resolve_font_name(req.font_family, req.bold, req.italic)
        r, g, b = hex_to_rgb(req.color or "#17243B")

        for p_num in target_pages:
            if req.skip_cover and p_num == 1:
                continue

            page = writer.pages[p_num - 1]
            pw = float(page.mediabox.width)
            ph = float(page.mediabox.height)

            ensure_font_in_page(page, 'F_PN', base_font)

            # Calculate displayed number
            page_offset = p_num - req.start_page
            display_num = req.start_number + max(0, page_offset)

            if req.format == 'padded':
                num_str = f"{display_num:02d}"
            elif req.format == 'roman_lower':
                num_str = int_to_roman(display_num, lower=True)
            elif req.format == 'roman_upper':
                num_str = int_to_roman(display_num, lower=False)
            else:
                num_str = str(display_num)

            if req.include_total:
                label = f"{req.prefix}{num_str}{req.separator}{total_pages}{req.suffix}"
            else:
                label = f"{req.prefix}{num_str}{req.suffix}"

            # Calculate coordinates
            approx_width = len(label) * req.font_size * 0.55
            hm = req.margin_x or 36.0
            vm = req.margin_y or 36.0

            pos = req.position
            if pos == 'top-left':
                x = hm
                y = ph - vm - req.font_size
            elif pos == 'top-center':
                x = (pw - approx_width) / 2.0
                y = ph - vm - req.font_size
            elif pos == 'top-right':
                x = pw - hm - approx_width
                y = ph - vm - req.font_size
            elif pos == 'bottom-left':
                x = hm
                y = vm
            elif pos == 'bottom-right':
                x = pw - hm - approx_width
                y = vm
            else:  # bottom-center
                x = (pw - approx_width) / 2.0
                y = vm

            clean_label = escape_pdf_string(label)
            ops = [
                'q',
                'BT',
                f'/F_PN {req.font_size:.1f} Tf',
                f'{r:.3f} {g:.3f} {b:.3f} rg',
                f'{x:.2f} {y:.2f} Td',
                f'({clean_label}) Tj',
                'ET',
                'Q',
            ]
            append_ops_to_page(page, ops)

        buf = io.BytesIO()
        writer.write(buf)
        new_file_id, new_path = save_uploaded_file(buf.getvalue(), file_path.name)
        return PDFDocumentService.inspect_document(new_file_id)

    @staticmethod
    def apply_header_footer(req: HeaderFooterRequest) -> DocumentInfoResponse:
        file_path = get_file_path(req.file_id)
        if not file_path or not file_path.exists():
            raise FileNotFoundError(f"Document with ID {req.file_id} not found.")

        reader = PdfReader(str(file_path))
        writer = PdfWriter()
        writer.append(reader)
        total_pages = len(writer.pages)

        target_pages = parse_target_pages(
            total_pages,
            selection=req.page_selection,
            page_range=req.page_range,
        )

        base_font = resolve_font_name(req.font_family, req.bold, req.italic)
        r, g, b = hex_to_rgb(req.color or "#555555")
        lr, lg, lb = hex_to_rgb(req.line_color or "#DCE3EF")

        now = datetime.now()
        date_str = now.strftime('%d/%m/%Y')
        time_str = now.strftime('%H:%M')
        doc_title = file_path.name.replace('.pdf', '')

        for p_num in target_pages:
            if req.skip_cover and p_num == 1:
                continue

            page = writer.pages[p_num - 1]
            pw = float(page.mediabox.width)
            ph = float(page.mediabox.height)

            ensure_font_in_page(page, 'F_HF', base_font)

            def resolve_placeholders(tmpl: Optional[str]) -> Optional[str]:
                if not tmpl:
                    return None
                return (
                    tmpl.replace('{title}', doc_title)
                    .replace('{page}', str(p_num))
                    .replace('{total}', str(total_pages))
                    .replace('{date}', date_str)
                    .replace('{time}', time_str)
                )

            hl = resolve_placeholders(req.header_left)
            hc = resolve_placeholders(req.header_center)
            hr = resolve_placeholders(req.header_right)
            fl = resolve_placeholders(req.footer_left)
            fc = resolve_placeholders(req.footer_center)
            fr = resolve_placeholders(req.footer_right)

            hm = req.margin_x or 36.0
            vm = req.margin_y or 30.0

            ops = ['q']

            # Header rendering
            if hl or hc or hr:
                hy = ph - vm - req.font_size
                ops.extend([
                    'BT',
                    f'/F_HF {req.font_size:.1f} Tf',
                    f'{r:.3f} {g:.3f} {b:.3f} rg',
                ])
                if hl:
                    ops.extend([f'{hm:.2f} {hy:.2f} Td', f'({escape_pdf_string(hl)}) Tj', f'{-hm:.2f} {-hy:.2f} Td'])
                if hc:
                    cx = (pw - len(hc) * req.font_size * 0.55) / 2.0
                    ops.extend([f'{cx:.2f} {hy:.2f} Td', f'({escape_pdf_string(hc)}) Tj', f'{-cx:.2f} {-hy:.2f} Td'])
                if hr:
                    rx = pw - hm - (len(hr) * req.font_size * 0.55)
                    ops.extend([f'{rx:.2f} {hy:.2f} Td', f'({escape_pdf_string(hr)}) Tj', f'{-rx:.2f} {-hy:.2f} Td'])
                ops.append('ET')

                # Divider line under header
                if req.divider_line:
                    line_y = hy - 4.0
                    ops.extend([
                        f'{req.line_thickness:.1f} w',
                        f'{lr:.3f} {lg:.3f} {lb:.3f} RG',
                        f'{hm:.2f} {line_y:.2f} m',
                        f'{pw - hm:.2f} {line_y:.2f} l',
                        'S',
                    ])

            # Footer rendering
            if fl or fc or fr:
                fy = vm
                ops.extend([
                    'BT',
                    f'/F_HF {req.font_size:.1f} Tf',
                    f'{r:.3f} {g:.3f} {b:.3f} rg',
                ])
                if fl:
                    ops.extend([f'{hm:.2f} {fy:.2f} Td', f'({escape_pdf_string(fl)}) Tj', f'{-hm:.2f} {-fy:.2f} Td'])
                if fc:
                    cx = (pw - len(fc) * req.font_size * 0.55) / 2.0
                    ops.extend([f'{cx:.2f} {fy:.2f} Td', f'({escape_pdf_string(fc)}) Tj', f'{-cx:.2f} {-fy:.2f} Td'])
                if fr:
                    rx = pw - hm - (len(fr) * req.font_size * 0.55)
                    ops.extend([f'{rx:.2f} {fy:.2f} Td', f'({escape_pdf_string(fr)}) Tj', f'{-rx:.2f} {-fy:.2f} Td'])
                ops.append('ET')

                # Divider line above footer
                if req.divider_line:
                    line_y = fy + req.font_size + 4.0
                    ops.extend([
                        f'{req.line_thickness:.1f} w',
                        f'{lr:.3f} {lg:.3f} {lb:.3f} RG',
                        f'{hm:.2f} {line_y:.2f} m',
                        f'{pw - hm:.2f} {line_y:.2f} l',
                        'S',
                    ])

            ops.append('Q')
            append_ops_to_page(page, ops)

        buf = io.BytesIO()
        writer.write(buf)
        new_file_id, new_path = save_uploaded_file(buf.getvalue(), file_path.name)
        return PDFDocumentService.inspect_document(new_file_id)

    @staticmethod
    def apply_date_stamp(req: DateStampRequest) -> DocumentInfoResponse:
        file_path = get_file_path(req.file_id)
        if not file_path or not file_path.exists():
            raise FileNotFoundError(f"Document with ID {req.file_id} not found.")

        reader = PdfReader(str(file_path))
        writer = PdfWriter()
        writer.append(reader)
        total_pages = len(writer.pages)

        target_pages = parse_target_pages(
            total_pages,
            selection=req.page_selection,
            page_range=req.page_range,
        )

        base_font = resolve_font_name(req.font_family, bold=True, italic=False)
        r, g, b = hex_to_rgb(req.color or "#17243B")

        # Local date formatting
        if req.date_text and req.date_text.strip():
            date_label = req.date_text.strip()
        else:
            date_label = format_custom_date(datetime.now(), req.format or "DD/MM/YYYY")

        for p_num in target_pages:
            page = writer.pages[p_num - 1]
            pw = float(page.mediabox.width)
            ph = float(page.mediabox.height)

            ensure_font_in_page(page, 'F_Date', base_font)

            gs_id = f"DT_GS_{int((req.opacity or 1.0) * 100)}"
            if req.opacity < 1.0:
                ensure_extgstate_opacity(page, gs_id, req.opacity)

            hm = req.margin_x or 36.0
            vm = req.margin_y or 36.0
            approx_w = len(date_label) * req.font_size * 0.55

            pos = req.position
            if pos == 'top-left':
                cx = hm + approx_w / 2.0
                cy = ph - vm - req.font_size / 2.0
            elif pos == 'top-right':
                cx = pw - hm - approx_w / 2.0
                cy = ph - vm - req.font_size / 2.0
            elif pos == 'bottom-left':
                cx = hm + approx_w / 2.0
                cy = vm + req.font_size / 2.0
            elif pos == 'bottom-right':
                cx = pw - hm - approx_w / 2.0
                cy = vm + req.font_size / 2.0
            else:  # center
                cx = pw / 2.0
                cy = ph / 2.0

            rad = math.radians(req.rotation)
            cos_t = math.cos(rad)
            sin_t = math.sin(rad)
            x_offset = -approx_w / 2.0
            y_offset = -req.font_size / 3.0

            ops = ['q']
            if req.opacity < 1.0:
                ops.append(f'/{gs_id} gs')
            ops.extend([
                f'{r:.3f} {g:.3f} {b:.3f} rg',
                'BT',
                f'{cos_t:.4f} {sin_t:.4f} {-sin_t:.4f} {cos_t:.4f} {cx:.2f} {cy:.2f} Tm',
                f'/F_Date {req.font_size:.1f} Tf',
                f'{x_offset:.2f} {y_offset:.2f} Td',
                f'({escape_pdf_string(date_label)}) Tj',
                'ET',
                'Q',
            ])

            if req.placement == 'background':
                prepend_ops_to_page(page, ops)
            else:
                append_ops_to_page(page, ops)

        buf = io.BytesIO()
        writer.write(buf)
        new_file_id, new_path = save_uploaded_file(buf.getvalue(), file_path.name)
        return PDFDocumentService.inspect_document(new_file_id)
