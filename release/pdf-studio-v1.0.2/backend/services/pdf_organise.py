import io
import re
from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple
import pypdf

try:
    from schemas.document import DocumentInfoResponse
    from schemas.organise import CropBox
    from services.pdf_document import PDFDocumentService
    from utils.storage import get_file_path, save_uploaded_file, sanitize_filename
except ImportError:
    from ..schemas.document import DocumentInfoResponse
    from ..schemas.organise import CropBox
    from ..services.pdf_document import PDFDocumentService
    from ..utils.storage import get_file_path, save_uploaded_file, sanitize_filename

class PDFOrganiseService:
    @staticmethod
    def _get_reader(file_id: str) -> Tuple[pypdf.PdfReader, Path]:
        file_path = get_file_path(file_id)
        if not file_path or not file_path.exists():
            raise FileNotFoundError(f"Document with ID {file_id} not found.")
        reader = pypdf.PdfReader(str(file_path))
        if reader.is_encrypted:
            raise ValueError("Encrypted PDFs are password-protected. Please decrypt before organising.")
        return reader, file_path

    @staticmethod
    def merge_pdfs(file_ids: List[str], output_filename: Optional[str] = "merged_document.pdf") -> DocumentInfoResponse:
        if len(file_ids) < 2:
            raise ValueError("Merging requires at least two PDF documents.")

        writer = pypdf.PdfWriter()
        total_pages = 0

        for fid in file_ids:
            reader, _ = PDFOrganiseService._get_reader(fid)
            for page in reader.pages:
                writer.add_page(page)
                total_pages += 1

        if total_pages == 0:
            raise ValueError("All source documents are empty.")

        clean_name = sanitize_filename(output_filename or "merged_document.pdf")
        if not clean_name.lower().endswith(".pdf"):
            clean_name += ".pdf"

        stream = io.BytesIO()
        writer.write(stream)
        new_id, _ = save_uploaded_file(stream.getvalue(), clean_name)
        return PDFDocumentService.inspect_document(new_id)

    @staticmethod
    def split_pdf(
        file_id: str,
        mode: str = "ranges",
        ranges: Optional[List[str]] = None,
        split_after_pages: Optional[List[int]] = None
    ) -> List[DocumentInfoResponse]:
        reader, path = PDFOrganiseService._get_reader(file_id)
        total_pages = len(reader.pages)
        base_name = path.stem
        output_docs: List[DocumentInfoResponse] = []

        if mode == "all_pages":
            # Split every page into individual file
            for i in range(total_pages):
                writer = pypdf.PdfWriter()
                writer.add_page(reader.pages[i])
                filename = f"{base_name}_page_{i + 1}.pdf"
                stream = io.BytesIO()
                writer.write(stream)
                new_id, _ = save_uploaded_file(stream.getvalue(), filename)
                output_docs.append(PDFDocumentService.inspect_document(new_id))
            return output_docs

        elif mode == "ranges":
            if not ranges:
                raise ValueError("Page ranges must be specified for range splitting.")

            for group_idx, r_str in enumerate(ranges):
                page_indices = PDFOrganiseService._parse_page_range(r_str, total_pages)
                if not page_indices:
                    continue
                writer = pypdf.PdfWriter()
                for p_idx in page_indices:
                    writer.add_page(reader.pages[p_idx])
                clean_range = r_str.replace(" ", "")
                filename = f"{base_name}_part{group_idx + 1}_{clean_range}.pdf"
                stream = io.BytesIO()
                writer.write(stream)
                new_id, _ = save_uploaded_file(stream.getvalue(), filename)
                output_docs.append(PDFDocumentService.inspect_document(new_id))

            if not output_docs:
                raise ValueError("No valid pages matched the requested ranges.")
            return output_docs

        elif mode == "after_pages":
            if not split_after_pages:
                raise ValueError("Split break points must be provided.")
            
            breaks = sorted(set([p for p in split_after_pages if 1 <= p < total_pages]))
            if not breaks:
                raise ValueError("No valid split positions within document bounds.")

            start = 0
            for group_idx, b in enumerate(breaks + [total_pages]):
                end = b
                if end <= start:
                    continue
                writer = pypdf.PdfWriter()
                for p_idx in range(start, end):
                    writer.add_page(reader.pages[p_idx])
                filename = f"{base_name}_part{group_idx + 1}_p{start + 1}-p{end}.pdf"
                stream = io.BytesIO()
                writer.write(stream)
                new_id, _ = save_uploaded_file(stream.getvalue(), filename)
                output_docs.append(PDFDocumentService.inspect_document(new_id))
                start = end

            return output_docs

        else:
            raise ValueError(f"Unknown split mode: {mode}")

    @staticmethod
    def _parse_page_range(range_str: str, max_pages: int) -> List[int]:
        """Parses strings like '1-3', '4, 5, 8-10' into 0-indexed page indices."""
        indices: List[int] = []
        parts = range_str.split(",")
        for part in parts:
            part = part.strip()
            if not part:
                continue
            if "-" in part:
                tokens = part.split("-")
                start = int(tokens[0].strip())
                end = int(tokens[1].strip())
                for p in range(start, end + 1):
                    if 1 <= p <= max_pages:
                        indices.append(p - 1)
            else:
                p = int(part)
                if 1 <= p <= max_pages:
                    indices.append(p - 1)
        # Preserve order while removing duplicates
        seen = set()
        result = []
        for idx in indices:
            if idx not in seen:
                seen.add(idx)
                result.append(idx)
        return result

    @staticmethod
    def reorder_pages(file_id: str, page_order: List[int]) -> DocumentInfoResponse:
        reader, path = PDFOrganiseService._get_reader(file_id)
        total_pages = len(reader.pages)

        if not page_order:
            raise ValueError("Page order list cannot be empty.")

        for p in page_order:
            if p < 1 or p > total_pages:
                raise ValueError(f"Page index {p} is out of document bounds (1 to {total_pages}).")

        writer = pypdf.PdfWriter()
        for p in page_order:
            writer.add_page(reader.pages[p - 1])

        filename = f"{path.stem}_reordered.pdf"
        stream = io.BytesIO()
        writer.write(stream)
        new_id, _ = save_uploaded_file(stream.getvalue(), filename)
        return PDFDocumentService.inspect_document(new_id)

    @staticmethod
    def rotate_pages(file_id: str, page_numbers: List[int], angle: int) -> DocumentInfoResponse:
        if angle not in (90, 180, 270):
            raise ValueError(f"Invalid rotation angle {angle}. Must be 90, 180, or 270 degrees clockwise.")

        reader, path = PDFOrganiseService._get_reader(file_id)
        total_pages = len(reader.pages)

        targets = set(page_numbers)
        writer = pypdf.PdfWriter()

        for i, page in enumerate(reader.pages):
            p_num = i + 1
            if p_num in targets:
                page.rotate(angle)
            writer.add_page(page)

        filename = f"{path.stem}_rotated.pdf"
        stream = io.BytesIO()
        writer.write(stream)
        new_id, _ = save_uploaded_file(stream.getvalue(), filename)
        return PDFDocumentService.inspect_document(new_id)

    @staticmethod
    def delete_pages(file_id: str, page_numbers: List[int]) -> DocumentInfoResponse:
        reader, path = PDFOrganiseService._get_reader(file_id)
        total_pages = len(reader.pages)

        to_delete = set(page_numbers)
        if len(to_delete) >= total_pages:
            raise ValueError("Cannot delete all pages in the document. At least one page must remain.")

        writer = pypdf.PdfWriter()
        kept_count = 0

        for i, page in enumerate(reader.pages):
            p_num = i + 1
            if p_num not in to_delete:
                writer.add_page(page)
                kept_count += 1

        if kept_count == 0:
            raise ValueError("Resulting document would be empty.")

        filename = f"{path.stem}_modified.pdf"
        stream = io.BytesIO()
        writer.write(stream)
        new_id, _ = save_uploaded_file(stream.getvalue(), filename)
        return PDFDocumentService.inspect_document(new_id)

    @staticmethod
    def duplicate_pages(file_id: str, page_numbers: List[int], count: int = 1) -> DocumentInfoResponse:
        reader, path = PDFOrganiseService._get_reader(file_id)
        total_pages = len(reader.pages)

        if count < 1 or count > 20:
            raise ValueError("Duplicate count must be between 1 and 20.")

        to_duplicate = set(page_numbers)
        writer = pypdf.PdfWriter()

        for i, page in enumerate(reader.pages):
            p_num = i + 1
            writer.add_page(page)
            if p_num in to_duplicate:
                for _ in range(count):
                    writer.add_page(page)

        filename = f"{path.stem}_duplicated.pdf"
        stream = io.BytesIO()
        writer.write(stream)
        new_id, _ = save_uploaded_file(stream.getvalue(), filename)
        return PDFDocumentService.inspect_document(new_id)

    @staticmethod
    def extract_pages(file_id: str, page_numbers: List[int], output_filename: Optional[str] = "extracted.pdf") -> DocumentInfoResponse:
        reader, path = PDFOrganiseService._get_reader(file_id)
        total_pages = len(reader.pages)

        if not page_numbers:
            raise ValueError("No pages specified for extraction.")

        writer = pypdf.PdfWriter()
        for p in page_numbers:
            if p < 1 or p > total_pages:
                raise ValueError(f"Page {p} is out of bounds (1 to {total_pages}).")
            writer.add_page(reader.pages[p - 1])

        clean_name = sanitize_filename(output_filename or f"{path.stem}_extracted.pdf")
        if not clean_name.lower().endswith(".pdf"):
            clean_name += ".pdf"

        stream = io.BytesIO()
        writer.write(stream)
        new_id, _ = save_uploaded_file(stream.getvalue(), clean_name)
        return PDFDocumentService.inspect_document(new_id)

    @staticmethod
    def insert_blank_page(
        file_id: str,
        target_page: int,
        position: str = "after",
        count: int = 1,
        paper_size: str = "A4",
        orientation: str = "portrait"
    ) -> DocumentInfoResponse:
        reader, path = PDFOrganiseService._get_reader(file_id)
        total_pages = len(reader.pages)

        if target_page < 1 or target_page > total_pages:
            raise ValueError(f"Target page {target_page} is out of bounds (1 to {total_pages}).")

        # Dimensions in points (72 points / inch)
        if paper_size == "Letter":
            w, h = 612.0, 792.0
        else: # A4
            w, h = 595.0, 842.0

        if orientation == "landscape":
            w, h = h, w

        writer = pypdf.PdfWriter()

        for i, page in enumerate(reader.pages):
            p_num = i + 1
            if position == "before" and p_num == target_page:
                for _ in range(count):
                    writer.add_blank_page(width=w, height=h)

            writer.add_page(page)

            if position == "after" and p_num == target_page:
                for _ in range(count):
                    writer.add_blank_page(width=w, height=h)

        filename = f"{path.stem}_with_blank.pdf"
        stream = io.BytesIO()
        writer.write(stream)
        new_id, _ = save_uploaded_file(stream.getvalue(), filename)
        return PDFDocumentService.inspect_document(new_id)

    @staticmethod
    def crop_pages(file_id: str, page_numbers: List[int], crop_box: CropBox) -> DocumentInfoResponse:
        reader, path = PDFOrganiseService._get_reader(file_id)
        total_pages = len(reader.pages)

        targets = set(page_numbers)
        writer = pypdf.PdfWriter()

        for i, page in enumerate(reader.pages):
            p_num = i + 1
            if p_num in targets:
                box = page.mediabox
                w = float(box.width)
                h = float(box.height)
                
                new_left = float(box.left) + crop_box.left
                new_bottom = float(box.bottom) + crop_box.bottom
                new_right = float(box.right) - crop_box.right
                new_top = float(box.top) - crop_box.top

                if new_right <= new_left + 20 or new_top <= new_bottom + 20:
                    raise ValueError(f"Crop margins are too large for page {p_num} ({w:.0f}x{h:.0f} pt).")

                page.cropbox.lower_left = (new_left, new_bottom)
                page.cropbox.upper_right = (new_right, new_top)
                page.mediabox.lower_left = (new_left, new_bottom)
                page.mediabox.upper_right = (new_right, new_top)

            writer.add_page(page)

        filename = f"{path.stem}_cropped.pdf"
        stream = io.BytesIO()
        writer.write(stream)
        new_id, _ = save_uploaded_file(stream.getvalue(), filename)
        return PDFDocumentService.inspect_document(new_id)
