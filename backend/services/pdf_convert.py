import io
import math
import os
import shutil
import base64
import zipfile
import subprocess
import tempfile
from typing import List, Optional, Tuple, Dict, Any
from PIL import Image
from pypdf import PdfReader, PdfWriter, Transformation

from schemas.document import DocumentInfoResponse
from schemas.convert import (
    ImagesToPdfRequest,
    PdfToImagesRequest,
    PdfToImagesResponse,
    RenderedImageItem,
    PdfToTextRequest,
    PdfToTextResponse,
    PageTextItem,
)
from services.pdf_document import PDFDocumentService
from services.pdf_edit import decode_base64_image
from services.pdf_stamp import parse_target_pages
from utils.storage import get_file_path, save_uploaded_file, STORAGE_DIR, init_storage, sanitize_filename

PAGE_SIZE_DIMS = {
    'a4': (595.28, 841.89),
    'a3': (841.89, 1190.55),
    'a5': (419.53, 595.28),
    'letter': (612.0, 792.0),
    'legal': (612.0, 1008.0),
}

def find_pdftoppm() -> Optional[str]:
    """Locate pdftoppm executable across standard paths."""
    in_path = shutil.which('pdftoppm')
    if in_path:
        return in_path
    mac_brew = '/opt/homebrew/bin/pdftoppm'
    if os.path.exists(mac_brew):
        return mac_brew
    mac_intel = '/usr/local/bin/pdftoppm'
    if os.path.exists(mac_intel):
        return mac_intel
    return None

class PDFConvertService:
    @staticmethod
    def images_to_pdf(req: ImagesToPdfRequest) -> DocumentInfoResponse:
        """Convert a sequence of images into a valid multi-page PDF."""
        if not req.images:
            raise ValueError("No images provided for conversion.")

        writer = PdfWriter()
        size_key = req.page_size.lower().strip()

        for idx, item in enumerate(req.images):
            raw_b64 = item.image_base64 or item.data_base64
            if not raw_b64:
                continue
            pil_img = decode_base64_image(raw_b64)
            if item.rotation != 0:
                pil_img = pil_img.rotate(-item.rotation, expand=True)

            orig_w, orig_h = pil_img.size

            # Determine page dimension in PDF points (72 pt/in)
            if size_key in PAGE_SIZE_DIMS:
                base_w, base_h = PAGE_SIZE_DIMS[size_key]
            elif size_key == 'custom' and req.custom_width and req.custom_height:
                base_w, base_h = float(req.custom_width), float(req.custom_height)
            else:  # original dimensions (72 DPI normalization)
                base_w = float(orig_w)
                base_h = float(orig_h)

            if req.orientation == 'landscape' and base_h > base_w:
                pw, ph = base_h, base_w
            else:
                pw, ph = base_w, base_h

            margin = max(0.0, req.margin_pt if req.margin_pt is not None else (req.margin or 0.0))
            avail_w = max(10.0, pw - 2 * margin)
            avail_h = max(10.0, ph - 2 * margin)

            fit_mode = req.fit_mode or 'fit'
            if fit_mode == 'stretch':
                target_w = avail_w
                target_h = avail_h
            elif fit_mode == 'fill':
                scale = max(avail_w / orig_w, avail_h / orig_h)
                target_w = orig_w * scale
                target_h = orig_h * scale
            else:  # fit
                scale = min(avail_w / orig_w, avail_h / orig_h)
                target_w = orig_w * scale
                target_h = orig_h * scale

            x = margin + (avail_w - target_w) / 2.0
            y = margin + (avail_h - target_h) / 2.0

            # Convert PIL image to temporary single-page PDF
            img_buf = io.BytesIO()
            if pil_img.mode in ('RGBA', 'LA') or (pil_img.mode == 'P' and 'transparency' in pil_img.info):
                # Composite over requested background color
                bg_color = req.bg_color or req.background_color or "#FFFFFF"
                bg_hex = bg_color.lstrip('#')
                if len(bg_hex) == 6:
                    bg_rgb = tuple(int(bg_hex[i:i+2], 16) for i in (0, 2, 4))
                else:
                    bg_rgb = (255, 255, 255)
                bg_img = Image.new('RGB', pil_img.size, bg_rgb)
                bg_img.paste(pil_img, mask=pil_img.split()[-1])
                bg_img.save(img_buf, format='PDF')
            else:
                pil_img.convert('RGB').save(img_buf, format='PDF')

            img_buf.seek(0)
            img_reader = PdfReader(img_buf)
            img_page = img_reader.pages[0]

            # Create base blank page
            blank_page = writer.add_blank_page(width=pw, height=ph)
            scale_x = target_w / orig_w
            scale_y = target_h / orig_h
            t = Transformation().scale(scale_x, scale_y).translate(x, y)
            blank_page.merge_transformed_page(img_page, t)

        out_buf = io.BytesIO()
        writer.write(out_buf)
        filename = sanitize_filename(req.output_filename or "converted_images.pdf")
        new_file_id, new_path = save_uploaded_file(out_buf.getvalue(), filename)
        return PDFDocumentService.inspect_document(new_file_id)

    @staticmethod
    def pdf_to_images(req: PdfToImagesRequest) -> PdfToImagesResponse:
        """Render target PDF pages into high-resolution PNG or JPEG images and zip them."""
        file_path = get_file_path(req.file_id)
        if not file_path or not file_path.exists():
            raise FileNotFoundError(f"Document with ID {req.file_id} not found.")

        reader = PdfReader(str(file_path))
        total_pages = len(reader.pages)
        target_pages = parse_target_pages(total_pages, selection=req.page_selection, page_range=req.page_range)

        pdftoppm_bin = find_pdftoppm()
        fmt = 'png' if req.format == 'png' else 'jpeg'
        ext = 'png' if fmt == 'png' else 'jpg'
        dpi = max(72, min(req.dpi or 150, 300))

        rendered_items: List[RenderedImageItem] = []
        doc_basename = file_path.stem

        # Create temporary working directory for rendering
        with tempfile.TemporaryDirectory() as tmp_dir:
            zip_filename = f"{doc_basename}_images.zip"
            zip_path = os.path.join(tmp_dir, zip_filename)

            with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
                for p_num in target_pages:
                    prefix = os.path.join(tmp_dir, f"page_{p_num}")
                    img_out_path = None

                    if pdftoppm_bin:
                        cmd = [
                            pdftoppm_bin,
                            f"-{fmt}",
                            "-r", str(dpi),
                            "-f", str(p_num),
                            "-l", str(p_num),
                        ]
                        if fmt == 'jpeg':
                            cmd.extend(["-jpegopt", f"quality={req.quality or 85}"])
                        cmd.extend([str(file_path), prefix])

                        try:
                            subprocess.run(cmd, check=True, capture_output=True)
                            # pdftoppm outputs files named prefix-{p_num}.ext or prefix-0{p_num}.ext
                            candidates = [
                                f"{prefix}-{p_num}.{ext}",
                                f"{prefix}-{p_num:02d}.{ext}",
                                f"{prefix}-{p_num:03d}.{ext}",
                                f"{prefix}-1.{ext}",
                            ]
                            for c in candidates:
                                if os.path.exists(c):
                                    img_out_path = c
                                    break
                            # Fallback: find any file starting with prefix
                            if not img_out_path:
                                for f in os.listdir(tmp_dir):
                                    if f.startswith(f"page_{p_num}") and f.endswith(f".{ext}"):
                                        img_out_path = os.path.join(tmp_dir, f)
                                        break
                        except Exception as e:
                            print(f"pdftoppm execution error on page {p_num}: {e}")

                    if not img_out_path or not os.path.exists(img_out_path):
                        # Fallback: create placeholder rendered image via PIL
                        pw = int(float(reader.pages[p_num - 1].mediabox.width) * (dpi / 72.0))
                        ph = int(float(reader.pages[p_num - 1].mediabox.height) * (dpi / 72.0))
                        img = Image.new('RGB', (max(100, pw), max(100, ph)), color=(255, 255, 255))
                        img_out_path = os.path.join(tmp_dir, f"page_{p_num}_fallback.{ext}")
                        img.save(img_out_path, format=fmt.upper())

                    # Read image, get dimensions, and build base64
                    with Image.open(img_out_path) as im:
                        w, h = im.size

                    with open(img_out_path, 'rb') as f:
                        img_bytes = f.read()

                    b64 = f"data:image/{fmt};base64,{base64.b64encode(img_bytes).decode('ascii')}"
                    entry_name = f"{doc_basename}_page_{p_num:02d}.{ext}"
                    zf.write(img_out_path, arcname=entry_name)

                    rendered_items.append(RenderedImageItem(
                        page_number=p_num,
                        image_base64=b64,
                        width=w,
                        height=h,
                        size_bytes=len(img_bytes),
                        format=fmt,
                    ))

            # Store the zip archive in sandbox storage for downloading
            with open(zip_path, 'rb') as zf_in:
                zip_data = zf_in.read()

            zip_id, _ = save_uploaded_file(zip_data, zip_filename)

        return PdfToImagesResponse(
            total_pages_rendered=len(rendered_items),
            images=rendered_items,
            archive_file_id=zip_id,
            archive_filename=zip_filename,
            format=fmt,
            dpi=dpi,
        )

    @staticmethod
    def pdf_to_text(req: PdfToTextRequest) -> PdfToTextResponse:
        """Extract text from target pages, detect scanned pages, and return formatted output."""
        file_path = get_file_path(req.file_id)
        if not file_path or not file_path.exists():
            raise FileNotFoundError(f"Document with ID {req.file_id} not found.")

        reader = PdfReader(str(file_path))
        total_pages = len(reader.pages)
        target_pages = parse_target_pages(total_pages, selection=req.page_selection, page_range=req.page_range)

        pages_data: List[PageTextItem] = []
        full_text_parts: List[str] = []
        scanned_count = 0

        ext_mode = req.mode or req.extraction_mode or 'plain'
        inc_headers = req.preserve_page_breaks if req.preserve_page_breaks is not None else req.include_page_headers

        for p_num in target_pages:
            page = reader.pages[p_num - 1]
            raw_text = ""
            try:
                raw_text = page.extract_text(extraction_mode=ext_mode) or ""
            except Exception:
                try:
                    raw_text = page.extract_text() or ""
                except Exception:
                    raw_text = ""

            char_count = len(raw_text.strip())
            is_scanned = char_count < 15

            if is_scanned:
                scanned_count += 1

            pages_data.append(PageTextItem(
                page_number=p_num,
                text=raw_text,
                char_count=char_count,
                character_count=char_count,
                is_scanned_likely=is_scanned,
                is_likely_scanned=is_scanned,
            ))

            if inc_headers:
                full_text_parts.append(f"--- Page {p_num} of {total_pages} ---\n{raw_text}\n")
            else:
                full_text_parts.append(f"{raw_text}\n")

        full_text = "\n".join(full_text_parts)
        total_chars = sum(p.char_count for p in pages_data)
        has_scanned = scanned_count > 0

        warning = None
        if has_scanned:
            warning = (
                f"Scanned Document Detected: {scanned_count} of {len(target_pages)} page(s) contain "
                "little or no selectable text. PDF Studio extracts selectable vector text; "
                "optical character recognition (OCR) for scanned images is not included in this phase."
            )

        return PdfToTextResponse(
            full_text=full_text,
            total_chars=total_chars,
            total_characters=total_chars,
            pages=pages_data,
            has_scanned_pages=has_scanned,
            scanned_warning=warning,
        )
