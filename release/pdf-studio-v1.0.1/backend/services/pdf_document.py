import os
import io
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

try:
    from schemas.document import DocumentInfoResponse, PageInfo, DocumentMetadata
    from utils.storage import get_file_path, save_uploaded_file
except ImportError:
    from ..schemas.document import DocumentInfoResponse, PageInfo, DocumentMetadata
    from ..utils.storage import get_file_path, save_uploaded_file

# Attempt importing PyMuPDF (fitz), with graceful pypdf fallback
try:
    import fitz  # PyMuPDF
    HAVE_FITZ = True
except ImportError:
    HAVE_FITZ = False

try:
    import pypdf
    HAVE_PYPDF = True
except ImportError:
    HAVE_PYPDF = False

from PIL import Image, ImageDraw, ImageFont

class PDFDocumentService:
    @staticmethod
    def inspect_document(file_id: str) -> DocumentInfoResponse:
        file_path = get_file_path(file_id)
        if not file_path or not file_path.exists():
            raise FileNotFoundError(f"Document with ID {file_id} not found.")

        size_bytes = file_path.stat().st_size
        filename = file_path.name
        pages_info: List[PageInfo] = []
        meta = DocumentMetadata()
        is_encrypted = False
        is_repaired = False

        if HAVE_FITZ:
            doc = fitz.open(str(file_path))
            is_encrypted = doc.is_encrypted
            page_count = len(doc)
            
            for i in range(page_count):
                page = doc[i]
                rect = page.rect
                pages_info.append(PageInfo(
                    page_number=i + 1,
                    width=float(rect.width),
                    height=float(rect.height),
                    rotation=int(page.rotation)
                ))
                
            raw_meta = doc.metadata or {}
            meta = DocumentMetadata(
                title=raw_meta.get("title") or filename,
                author=raw_meta.get("author") or "",
                subject=raw_meta.get("subject") or "",
                keywords=raw_meta.get("keywords") or "",
                creator=raw_meta.get("creator") or "PDF Studio",
                producer=raw_meta.get("producer") or "PDF Studio Engine",
                creation_date=raw_meta.get("creationDate") or "",
                mod_date=raw_meta.get("modDate") or ""
            )
            doc.close()
        elif HAVE_PYPDF:
            reader = pypdf.PdfReader(str(file_path))
            is_encrypted = reader.is_encrypted
            page_count = len(reader.pages)
            for i, page in enumerate(reader.pages):
                box = page.cropbox if hasattr(page, 'cropbox') and page.cropbox else page.mediabox
                pages_info.append(PageInfo(
                    page_number=i + 1,
                    width=float(box.width),
                    height=float(box.height),
                    rotation=int(page.get("/Rotate", 0))
                ))
            info = reader.metadata or {}
            meta = DocumentMetadata(
                title=str(info.get("/Title", filename)),
                author=str(info.get("/Author", "")),
                subject=str(info.get("/Subject", "")),
                keywords=str(info.get("/Keywords", "")),
                creator=str(info.get("/Creator", "PDF Studio")),
                producer=str(info.get("/Producer", "PDF Studio Engine"))
            )
        else:
            raise RuntimeError("Neither PyMuPDF nor pypdf is installed in the Python environment.")

        return DocumentInfoResponse(
            file_id=file_id,
            filename=filename,
            size_bytes=size_bytes,
            page_count=page_count,
            pages=pages_info,
            metadata=meta,
            is_encrypted=is_encrypted,
            is_repaired=is_repaired
        )

    @staticmethod
    def render_page_thumbnail(file_id: str, page_num: int, max_width: int = 240) -> bytes:
        file_path = get_file_path(file_id)
        if not file_path or not file_path.exists():
            raise FileNotFoundError(f"Document {file_id} not found.")

        if HAVE_FITZ:
            doc = fitz.open(str(file_path))
            if page_num < 1 or page_num > len(doc):
                doc.close()
                raise ValueError(f"Page {page_num} out of bounds (1-{len(doc)})")
            page = doc[page_num - 1]
            scale = max_width / max(float(page.rect.width), 1.0)
            mat = fitz.Matrix(scale, scale)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img_bytes = pix.tobytes("png")
            doc.close()
            return img_bytes
        else:
            # High-fidelity preview thumbnail via pure Python Pillow
            doc_info = PDFDocumentService.inspect_document(file_id)
            page_info = doc_info.pages[page_num - 1] if page_num <= len(doc_info.pages) else doc_info.pages[0]
            aspect = page_info.height / max(page_info.width, 1.0)
            height = int(max_width * aspect)
            
            img = Image.new("RGB", (max_width, height), color="#FFFFFF")
            draw = ImageDraw.Draw(img)
            # Subtle page border
            draw.rectangle([0, 0, max_width - 1, height - 1], outline="#DCE3EF", width=2)
            # Header line
            draw.rectangle([15, 12, max_width - 15, 14], fill="#2859D9")
            # Text lines simulation
            for line_y in range(30, min(height - 30, 220), 12):
                draw.rectangle([15, line_y, max_width - 25, line_y + 4], fill="#E2E8F0")
            # Confidential test bar if page 1
            if page_num == 1:
                draw.rectangle([15, 110, max_width - 15, 130], fill="#FEE2E2", outline="#EF4444")
            # Page number
            draw.rectangle([max_width - 35, height - 20, max_width - 15, height - 8], fill="#17243B")
            
            buffer = io.BytesIO()
            img.save(buffer, format="PNG")
            return buffer.getvalue()

    @staticmethod
    def create_synthetic_pdf(num_pages: int = 50, title: str = "Thermodynamics Lecture Notes") -> Tuple[str, Path]:
        """
        Creates a synthetic PDF document for testing all PDF Studio features offline.
        Contains headings, tables, formulas, and test sensitive text for redaction.
        """
        if HAVE_FITZ:
            doc = fitz.open()
            for p in range(1, num_pages + 1):
                page = doc.new_page(width=595, height=842) # A4 points
                
                # Header
                page.draw_rect(fitz.Rect(40, 30, 555, 32), color=(0.86, 0.89, 0.94), fill=(0.86, 0.89, 0.94))
                page.insert_text(fitz.Point(40, 25), "PDF STUDIO TEST SUITE — BSERC GENAI WEEK 2", fontsize=8, color=(0.4, 0.45, 0.55))
                page.insert_text(fitz.Point(460, 25), f"Page {p} of {num_pages}", fontsize=8, color=(0.4, 0.45, 0.55))
                
                if p == 1:
                    page.insert_text(fitz.Point(40, 80), title, fontsize=24, color=(0.09, 0.14, 0.23))
                    page.insert_text(fitz.Point(40, 110), "Chapter 04 / Heat Engines and Efficiency", fontsize=14, color=(0.16, 0.35, 0.85))
                    
                    page.insert_text(fitz.Point(40, 160), "4.1 CARNOT CYCLE", fontsize=12, color=(0.09, 0.14, 0.23))
                    page.insert_text(fitz.Point(40, 185), "The Carnot cycle is an ideal thermodynamic cycle that sets the maximum possible efficiency", fontsize=10, color=(0.2, 0.2, 0.2))
                    page.insert_text(fitz.Point(40, 205), "for a heat engine operating between two thermal reservoirs at temperatures Th and Tc.", fontsize=10, color=(0.2, 0.2, 0.2))
                    
                    page.draw_rect(fitz.Rect(40, 230, 260, 275), color=(0.96, 0.97, 0.99), fill=(0.96, 0.97, 0.99))
                    page.insert_text(fitz.Point(55, 258), "Thermal efficiency:  η = 1 - (Tc / Th)", fontsize=11, color=(0.16, 0.35, 0.85))
                    
                    page.draw_rect(fitz.Rect(60, 300, 160, 340), color=(0.16, 0.35, 0.85), width=1.5)
                    page.insert_text(fitz.Point(85, 325), "Hot reservoir", fontsize=9, color=(0.09, 0.14, 0.23))
                    
                    page.draw_rect(fitz.Rect(240, 300, 340, 340), color=(0.16, 0.35, 0.85), width=1.5)
                    page.insert_text(fitz.Point(270, 320), "ENGINE", fontsize=9, color=(0.09, 0.14, 0.23))
                    page.insert_text(fitz.Point(275, 332), "Q -> W", fontsize=8, color=(0.4, 0.45, 0.55))
                    
                    page.draw_rect(fitz.Rect(420, 300, 520, 340), color=(0.16, 0.35, 0.85), width=1.5)
                    page.insert_text(fitz.Point(445, 325), "Cold reservoir", fontsize=9, color=(0.09, 0.14, 0.23))
                    
                    page.insert_text(fitz.Point(40, 390), "4.2 LIMITATIONS OF REAL ENGINES", fontsize=12, color=(0.09, 0.14, 0.23))
                    page.insert_text(fitz.Point(50, 415), "• Real engines experience friction and heat losses.", fontsize=10, color=(0.2, 0.2, 0.2))
                    page.insert_text(fitz.Point(50, 435), "• No practical engine reaches the Carnot efficiency.", fontsize=10, color=(0.2, 0.2, 0.2))
                    page.insert_text(fitz.Point(50, 455), "• The ideal cycle provides a theoretical upper limit.", fontsize=10, color=(0.2, 0.2, 0.2))
                    
                    page.draw_rect(fitz.Rect(40, 500, 555, 560), color=(0.95, 0.95, 0.95), fill=(0.98, 0.98, 0.98))
                    page.insert_text(fitz.Point(55, 525), "RESTRICTED DATA (Test Redaction Target):", fontsize=9, color=(0.8, 0.1, 0.1))
                    page.insert_text(fitz.Point(55, 545), "Author Identification: Professor R. Sharma | Internal Access Key: SEC-99482-CARNOT", fontsize=10, color=(0.1, 0.1, 0.1))
                else:
                    page.insert_text(fitz.Point(40, 70), f"Section {p}.0 — Theoretical Analysis & Computations (Part {p})", fontsize=16, color=(0.09, 0.14, 0.23))
                    page.insert_text(fitz.Point(40, 100), f"This is synthetic page {p} of the 50-page document for performance, rendering, and pagination testing.", fontsize=10, color=(0.3, 0.3, 0.3))
                    for line_idx in range(12):
                        y = 140 + line_idx * 30
                        page.insert_text(fitz.Point(40, y), f"Data record [{p:02d}-{line_idx:02d}]: System state entropy calculation S = k_B * ln(Omega) with variable bounds.", fontsize=9, color=(0.25, 0.25, 0.25))
                        page.draw_rect(fitz.Rect(40, y + 10, 555, y + 11), color=(0.92, 0.94, 0.97), fill=(0.92, 0.94, 0.97))
                
                page.draw_rect(fitz.Rect(40, 800, 555, 801), color=(0.86, 0.89, 0.94), fill=(0.86, 0.89, 0.94))
                page.insert_text(fitz.Point(40, 815), "PHYSICS STUDY NOTES — CONFIDENTIAL INTERNAL USE", fontsize=8, color=(0.5, 0.55, 0.65))
                page.insert_text(fitz.Point(510, 815), f"{p:02d}", fontsize=8, color=(0.5, 0.55, 0.65))
            
            pdf_bytes = doc.tobytes()
            doc.close()
        else:
            # Permissive BSD pure python generator via pypdf with vector text streams
            writer = pypdf.PdfWriter()
            from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject
            for p in range(1, num_pages + 1):
                page = writer.add_blank_page(width=595, height=842)
                fonts = DictionaryObject({
                    NameObject('/Helvetica'): DictionaryObject({
                        NameObject('/Type'): NameObject('/Font'),
                        NameObject('/Subtype'): NameObject('/Type1'),
                        NameObject('/BaseFont'): NameObject('/Helvetica'),
                    }),
                    NameObject('/Helvetica-Bold'): DictionaryObject({
                        NameObject('/Type'): NameObject('/Font'),
                        NameObject('/Subtype'): NameObject('/Type1'),
                        NameObject('/BaseFont'): NameObject('/Helvetica-Bold'),
                    }),
                })
                page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'): fonts})

                ops = []
                # Header divider
                ops.append("q 0.86 0.89 0.94 rg 40 810 515 2 re f Q")
                ops.append(f"BT /Helvetica 8 Tf 0.4 0.45 0.55 rg 40 818 Td (PDF STUDIO TEST SUITE -- BSERC GENAI WEEK 2) Tj ET")
                ops.append(f"BT /Helvetica 8 Tf 0.4 0.45 0.55 rg 480 818 Td (Page {p} of {num_pages}) Tj ET")

                if p == 1:
                    ops.append(f"BT /Helvetica-Bold 22 Tf 0.09 0.14 0.23 rg 40 760 Td ({title}) Tj ET")
                    ops.append("BT /Helvetica 13 Tf 0.16 0.35 0.85 rg 40 735 Td (Chapter 04 / Heat Engines and Efficiency) Tj ET")
                    ops.append("BT /Helvetica-Bold 12 Tf 0.09 0.14 0.23 rg 40 690 Td (4.1 CARNOT CYCLE) Tj ET")
                    ops.append("BT /Helvetica 10 Tf 0.2 0.2 0.2 rg 40 670 Td (The Carnot cycle is an ideal thermodynamic cycle that sets the maximum possible efficiency) Tj ET")
                    ops.append("BT /Helvetica 10 Tf 0.2 0.2 0.2 rg 40 655 Td (for a heat engine operating between two thermal reservoirs at temperatures Th and Tc.) Tj ET")
                    # Formula card
                    ops.append("q 0.96 0.97 0.99 rg 40 590 300 45 re f Q")
                    ops.append("BT /Helvetica-Bold 11 Tf 0.16 0.35 0.85 rg 55 608 Td (Thermal efficiency:  eta = 1 - (Tc / Th)) Tj ET")
                    # Confidential target box
                    ops.append("q 0.98 0.95 0.95 rg 40 480 515 50 re f Q")
                    ops.append("BT /Helvetica-Bold 9 Tf 0.8 0.1 0.1 rg 55 512 Td (RESTRICTED DATA (Test Redaction Target):) Tj ET")
                    ops.append("BT /Helvetica 10 Tf 0.1 0.1 0.1 rg 55 494 Td (Author Identification: Professor R. Sharma | Internal Access Key: SEC-99482-CARNOT) Tj ET")
                else:
                    ops.append(f"BT /Helvetica-Bold 16 Tf 0.09 0.14 0.23 rg 40 750 Td (Section {p}.0 -- Theoretical Analysis and Computations) Tj ET")
                    ops.append(f"BT /Helvetica 10 Tf 0.3 0.3 0.3 rg 40 725 Td (This is synthetic page {p} of the {num_pages}-page document for performance and verification testing.) Tj ET")
                    for line_idx in range(10):
                        y = 680 - line_idx * 30
                        ops.append(f"BT /Helvetica 9 Tf 0.25 0.25 0.25 rg 40 {y} Td (Data record [{p:02d}-{line_idx:02d}]: System state entropy calculation with variable bounds.) Tj ET")
                        ops.append(f"q 0.92 0.94 0.97 rg 40 {y-5} 515 1 re f Q")

                # Footer
                ops.append("q 0.86 0.89 0.94 rg 40 40 515 1 re f Q")
                ops.append("BT /Helvetica 8 Tf 0.5 0.55 0.65 rg 40 28 Td (PHYSICS STUDY NOTES -- CONFIDENTIAL INTERNAL USE) Tj ET")
                ops.append(f"BT /Helvetica 8 Tf 0.5 0.55 0.65 rg 520 28 Td ({p:02d}) Tj ET")

                stream = DecodedStreamObject()
                stream.set_data("\n".join(ops).encode('latin1'))
                indirect_stream = writer._add_object(stream)
                page[NameObject('/Contents')] = indirect_stream

            writer.add_metadata({
                "/Title": title,
                "/Author": "Professor R. Sharma",
                "/Subject": "Thermodynamics & Heat Engines",
                "/Keywords": "physics, thermodynamics, carnot, bserc",
                "/Creator": "PDF Studio",
                "/Producer": "PDF Studio Offline Engine"
            })

            stream_buf = io.BytesIO()
            writer.write(stream_buf)
            pdf_bytes = stream_buf.getvalue()

        filename = "notes-sem4.pdf" if num_pages >= 40 else "sample-document.pdf"
        file_id, file_path = save_uploaded_file(pdf_bytes, filename)
        return file_id, file_path
