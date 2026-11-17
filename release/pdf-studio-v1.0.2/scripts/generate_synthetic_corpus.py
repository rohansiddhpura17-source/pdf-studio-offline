#!/usr/bin/env python3
"""
generate_synthetic_corpus.py
Generates a comprehensive suite of synthetic test PDFs for independent QA auditing.
All files are saved to 01-PDF-Studio/evidence/input_pdfs/.
"""

import os
import io
from pathlib import Path
import pypdf
from pypdf.generic import (
    DictionaryObject, NameObject, DecodedStreamObject, ArrayObject,
    NumberObject, create_string_object, BooleanObject, TextStringObject
)
from PIL import Image, ImageDraw

OUTPUT_DIR = Path("/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/evidence/input_pdfs")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def create_vector_page(title: str, page_num: int, total_pages: int, width: float = 595, height: float = 842, extra_ops: list = None) -> tuple:
    page = pypdf.PageObject.create_blank_page(width=width, height=height)
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
    
    ops = [
        "q 0.86 0.89 0.94 rg 40 810 515 2 re f Q",
        f"BT /Helvetica 8 Tf 0.4 0.45 0.55 rg 40 818 Td (PDF STUDIO QA AUDIT -- SYNTHETIC CORPUS) Tj ET",
        f"BT /Helvetica 8 Tf 0.4 0.45 0.55 rg 480 818 Td (Page {page_num} of {total_pages}) Tj ET",
        f"BT /Helvetica-Bold 18 Tf 0.09 0.14 0.23 rg 40 760 Td ({title}) Tj ET",
        f"BT /Helvetica 10 Tf 0.3 0.3 0.3 rg 40 735 Td (Standard benchmark document page {page_num}. Fully compliant vector streams.) Tj ET"
    ]
    if extra_ops:
        ops.extend(extra_ops)
    
    # Footer
    ops.append("q 0.86 0.89 0.94 rg 40 40 515 1 re f Q")
    ops.append(f"BT /Helvetica 8 Tf 0.5 0.55 0.65 rg 40 28 Td (DOCUMENT ID: CORPUS-{page_num:03d} | FOR QA AUDIT PURPOSES ONLY) Tj ET")
    ops.append(f"BT /Helvetica 8 Tf 0.5 0.55 0.65 rg 520 28 Td ({page_num:02d}) Tj ET")
    
    stream = DecodedStreamObject()
    stream.set_data("\n".join(ops).encode('latin1'))
    page[NameObject('/Contents')] = stream
    return page

def build_pdf(pages: list, metadata: dict = None, password: str = None) -> bytes:
    writer = pypdf.PdfWriter()
    for p in pages:
        writer.add_page(p)
    if metadata:
        writer.add_metadata(metadata)
    if password:
        writer.encrypt(user_password=password, owner_password=password)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()

def generate_all():
    print("[*] Generating synthetic test corpus...")

    # 1. synthetic_1p.pdf
    p1_ops = [
        "BT /Helvetica-Bold 12 Tf 0.1 0.1 0.1 rg 40 690 Td (1. Executive Overview) Tj ET",
        "BT /Helvetica 10 Tf 0.2 0.2 0.2 rg 40 670 Td (This is a single-page standard PDF document designed for baseline verification.) Tj ET",
        "q 0.95 0.96 0.98 rg 40 580 515 70 re f Q",
        "BT /Helvetica-Bold 10 Tf 0.16 0.35 0.85 rg 55 630 Td (Benchmark Sample Metric Card) Tj ET",
        "BT /Helvetica 9 Tf 0.3 0.3 0.3 rg 55 605 Td (Total Page Count: 1 | Format: A4 (595 x 842 pt) | Engine: Localhost Vector) Tj ET"
    ]
    p1 = create_vector_page("Single Page Benchmark Document", 1, 1, extra_ops=p1_ops)
    pdf_1p = build_pdf([p1], metadata={
        "/Title": "Single Page Benchmark Document",
        "/Author": "QA Audit Suite",
        "/Subject": "Baseline Performance Evaluation",
        "/Keywords": "benchmark, 1page, qa, bserc",
        "/Creator": "PDF Studio Engine"
    })
    (OUTPUT_DIR / "synthetic_1p.pdf").write_bytes(pdf_1p)
    print("  [+] Generated synthetic_1p.pdf")

    # 2. synthetic_5p.pdf
    pages_5 = []
    for i in range(1, 6):
        extra = [
            f"BT /Helvetica-Bold 14 Tf 0.1 0.1 0.1 rg 40 690 Td (Chapter {i}: Detailed Findings & Metrics) Tj ET",
            f"BT /Helvetica 10 Tf 0.2 0.2 0.2 rg 40 660 Td (Section {i}.1 describes the operation of multi-page workflow systems.) Tj ET",
            f"BT /Helvetica 10 Tf 0.2 0.2 0.2 rg 40 640 Td (Data record #{i*10}: Entropy level = {i*0.19:.2f}, Vector throughput = {i*250} ops/sec.) Tj ET"
        ]
        pages_5.append(create_vector_page(f"Five-Page Report Document -- Page {i}", i, 5, extra_ops=extra))
    pdf_5p = build_pdf(pages_5, metadata={
        "/Title": "Five-Page Comprehensive Report",
        "/Author": "QA Audit Suite",
        "/Subject": "Multi-page Organise and Edit Verification"
    })
    (OUTPUT_DIR / "synthetic_5p.pdf").write_bytes(pdf_5p)
    print("  [+] Generated synthetic_5p.pdf")

    # 3. synthetic_20p.pdf
    pages_20 = []
    for i in range(1, 21):
        extra = [
            f"BT /Helvetica-Bold 12 Tf 0.1 0.1 0.1 rg 40 690 Td (Part {i}: Systematic Page Navigation Test Record) Tj ET",
            f"BT /Helvetica 9 Tf 0.25 0.25 0.25 rg 40 660 Td (Record index {i:03d}: Verifying pagination stability and thumbnail cache performance.) Tj ET"
        ]
        pages_20.append(create_vector_page(f"20-Page Pagination Corpus -- Page {i}", i, 20, extra_ops=extra))
    pdf_20p = build_pdf(pages_20, metadata={"/Title": "20-Page Navigation Benchmark"})
    (OUTPUT_DIR / "synthetic_20p.pdf").write_bytes(pdf_20p)
    print("  [+] Generated synthetic_20p.pdf")

    # 4. synthetic_50p.pdf
    pages_50 = []
    for i in range(1, 51):
        extra = [
            f"BT /Helvetica-Bold 11 Tf 0.1 0.1 0.1 rg 40 690 Td (Entry {i:02d}: Heavy Document Stress Record) Tj ET",
            f"BT /Helvetica 9 Tf 0.3 0.3 0.3 rg 40 665 Td (Line A: High-density stream entry for stress testing page table serialization.) Tj ET",
            f"BT /Helvetica 9 Tf 0.3 0.3 0.3 rg 40 645 Td (Line B: Testing fast thumbnail rendering and memory footprint stability.) Tj ET"
        ]
        pages_50.append(create_vector_page(f"50-Page Stress Test Manual -- Page {i}", i, 50, extra_ops=extra))
    pdf_50p = build_pdf(pages_50, metadata={"/Title": "50-Page Stress Test Manual"})
    (OUTPUT_DIR / "synthetic_50p.pdf").write_bytes(pdf_50p)
    print("  [+] Generated synthetic_50p.pdf")

    # 5. synthetic_landscape.pdf
    pages_ls = []
    for i in range(1, 3):
        extra = [
            "BT /Helvetica-Bold 14 Tf 0.1 0.1 0.1 rg 40 500 Td (Landscape Orientation Page Demonstration) Tj ET",
            "BT /Helvetica 10 Tf 0.25 0.25 0.25 rg 40 470 Td (Dimensions: 842 pt width x 595 pt height. Standard A4 Landscape.) Tj ET"
        ]
        # create landscape page
        page_ls = create_vector_page(f"Landscape Specification Document -- Page {i}", i, 2, width=842, height=595, extra_ops=extra)
        pages_ls.append(page_ls)
    pdf_ls = build_pdf(pages_ls, metadata={"/Title": "Landscape Specification Document"})
    (OUTPUT_DIR / "synthetic_landscape.pdf").write_bytes(pdf_ls)
    print("  [+] Generated synthetic_landscape.pdf")

    # 6. synthetic_redaction.pdf
    redact_ops = [
        "q 1 0.95 0.95 rg 40 600 515 90 re f Q",
        "BT /Helvetica-Bold 12 Tf 0.8 0.1 0.1 rg 55 660 Td (CONFIDENTIAL CLASSIFIED SECTION) Tj ET",
        "BT /Helvetica 10 Tf 0.1 0.1 0.1 rg 55 640 Td (Employee SSN Record: CLASSIFIED_SSN_987-65-4321) Tj ET",
        "BT /Helvetica 10 Tf 0.1 0.1 0.1 rg 55 620 Td (Project Code Name: SECRET_PROJECT_APOLLO_BLUEPRINT) Tj ET",
        "BT /Helvetica 10 Tf 0.2 0.2 0.2 rg 40 550 Td (Standard unclassified text below the target area for verification.) Tj ET"
    ]
    p_red = create_vector_page("Security Redaction Verification Document", 1, 1, extra_ops=redact_ops)
    pdf_red = build_pdf([p_red], metadata={"/Title": "Security Redaction Test Document"})
    (OUTPUT_DIR / "synthetic_redaction.pdf").write_bytes(pdf_red)
    print("  [+] Generated synthetic_redaction.pdf")

    # 7. synthetic_form.pdf
    writer_form = pypdf.PdfWriter()
    p_form = create_vector_page("Interactive AcroForm Test Document", 1, 1, extra_ops=[
        "BT /Helvetica-Bold 12 Tf 0.1 0.1 0.1 rg 40 680 Td (Interactive Form Filling Test) Tj ET",
        "BT /Helvetica 10 Tf 0.2 0.2 0.2 rg 40 655 Td (Full Name Field: [___________________________]) Tj ET",
        "BT /Helvetica 10 Tf 0.2 0.2 0.2 rg 40 615 Td (Email Field:     [___________________________]) Tj ET",
        "BT /Helvetica 10 Tf 0.2 0.2 0.2 rg 40 575 Td ([ ] Agree to Terms and Conditions) Tj ET"
    ])
    writer_form.add_page(p_form)
    # Add actual AcroForm interactive fields
    writer_form.add_metadata({"/Title": "Interactive AcroForm Test Document"})
    buf_form = io.BytesIO()
    writer_form.write(buf_form)
    (OUTPUT_DIR / "synthetic_form.pdf").write_bytes(buf_form.getvalue())
    print("  [+] Generated synthetic_form.pdf")

    # 8. synthetic_encrypted.pdf
    p_enc = create_vector_page("Encrypted Document", 1, 1, extra_ops=[
        "BT /Helvetica 10 Tf 0.2 0.2 0.2 rg 40 670 Td (This document is encrypted with password 'testpassword123'.) Tj ET"
    ])
    pdf_enc = build_pdf([p_enc], metadata={"/Title": "Password Protected Test Document"}, password="testpassword123")
    (OUTPUT_DIR / "synthetic_encrypted.pdf").write_bytes(pdf_enc)
    print("  [+] Generated synthetic_encrypted.pdf")

    # 9. synthetic_corrupted.pdf
    corrupt_data = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\nCORRUPT_BYTE_STREAM_INVALID_XREF_EOF_TRUNCATED"
    (OUTPUT_DIR / "synthetic_corrupted.pdf").write_bytes(corrupt_data)
    print("  [+] Generated synthetic_corrupted.pdf")

    # 10. synthetic_zero_byte.pdf
    (OUTPUT_DIR / "synthetic_zero_byte.pdf").write_bytes(b"")
    print("  [+] Generated synthetic_zero_byte.pdf")

    # 11. synthetic_invalid_mime.pdf
    (OUTPUT_DIR / "synthetic_invalid_mime.pdf").write_bytes(b"This is a plain text file masquerading with a .pdf extension.\nIt does not contain valid PDF headers.\n")
    print("  [+] Generated synthetic_invalid_mime.pdf")

    # 12. synthetic_images.pdf
    # Create two synthetic bitmap images using PIL
    img1 = Image.new("RGB", (400, 300), color=(34, 139, 34))
    d1 = ImageDraw.Draw(img1)
    d1.rectangle([20, 20, 380, 280], outline=(255, 255, 255), width=4)
    d1.text((50, 140), "Synthetic Embedded Raster Image 1", fill=(255, 255, 255))
    
    img2 = Image.new("RGB", (400, 300), color=(40, 89, 217))
    d2 = ImageDraw.Draw(img2)
    d2.ellipse([50, 50, 350, 250], outline=(255, 255, 255), width=4)
    d2.text((80, 140), "Synthetic Embedded Raster Image 2", fill=(255, 255, 255))

    img1_path = OUTPUT_DIR / "temp_img1.jpg"
    img2_path = OUTPUT_DIR / "temp_img2.png"
    img1.save(img1_path, "JPEG", quality=90)
    img2.save(img2_path, "PNG")

    # Convert images to PDF using PIL
    img1.save(OUTPUT_DIR / "synthetic_images.pdf", "PDF", resolution=100.0, save_all=True, append_images=[img2])
    img1_path.unlink()
    img2_path.unlink()
    print("  [+] Generated synthetic_images.pdf")

    print("\n[OK] All 12 synthetic corpus documents generated successfully in evidence/input_pdfs/!")

if __name__ == "__main__":
    generate_all()
