"""
Adversarial Packaged Application 29 Tools Suite
Tests all 29 PDF Studio tools directly against the extracted and running
v1.0.0 release at http://127.0.0.1:8001/api using synthetic corpus files.
"""

import sys
import os
import json
import io
import base64
import requests
import pypdf
from PIL import Image

BASE_URL = "http://127.0.0.1:8001/api"
CORPUS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "evidence", "input_pdfs"))
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "evidence", "adversarial_tests", "tool_outputs"))
os.makedirs(OUTPUT_DIR, exist_ok=True)

def upload_pdf(filename):
    filepath = os.path.join(CORPUS_DIR, filename)
    with open(filepath, "rb") as f:
        r = requests.post(f"{BASE_URL}/document/upload", files={"file": (filename, f, "application/pdf")})
    assert r.status_code == 200, f"Upload failed for {filename}: {r.text}"
    return r.json()["file_id"]

def download_pdf(file_id):
    r = requests.get(f"{BASE_URL}/document/{file_id}/download")
    assert r.status_code == 200, f"Download failed for {file_id}: {r.status_code}"
    return r.content

def create_sample_png_b64():
    img = Image.new("RGB", (200, 100), color=(73, 109, 137))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

def run_tests():
    results = {}
    print("=" * 80)
    print("RUNNING 29-TOOL ADVERSARIAL VALIDATION AGAINST PACKAGED RELEASE AT 127.0.0.1:8001")
    print("=" * 80)

    # 1. Reorder
    doc_id = upload_pdf("synthetic_5p.pdf")
    r = requests.post(f"{BASE_URL}/organise/reorder", json={"file_id": doc_id, "page_order": [5, 4, 3, 2, 1]})
    assert r.status_code == 200, f"Reorder failed: {r.text}"
    out_pdf = download_pdf(r.json()["file_id"])
    reader = pypdf.PdfReader(io.BytesIO(out_pdf))
    assert len(reader.pages) == 5
    results["Tool 01: Reorder Pages"] = {"status": "PASS", "pages": len(reader.pages)}
    print("[PASS] Tool 01: Reorder Pages")

    # 2. Rotate
    doc_id = upload_pdf("synthetic_5p.pdf")
    r = requests.post(f"{BASE_URL}/organise/rotate", json={"file_id": doc_id, "page_numbers": [1], "angle": 90})
    assert r.status_code == 200, f"Rotate failed: {r.text}"
    out_pdf = download_pdf(r.json()["file_id"])
    reader = pypdf.PdfReader(io.BytesIO(out_pdf))
    assert reader.pages[0].get("/Rotate") == 90
    results["Tool 02: Rotate Pages"] = {"status": "PASS", "rotation": 90}
    print("[PASS] Tool 02: Rotate Pages")

    # 3. Delete
    doc_id = upload_pdf("synthetic_5p.pdf")
    r = requests.post(f"{BASE_URL}/organise/delete", json={"file_id": doc_id, "page_numbers": [2, 4]})
    assert r.status_code == 200, f"Delete failed: {r.text}"
    out_pdf = download_pdf(r.json()["file_id"])
    reader = pypdf.PdfReader(io.BytesIO(out_pdf))
    assert len(reader.pages) == 3
    results["Tool 03: Delete Pages"] = {"status": "PASS", "pages": len(reader.pages)}
    print("[PASS] Tool 03: Delete Pages")

    # 4. Extract
    doc_id = upload_pdf("synthetic_5p.pdf")
    r = requests.post(f"{BASE_URL}/organise/extract", json={"file_id": doc_id, "page_numbers": [1, 3, 5]})
    assert r.status_code == 200, f"Extract failed: {r.text}"
    out_pdf = download_pdf(r.json()["file_id"])
    reader = pypdf.PdfReader(io.BytesIO(out_pdf))
    assert len(reader.pages) == 3
    results["Tool 04: Extract Pages"] = {"status": "PASS", "pages": len(reader.pages)}
    print("[PASS] Tool 04: Extract Pages")

    # 5. Insert Blank
    doc_id = upload_pdf("synthetic_1p.pdf")
    r = requests.post(f"{BASE_URL}/organise/insert-blank", json={"file_id": doc_id, "target_page": 1, "position": "after", "count": 1, "paper_size": "A4", "orientation": "portrait"})
    assert r.status_code == 200, f"Insert Blank failed: {r.text}"
    out_pdf = download_pdf(r.json()["file_id"])
    reader = pypdf.PdfReader(io.BytesIO(out_pdf))
    assert len(reader.pages) == 2
    results["Tool 05: Insert Blank Page"] = {"status": "PASS", "pages": len(reader.pages)}
    print("[PASS] Tool 05: Insert Blank Page")

    # 6. Duplicate
    doc_id = upload_pdf("synthetic_1p.pdf")
    r = requests.post(f"{BASE_URL}/organise/duplicate", json={"file_id": doc_id, "page_numbers": [1], "count": 1})
    assert r.status_code == 200, f"Duplicate failed: {r.text}"
    out_pdf = download_pdf(r.json()["file_id"])
    reader = pypdf.PdfReader(io.BytesIO(out_pdf))
    assert len(reader.pages) == 2
    results["Tool 06: Duplicate Pages"] = {"status": "PASS", "pages": len(reader.pages)}
    print("[PASS] Tool 06: Duplicate Pages")

    # 7. Split
    doc_id = upload_pdf("synthetic_5p.pdf")
    r = requests.post(f"{BASE_URL}/organise/split", json={"file_id": doc_id, "mode": "ranges", "ranges": ["1-2", "3-5"]})
    assert r.status_code == 200, f"Split failed: {r.text}"
    data = r.json()
    assert "output_documents" in data and len(data["output_documents"]) == 2
    results["Tool 07: Split PDF"] = {"status": "PASS", "parts_count": len(data["output_documents"])}
    print("[PASS] Tool 07: Split PDF")

    # 8. Merge
    doc1 = upload_pdf("synthetic_1p.pdf")
    doc2 = upload_pdf("synthetic_5p.pdf")
    r = requests.post(f"{BASE_URL}/organise/merge", json={"file_ids": [doc1, doc2], "output_filename": "merged.pdf"})
    assert r.status_code == 200, f"Merge failed: {r.text}"
    out_pdf = download_pdf(r.json()["file_id"])
    reader = pypdf.PdfReader(io.BytesIO(out_pdf))
    assert len(reader.pages) == 6
    results["Tool 08: Merge PDFs"] = {"status": "PASS", "pages": len(reader.pages)}
    print("[PASS] Tool 08: Merge PDFs")

    # 9. Crop (Module A Tool 9: Crop / Margin Adjust)
    doc_id = upload_pdf("synthetic_1p.pdf")
    r = requests.post(f"{BASE_URL}/organise/crop", json={"file_id": doc_id, "page_numbers": [1], "crop_box": {"left": 20, "bottom": 20, "right": 500, "top": 700}})
    assert r.status_code == 200, f"Crop failed: {r.text}"
    out_pdf = download_pdf(r.json()["file_id"])
    reader = pypdf.PdfReader(io.BytesIO(out_pdf))
    assert len(reader.pages) == 1
    results["Tool 09: Page Crop / Margins"] = {"status": "PASS", "pages": len(reader.pages)}
    print("[PASS] Tool 09: Page Crop / Margins")

    # 10. Add Text
    doc_id = upload_pdf("synthetic_1p.pdf")
    r = requests.post(f"{BASE_URL}/edit/{doc_id}/text", json={"id": "txt1", "page_number": 1, "text": "Adversarial Direct Placement", "x": 100, "y": 200, "font_size": 14, "color": "#1E40AF"})
    assert r.status_code == 200, f"Add Text failed: {r.text}"
    out_pdf = download_pdf(r.json()["file_id"])
    reader = pypdf.PdfReader(io.BytesIO(out_pdf))
    assert "Adversarial Direct Placement" in reader.pages[0].extract_text()
    results["Tool 10: Add Text"] = {"status": "PASS", "extracted": True}
    print("[PASS] Tool 10: Add Text")

    # 11. Add Image
    doc_id = upload_pdf("synthetic_1p.pdf")
    b64_png = create_sample_png_b64()
    r = requests.post(f"{BASE_URL}/edit/{doc_id}/image", json={"id": "img1", "page_number": 1, "image_base64": b64_png, "x": 100, "y": 100, "width": 150, "height": 75})
    assert r.status_code == 200, f"Add Image failed: {r.text}"
    results["Tool 11: Add Images"] = {"status": "PASS", "image_added": True}
    print("[PASS] Tool 11: Add Images")

    # 12. Highlight
    doc_id = upload_pdf("synthetic_1p.pdf")
    r = requests.post(f"{BASE_URL}/edit/{doc_id}/highlight", json={"id": "hl1", "page_number": 1, "rects": [{"x": 100, "y": 100, "width": 100, "height": 20}], "color": "#FACC15", "opacity": 0.4})
    assert r.status_code == 200, f"Highlight failed: {r.text}"
    results["Tool 12: Highlight"] = {"status": "PASS", "highlighted": True}
    print("[PASS] Tool 12: Highlight")

    # 13. Draw
    doc_id = upload_pdf("synthetic_1p.pdf")
    r = requests.post(f"{BASE_URL}/edit/{doc_id}/draw", json={"id": "drw1", "page_number": 1, "paths": [{"points": [{"x": 50, "y": 50}, {"x": 100, "y": 100}, {"x": 150, "y": 50}], "color": "#DC2626", "width": 3}]})
    assert r.status_code == 200, f"Draw failed: {r.text}"
    results["Tool 13: Draw"] = {"status": "PASS", "drawn": True}
    print("[PASS] Tool 13: Draw")

    # 14. Shapes
    doc_id = upload_pdf("synthetic_1p.pdf")
    r = requests.post(f"{BASE_URL}/edit/{doc_id}/shape", json={"id": "shp1", "page_number": 1, "shape_type": "rect", "x": 50, "y": 50, "width": 100, "height": 60, "stroke_color": "#16A34A", "fill_color": "#BBF7D0"})
    assert r.status_code == 200, f"Shapes failed: {r.text}"
    results["Tool 14: Shapes"] = {"status": "PASS", "shaped": True}
    print("[PASS] Tool 14: Shapes")

    # 15. Whiteout
    doc_id = upload_pdf("synthetic_1p.pdf")
    r = requests.post(f"{BASE_URL}/edit/{doc_id}/whiteout", json={"id": "wo1", "page_number": 1, "rects": [{"x": 100, "y": 100, "width": 200, "height": 100}]})
    assert r.status_code == 200, f"Whiteout failed: {r.text}"
    results["Tool 15: Whiteout"] = {"status": "PASS", "whited_out": True}
    print("[PASS] Tool 15: Whiteout")

    # 16. Redaction
    doc_id = upload_pdf("synthetic_redaction.pdf")
    r = requests.post(f"{BASE_URL}/edit/{doc_id}/redact", json={"id": "red1", "page_number": 1, "target_text": "CLASSIFIED_SSN_987-65-4321", "rects": [{"x": 30, "y": 60, "width": 470, "height": 140}], "fill_color": "#000000"})
    assert r.status_code == 200, f"Redact failed: {r.text}"
    out_pdf = download_pdf(r.json()["file_id"])
    reader = pypdf.PdfReader(io.BytesIO(out_pdf))
    text_content = reader.pages[0].extract_text()
    assert "CLASSIFIED_SSN_987-65-4321" not in text_content
    results["Tool 16: Secure Redaction"] = {"status": "PASS", "text_sanitized": True}
    print("[PASS] Tool 16: Secure Redaction")

    # 17. Digital Signatures
    doc_id = upload_pdf("synthetic_1p.pdf")
    r = requests.post(f"{BASE_URL}/edit/{doc_id}/signature", json={"id": "sig1", "page_number": 1, "signature_image_base64": b64_png, "x": 100, "y": 100, "width": 120, "height": 50, "signer_name": "Rohan Siddhpura", "include_timestamp": True})
    assert r.status_code == 200, f"Signature failed: {r.text}"
    results["Tool 17: Digital Signatures"] = {"status": "PASS", "signed": True}
    print("[PASS] Tool 17: Digital Signatures")

    # 18. Form Filling
    doc_id = upload_pdf("synthetic_form.pdf")
    r = requests.post(f"{BASE_URL}/edit/{doc_id}/form-fill", json={"field_values": {"full_name": "Antigravity Auditor"}, "flatten": False})
    assert r.status_code == 200, f"Form fill failed: {r.text}"
    out_pdf = download_pdf(r.json()["file_id"])
    reader = pypdf.PdfReader(io.BytesIO(out_pdf))
    results["Tool 18: Form Filling"] = {"status": "PASS", "fields_present": bool(reader.get_fields())}
    print("[PASS] Tool 18: Form Filling")

    # 19. Watermark
    doc_id = upload_pdf("synthetic_1p.pdf")
    r = requests.post(f"{BASE_URL}/stamp/watermark", json={"file_id": doc_id, "watermark_type": "text", "text": "CONFIDENTIAL BSERC", "opacity": 0.25, "rotation": 45, "font_size": 40})
    assert r.status_code == 200, f"Watermark failed: {r.text}"
    results["Tool 19: Watermarks"] = {"status": "PASS", "stamped": True}
    print("[PASS] Tool 19: Watermarks")

    # 20. Page Numbers
    doc_id = upload_pdf("synthetic_5p.pdf")
    r = requests.post(f"{BASE_URL}/stamp/page-numbers", json={"file_id": doc_id, "position": "bottom-center", "format": "arabic", "prefix": "Page "})
    assert r.status_code == 200, f"Page Numbers failed: {r.text}"
    results["Tool 20: Page Numbers"] = {"status": "PASS", "numbered": True}
    print("[PASS] Tool 20: Page Numbers")

    # 21. Header & Footer
    doc_id = upload_pdf("synthetic_1p.pdf")
    r = requests.post(f"{BASE_URL}/stamp/header-footer", json={"file_id": doc_id, "header_left": "BSERC GenAI", "footer_right": "Internal Audit"})
    assert r.status_code == 200, f"Header/Footer failed: {r.text}"
    results["Tool 21: Headers and Footers"] = {"status": "PASS", "headers_added": True}
    print("[PASS] Tool 21: Headers and Footers")

    # 22. Date Stamp
    doc_id = upload_pdf("synthetic_1p.pdf")
    r = requests.post(f"{BASE_URL}/stamp/date", json={"file_id": doc_id, "position": "top-right", "format": "YYYY-MM-DD"})
    assert r.status_code == 200, f"Date Stamp failed: {r.text}"
    results["Tool 22: Date Stamps"] = {"status": "PASS", "date_stamped": True}
    print("[PASS] Tool 22: Date Stamps")

    # 23. Images to PDF
    r = requests.post(f"{BASE_URL}/convert/images-to-pdf", json={"images": [{"image_base64": b64_png, "name": "img1.png"}, {"image_base64": b64_png, "name": "img2.png"}], "page_size": "A4", "orientation": "portrait"})
    assert r.status_code == 200, f"Images to PDF failed: {r.text}"
    out_pdf = download_pdf(r.json()["file_id"])
    reader = pypdf.PdfReader(io.BytesIO(out_pdf))
    assert len(reader.pages) == 2
    results["Tool 23: Images to PDF"] = {"status": "PASS", "pages": len(reader.pages)}
    print("[PASS] Tool 23: Images to PDF")

    # 24. PDF to Images
    doc_id = upload_pdf("synthetic_5p.pdf")
    r = requests.post(f"{BASE_URL}/convert/pdf-to-images", json={"file_id": doc_id, "format": "png", "dpi": 72})
    assert r.status_code == 200, f"PDF to Images failed: {r.text}"
    data = r.json()
    assert "images" in data and len(data["images"]) == 5
    results["Tool 24: PDF to Images"] = {"status": "PASS", "images_generated": len(data["images"])}
    print("[PASS] Tool 24: PDF to Images")

    # 25. PDF to Text
    doc_id = upload_pdf("synthetic_1p.pdf")
    r = requests.post(f"{BASE_URL}/convert/pdf-to-text", json={"file_id": doc_id, "extraction_mode": "plain"})
    assert r.status_code == 200, f"PDF to Text failed: {r.text}"
    assert "full_text" in r.json() and len(r.json()["full_text"]) > 0
    results["Tool 25: PDF to Text"] = {"status": "PASS", "chars_extracted": len(r.json()["full_text"])}
    print("[PASS] Tool 25: PDF to Text")

    # 26. Compress
    doc_id = upload_pdf("synthetic_images.pdf")
    orig_size = os.path.getsize(os.path.join(CORPUS_DIR, "synthetic_images.pdf"))
    r = requests.post(f"{BASE_URL}/finish/compress", json={"file_id": doc_id, "preset": "balanced", "jpeg_quality": 60})
    assert r.status_code == 200, f"Compress failed: {r.text}"
    comp_data = r.json()
    compressed_size = comp_data.get("compressed_size_bytes", 0)
    assert compressed_size < orig_size
    results["Tool 26: PDF Compression"] = {"status": "PASS", "orig_size": orig_size, "compressed_size": compressed_size, "reduction": f"{comp_data.get('percent_reduction', 0)}%"}
    print(f"[PASS] Tool 26: PDF Compression ({orig_size} -> {compressed_size} bytes, -{comp_data.get('percent_reduction', 0)}%)")

    # 27. Edit Metadata
    doc_id = upload_pdf("synthetic_1p.pdf")
    r = requests.post(f"{BASE_URL}/finish/metadata/edit", json={"file_id": doc_id, "metadata": {"title": "Adversarial Report Title", "author": "Lead QA Auditor"}})
    assert r.status_code == 200, f"Edit Metadata failed: {r.text}"
    out_pdf = download_pdf(r.json()["file_id"])
    reader = pypdf.PdfReader(io.BytesIO(out_pdf))
    assert reader.metadata.get("/Title") == "Adversarial Report Title"
    results["Tool 27: Edit PDF Metadata"] = {"status": "PASS", "title": reader.metadata.get("/Title")}
    print("[PASS] Tool 27: Edit PDF Metadata")

    # 28. Remove Metadata / Sanitize
    doc_id = upload_pdf("synthetic_50p.pdf")
    r = requests.post(f"{BASE_URL}/finish/metadata/remove", json={"file_id": doc_id, "mode": "deep", "remove_xmp": True})
    assert r.status_code == 200, f"Sanitize failed: {r.text}"
    new_doc_id = r.json()["document"]["file_id"]
    out_pdf = download_pdf(new_doc_id)
    reader = pypdf.PdfReader(io.BytesIO(out_pdf))
    info = reader.metadata
    assert not info or (not info.get("/Title") and not info.get("/Author"))
    results["Tool 28: Remove PDF Metadata"] = {"status": "PASS", "purged": True}
    print("[PASS] Tool 28: Remove PDF Metadata")

    # 29. Compare PDFs
    doc1 = upload_pdf("synthetic_1p.pdf")
    doc2 = upload_pdf("synthetic_5p.pdf")
    r = requests.post(f"{BASE_URL}/finish/compare", json={"original_file_id": doc1, "revised_file_id": doc2, "mode": "text"})
    assert r.status_code == 200, f"Compare failed: {r.text}"
    comp_data = r.json()
    assert "summary" in comp_data or "differences" in comp_data or "page_count_a" in comp_data
    results["Tool 29: Compare PDFs"] = {"status": "PASS", "compared": True}
    print("[PASS] Tool 29: Compare PDFs")

    print("=" * 80)
    print("ALL 29 TOOLS EXECUTED SUCCESSFULLY AGAINST THE PACKAGED APPLICATION RELEASE")
    print("=" * 80)

    with open(os.path.join(OUTPUT_DIR, "packaged_29_tools_results.json"), "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run_tests()
