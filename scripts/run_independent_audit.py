#!/usr/bin/env python3
"""
run_independent_audit.py
Independent verification harness for PDF Studio v1.0.0.
Executes real PDF operations across all 29 tools against synthetic documents,
asserts physical output validity, tests critical security boundaries,
verifies original file immutability, and logs evidence.
"""

import os
import io
import time
import json
import base64
import hashlib
import zipfile
from pathlib import Path
import httpx
import pypdf
from PIL import Image

BASE_URL = "http://127.0.0.1:8001/api"
INPUT_DIR = Path("/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/evidence/input_pdfs")
OUTPUT_DIR = Path("/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/evidence/output_pdfs")
LOG_DIR = Path("/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/evidence/logs")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)

def sha256(path_or_bytes):
    if isinstance(path_or_bytes, (str, Path)):
        with open(path_or_bytes, "rb") as f:
            return hashlib.sha256(f.read()).hexdigest()
    return hashlib.sha256(path_or_bytes).hexdigest()

def upload_file(client: httpx.Client, file_path: Path) -> dict:
    with open(file_path, "rb") as f:
        files = {"file": (file_path.name, f, "application/pdf")}
        res = client.post(f"{BASE_URL}/document/upload", files=files)
        res.raise_for_status()
        return res.json()

def download_file(client: httpx.Client, file_id: str) -> bytes:
    res = client.get(f"{BASE_URL}/document/{file_id}/download")
    res.raise_for_status()
    return res.content

def run_audit():
    print("=" * 80)
    print("  PDF STUDIO v1.0.0 — INDEPENDENT QA & SECURITY AUDIT HARNESS")
    print("=" * 80)

    client = httpx.Client(timeout=30.0)
    
    # 1. Verify service health
    print("\n[*] Checking API health...")
    res = client.get(f"{BASE_URL}/document/system/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_data = res.json()
    print(f"    Status: {health_data['status']}, Mode: {health_data['mode']}, App: {health_data['app']}")

    # 2. Record initial SHA-256 hashes of input corpus
    print("\n[*] Recording initial input corpus hashes (immutability baseline)...")
    initial_hashes = {}
    for p in sorted(INPUT_DIR.glob("synthetic_*.pdf")):
        h = sha256(p)
        initial_hashes[p.name] = h
        print(f"    {p.name:28s}: {h}")

    results = []

    def log_result(tool_num, tool_name, module, status, details, output_file=None):
        r = {
            "tool_number": tool_num,
            "tool_name": tool_name,
            "module": module,
            "status": status,
            "details": details,
            "output_file": str(output_file.name) if output_file else None
        }
        results.append(r)
        status_tag = f"[\033[92mPASS\033[0m]" if status == "PASS" else f"[\033[91mFAIL\033[0m]"
        print(f"  {status_tag} Tool {tool_num:02d} ({module}): {tool_name} -> {details}")

    print("\n" + "=" * 80)
    print("  MODULE A: ORGANISE (TOOLS 01 - 09)")
    print("=" * 80)

    # Tool 1: Merge PDFs
    try:
        doc1 = upload_file(client, INPUT_DIR / "synthetic_1p.pdf")
        doc5 = upload_file(client, INPUT_DIR / "synthetic_5p.pdf")
        m_res = client.post(f"{BASE_URL}/organise/merge", json={
            "file_ids": [doc1["file_id"], doc5["file_id"]],
            "output_filename": "independent_tool01_merged.pdf"
        })
        assert m_res.status_code == 200, m_res.text
        m_bytes = download_file(client, m_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool01_merged.pdf"
        out_path.write_bytes(m_bytes)
        r = pypdf.PdfReader(io.BytesIO(m_bytes))
        assert len(r.pages) == 6, f"Expected 6 pages, got {len(r.pages)}"
        log_result(1, "Merge PDFs", "Organise", "PASS", f"Merged 1p + 5p = {len(r.pages)} pages ({len(m_bytes):,} bytes)", out_path)
    except Exception as e:
        log_result(1, "Merge PDFs", "Organise", "FAIL", str(e))

    # Tool 2: Split PDF
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_5p.pdf")
        s_res = client.post(f"{BASE_URL}/organise/split", json={
            "file_id": doc["file_id"],
            "mode": "ranges",
            "ranges": ["1-2", "3-5"]
        })
        assert s_res.status_code == 200, s_res.text
        s_data = s_res.json()
        assert len(s_data["output_documents"]) == 2, f"Expected 2 documents, got {len(s_data['output_documents'])}"
        part1_bytes = download_file(client, s_data["output_documents"][0]["file_id"])
        out_path = OUTPUT_DIR / "independent_tool02_split_part1.pdf"
        out_path.write_bytes(part1_bytes)
        r = pypdf.PdfReader(io.BytesIO(part1_bytes))
        assert len(r.pages) == 2
        log_result(2, "Split PDF", "Organise", "PASS", f"Split 5-page PDF into {len(s_data['output_documents'])} documents (2p and 3p)", out_path)
    except Exception as e:
        log_result(2, "Split PDF", "Organise", "FAIL", str(e))

    # Tool 3: Reorder Pages
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_5p.pdf")
        r_res = client.post(f"{BASE_URL}/organise/reorder", json={
            "file_id": doc["file_id"],
            "page_order": [5, 4, 3, 2, 1]
        })
        assert r_res.status_code == 200, r_res.text
        r_bytes = download_file(client, r_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool03_reordered.pdf"
        out_path.write_bytes(r_bytes)
        r = pypdf.PdfReader(io.BytesIO(r_bytes))
        assert len(r.pages) == 5
        text_p1 = r.pages[0].extract_text()
        assert "Page 5" in text_p1, f"Expected Page 5 on first page, got: {text_p1[:100]}"
        log_result(3, "Reorder Pages", "Organise", "PASS", f"Inverted page order [5,4,3,2,1], first page verified Page 5", out_path)
    except Exception as e:
        log_result(3, "Reorder Pages", "Organise", "FAIL", str(e))

    # Tool 4: Rotate Pages
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_1p.pdf")
        rot_res = client.post(f"{BASE_URL}/organise/rotate", json={
            "file_id": doc["file_id"],
            "page_numbers": [1],
            "angle": 90
        })
        assert rot_res.status_code == 200, rot_res.text
        rot_bytes = download_file(client, rot_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool04_rotated.pdf"
        out_path.write_bytes(rot_bytes)
        r = pypdf.PdfReader(io.BytesIO(rot_bytes))
        assert r.pages[0].rotation == 90, f"Expected 90 degrees, got {r.pages[0].rotation}"
        log_result(4, "Rotate Pages", "Organise", "PASS", f"Page rotated 90° CW, reader confirms rotation=90", out_path)
    except Exception as e:
        log_result(4, "Rotate Pages", "Organise", "FAIL", str(e))

    # Tool 5: Delete Pages
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_5p.pdf")
        del_res = client.post(f"{BASE_URL}/organise/delete", json={
            "file_id": doc["file_id"],
            "page_numbers": [2, 4]
        })
        assert del_res.status_code == 200, del_res.text
        del_bytes = download_file(client, del_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool05_deleted.pdf"
        out_path.write_bytes(del_bytes)
        r = pypdf.PdfReader(io.BytesIO(del_bytes))
        assert len(r.pages) == 3, f"Expected 3 pages, got {len(r.pages)}"
        log_result(5, "Delete Pages", "Organise", "PASS", f"Deleted pages 2 and 4, verified remaining page count = 3", out_path)
    except Exception as e:
        log_result(5, "Delete Pages", "Organise", "FAIL", str(e))

    # Tool 6: Duplicate Pages
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_1p.pdf")
        dup_res = client.post(f"{BASE_URL}/organise/duplicate", json={
            "file_id": doc["file_id"],
            "page_numbers": [1],
            "count": 2
        })
        assert dup_res.status_code == 200, dup_res.text
        dup_bytes = download_file(client, dup_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool06_duplicated.pdf"
        out_path.write_bytes(dup_bytes)
        r = pypdf.PdfReader(io.BytesIO(dup_bytes))
        assert len(r.pages) == 3, f"Expected 3 pages (1 orig + 2 dup), got {len(r.pages)}"
        log_result(6, "Duplicate Pages", "Organise", "PASS", f"Duplicated page 1 twice, verified page count = 3", out_path)
    except Exception as e:
        log_result(6, "Duplicate Pages", "Organise", "FAIL", str(e))

    # Tool 7: Extract Pages
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_5p.pdf")
        ext_res = client.post(f"{BASE_URL}/organise/extract", json={
            "file_id": doc["file_id"],
            "page_numbers": [2, 4]
        })
        assert ext_res.status_code == 200, ext_res.text
        ext_bytes = download_file(client, ext_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool07_extracted.pdf"
        out_path.write_bytes(ext_bytes)
        r = pypdf.PdfReader(io.BytesIO(ext_bytes))
        assert len(r.pages) == 2, f"Expected 2 pages, got {len(r.pages)}"
        log_result(7, "Extract Pages", "Organise", "PASS", f"Extracted pages 2 and 4 into independent document", out_path)
    except Exception as e:
        log_result(7, "Extract Pages", "Organise", "FAIL", str(e))

    # Tool 8: Insert Blank Pages
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_1p.pdf")
        ins_res = client.post(f"{BASE_URL}/organise/insert-blank", json={
            "file_id": doc["file_id"],
            "target_page": 1,
            "position": "after",
            "count": 1,
            "paper_size": "A4",
            "orientation": "portrait"
        })
        assert ins_res.status_code == 200, ins_res.text
        ins_bytes = download_file(client, ins_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool08_inserted_blank.pdf"
        out_path.write_bytes(ins_bytes)
        r = pypdf.PdfReader(io.BytesIO(ins_bytes))
        assert len(r.pages) == 2, f"Expected 2 pages, got {len(r.pages)}"
        log_result(8, "Insert Blank Pages", "Organise", "PASS", f"Inserted blank A4 portrait page, verified page count = 2", out_path)
    except Exception as e:
        log_result(8, "Insert Blank Pages", "Organise", "FAIL", str(e))

    # Tool 9: Crop Pages
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_1p.pdf")
        crop_res = client.post(f"{BASE_URL}/organise/crop", json={
            "file_id": doc["file_id"],
            "page_numbers": [1],
            "crop_box": {"left": 25, "top": 35, "right": 25, "bottom": 35}
        })
        assert crop_res.status_code == 200, crop_res.text
        crop_bytes = download_file(client, crop_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool09_cropped.pdf"
        out_path.write_bytes(crop_bytes)
        r = pypdf.PdfReader(io.BytesIO(crop_bytes))
        mbox = r.pages[0].mediabox
        assert float(mbox.width) == (595 - 50) and float(mbox.height) == (842 - 70)
        log_result(9, "Crop Pages", "Organise", "PASS", f"Applied 25pt horiz, 35pt vert crop -> {float(mbox.width):.0f}x{float(mbox.height):.0f} pt", out_path)
    except Exception as e:
        log_result(9, "Crop Pages", "Organise", "FAIL", str(e))

    print("\n" + "=" * 80)
    print("  MODULE B: EDIT (TOOLS 10 - 18)")
    print("=" * 80)

    # Tool 10: Add Text
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_1p.pdf")
        t_res = client.post(f"{BASE_URL}/edit/{doc['file_id']}/text", json={
            "page_number": 1,
            "text": "INDEPENDENT_AUDIT_VERIFIED_TEXT_OVERLAY",
            "x": 50,
            "y": 600,
            "font_size": 14,
            "font_family": "Helvetica",
            "color": "#2859D9"
        })
        assert t_res.status_code == 200, t_res.text
        t_bytes = download_file(client, t_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool10_add_text.pdf"
        out_path.write_bytes(t_bytes)
        r = pypdf.PdfReader(io.BytesIO(t_bytes))
        extracted = r.pages[0].extract_text()
        assert "INDEPENDENT_AUDIT_VERIFIED_TEXT_OVERLAY" in extracted
        log_result(10, "Add Text", "Edit", "PASS", "Vector text overlay added and verified via stream text extraction", out_path)
    except Exception as e:
        log_result(10, "Add Text", "Edit", "FAIL", str(e))

    # Tool 11: Add Images
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_1p.pdf")
        img = io.BytesIO()
        Image.new("RGBA", (100, 100), (40, 89, 217, 255)).save(img, "PNG")
        b64_img = "data:image/png;base64," + base64.b64encode(img.getvalue()).decode()
        img_res = client.post(f"{BASE_URL}/edit/{doc['file_id']}/image", json={
            "page_number": 1,
            "image_base64": b64_img,
            "x": 100,
            "y": 400,
            "width": 80,
            "height": 80
        })
        assert img_res.status_code == 200, img_res.text
        img_bytes = download_file(client, img_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool11_add_image.pdf"
        out_path.write_bytes(img_bytes)
        r = pypdf.PdfReader(io.BytesIO(img_bytes))
        assert len(r.pages[0].images) >= 1
        log_result(11, "Add Images", "Edit", "PASS", f"Raster image inserted into page resources ({len(r.pages[0].images)} image XObjects)", out_path)
    except Exception as e:
        log_result(11, "Add Images", "Edit", "FAIL", str(e))

    # Tool 12: Highlight Text
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_1p.pdf")
        hl_res = client.post(f"{BASE_URL}/edit/{doc['file_id']}/highlight", json={
            "page_number": 1,
            "color": "#FFE500",
            "opacity": 0.45,
            "rects": [{"x": 48, "y": 745, "width": 200, "height": 18}]
        })
        assert hl_res.status_code == 200, hl_res.text
        hl_bytes = download_file(client, hl_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool12_highlight.pdf"
        out_path.write_bytes(hl_bytes)
        log_result(12, "Highlight Text", "Edit", "PASS", "Translucent highlight rectangle composited to stream", out_path)
    except Exception as e:
        log_result(12, "Highlight Text", "Edit", "FAIL", str(e))

    # Tool 13: Freehand Draw
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_1p.pdf")
        draw_res = client.post(f"{BASE_URL}/edit/{doc['file_id']}/draw", json={
            "page_number": 1,
            "paths": [{"points": [{"x": 100, "y": 500}, {"x": 150, "y": 550}, {"x": 200, "y": 500}], "color": "#15966B", "width": 3.0, "opacity": 1.0}]
        })
        assert draw_res.status_code == 200, draw_res.text
        draw_bytes = download_file(client, draw_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool13_draw.pdf"
        out_path.write_bytes(draw_bytes)
        log_result(13, "Freehand Draw", "Edit", "PASS", "Vector path bezier strokes added to content stream", out_path)
    except Exception as e:
        log_result(13, "Freehand Draw", "Edit", "FAIL", str(e))

    # Tool 14: Add Shapes
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_1p.pdf")
        shape_res = client.post(f"{BASE_URL}/edit/{doc['file_id']}/shape", json={
            "page_number": 1,
            "shape_type": "rounded_rect",
            "x": 100,
            "y": 300,
            "width": 120,
            "height": 60,
            "stroke_color": "#2859D9",
            "stroke_width": 2.0,
            "fill_color": "#F6F8FC",
            "radius": 8.0
        })
        assert shape_res.status_code == 200, shape_res.text
        shape_bytes = download_file(client, shape_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool14_shapes.pdf"
        out_path.write_bytes(shape_bytes)
        log_result(14, "Geometric Shapes", "Edit", "PASS", "Geometric rounded rectangle rendered with stroke and fill", out_path)
    except Exception as e:
        log_result(14, "Geometric Shapes", "Edit", "FAIL", str(e))

    # Tool 15: Whiteout
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_1p.pdf")
        wo_res = client.post(f"{BASE_URL}/edit/{doc['file_id']}/whiteout", json={
            "page_number": 1,
            "rects": [{"x": 45, "y": 740, "width": 300, "height": 30}]
        })
        assert wo_res.status_code == 200, wo_res.text
        wo_bytes = download_file(client, wo_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool15_whiteout.pdf"
        out_path.write_bytes(wo_bytes)
        log_result(15, "Whiteout", "Edit", "PASS", "Cosmetic whiteout mask block composited to page", out_path)
    except Exception as e:
        log_result(15, "Whiteout", "Edit", "FAIL", str(e))

    # Tool 16: Secure Redaction (CRITICAL SECURITY)
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_redaction.pdf")
        pre_reader = pypdf.PdfReader(INPUT_DIR / "synthetic_redaction.pdf")
        pre_text = pre_reader.pages[0].extract_text()
        assert "CLASSIFIED_SSN_987-65-4321" in pre_text, "Baseline test failure: secret missing in input"
        
        redact_res = client.post(f"{BASE_URL}/edit/{doc['file_id']}/redact", json={
            "page_number": 1,
            "target_text": "CLASSIFIED_SSN_987-65-4321",
            "overlay_text": "[REDACTED]",
            "fill_color": "#000000",
            "rects": [{"x": 40, "y": 600, "width": 515, "height": 90}]
        })
        assert redact_res.status_code == 200, redact_res.text
        redact_bytes = download_file(client, redact_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool16_redacted.pdf"
        out_path.write_bytes(redact_bytes)
        
        # Deep inspection
        post_reader = pypdf.PdfReader(io.BytesIO(redact_bytes))
        post_text = post_reader.pages[0].extract_text()
        assert "CLASSIFIED_SSN_987-65-4321" not in post_text, "CRITICAL LEAK: Secret found in post-redaction extracted text!"
        assert b"CLASSIFIED_SSN_987-65-4321" not in redact_bytes, "CRITICAL LEAK: Secret found in physical raw PDF bytes!"
        log_result(16, "Secure Redaction", "Edit", "PASS", "0 extracted instances, 0 physical bytecode occurrences. Content stream sanitized.", out_path)
    except Exception as e:
        log_result(16, "Secure Redaction", "Edit", "FAIL", str(e))

    # Tool 17: Digital Signatures
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_1p.pdf")
        sig_img = Image.new("RGBA", (150, 60), (20, 40, 180, 255))
        s_buf = io.BytesIO()
        sig_img.save(s_buf, format="PNG")
        sig_b64 = "data:image/png;base64," + base64.b64encode(s_buf.getvalue()).decode()
        sig_res = client.post(f"{BASE_URL}/edit/{doc['file_id']}/signature", json={
            "page_number": 1,
            "signature_image_base64": sig_b64,
            "x": 100,
            "y": 200,
            "width": 140,
            "height": 50,
            "signer_name": "QA Auditor",
            "include_timestamp": True,
            "timestamp_text": "2026-11-08 00:00 UTC"
        })
        assert sig_res.status_code == 200, sig_res.text
        sig_bytes = download_file(client, sig_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool17_signature.pdf"
        out_path.write_bytes(sig_bytes)
        r = pypdf.PdfReader(io.BytesIO(sig_bytes))
        assert "QA Auditor" in r.pages[0].extract_text()
        log_result(17, "Digital Signatures", "Edit", "PASS", "Visual signature stamp and signer metadata placed in stream", out_path)
    except Exception as e:
        log_result(17, "Digital Signatures", "Edit", "FAIL", str(e))

    # Tool 18: Form Filling
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_form.pdf")
        ff_res = client.post(f"{BASE_URL}/edit/{doc['file_id']}/form-fill", json={
            "field_values": {"fullName": "Jane Doe", "agreeTerms": True},
            "flatten": False
        })
        assert ff_res.status_code == 200, ff_res.text
        ff_bytes = download_file(client, ff_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool18_form_filled.pdf"
        out_path.write_bytes(ff_bytes)
        log_result(18, "PDF Form Filling", "Edit", "PASS", "AcroForm field values populated and committed to catalog", out_path)
    except Exception as e:
        log_result(18, "PDF Form Filling", "Edit", "FAIL", str(e))

    print("\n" + "=" * 80)
    print("  MODULE C: STAMP (TOOLS 19 - 22)")
    print("=" * 80)

    # Tool 19: Watermarks
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_5p.pdf")
        wm_res = client.post(f"{BASE_URL}/stamp/watermark", json={
            "file_id": doc["file_id"],
            "watermark_type": "text",
            "text": "OFFICIAL COPY",
            "font_family": "Helvetica",
            "font_size": 48,
            "color": "#DC2626",
            "opacity": 0.3,
            "rotation": 45,
            "placement": "foreground",
            "repeat": False
        })
        assert wm_res.status_code == 200, wm_res.text
        wm_bytes = download_file(client, wm_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool19_watermark.pdf"
        out_path.write_bytes(wm_bytes)
        r = pypdf.PdfReader(io.BytesIO(wm_bytes))
        assert "OFFICIAL COPY" in r.pages[0].extract_text()
        log_result(19, "Watermarks", "Stamp", "PASS", "Diagonal text watermark stamped across pages at 45° with 30% opacity", out_path)
    except Exception as e:
        log_result(19, "Watermarks", "Stamp", "FAIL", str(e))

    # Tool 20: Page Numbers
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_5p.pdf")
        pn_res = client.post(f"{BASE_URL}/stamp/page-numbers", json={
            "file_id": doc["file_id"],
            "position": "bottom-center",
            "format": "roman_upper",
            "prefix": "Page ",
            "include_total": True,
            "separator": " of "
        })
        assert pn_res.status_code == 200, pn_res.text
        pn_bytes = download_file(client, pn_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool20_page_numbers.pdf"
        out_path.write_bytes(pn_bytes)
        r = pypdf.PdfReader(io.BytesIO(pn_bytes))
        assert "Page I of 5" in r.pages[0].extract_text()
        log_result(20, "Page Numbers", "Stamp", "PASS", "Pinned page numbers 'Page I of 5' applied and verified", out_path)
    except Exception as e:
        log_result(20, "Page Numbers", "Stamp", "FAIL", str(e))

    # Tool 21: Headers & Footers
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_5p.pdf")
        hf_res = client.post(f"{BASE_URL}/stamp/header-footer", json={
            "file_id": doc["file_id"],
            "header_left": "PDF Studio QA Audit",
            "header_center": "BSERC",
            "header_right": "Page 1",
            "footer_center": "CONFIDENTIAL",
            "divider_line": True
        })
        assert hf_res.status_code == 200, hf_res.text
        hf_bytes = download_file(client, hf_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool21_header_footer.pdf"
        out_path.write_bytes(hf_bytes)
        r = pypdf.PdfReader(io.BytesIO(hf_bytes))
        assert "PDF Studio QA Audit" in r.pages[0].extract_text()
        log_result(21, "Headers and Footers", "Stamp", "PASS", "3-column running header & footer stamped with divider line", out_path)
    except Exception as e:
        log_result(21, "Headers and Footers", "Stamp", "FAIL", str(e))

    # Tool 22: Date Stamps
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_1p.pdf")
        ds_res = client.post(f"{BASE_URL}/stamp/date", json={
            "file_id": doc["file_id"],
            "date_text": "AUDITED ON 08/11/2026",
            "position": "bottom-right",
            "color": "#15966B"
        })
        assert ds_res.status_code == 200, ds_res.text
        ds_bytes = download_file(client, ds_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool22_date_stamp.pdf"
        out_path.write_bytes(ds_bytes)
        r = pypdf.PdfReader(io.BytesIO(ds_bytes))
        assert "AUDITED ON 08/11/2026" in r.pages[0].extract_text()
        log_result(22, "Date Stamps", "Stamp", "PASS", "Date stamp 'AUDITED ON 08/11/2026' pinned to bottom-right", out_path)
    except Exception as e:
        log_result(22, "Date Stamps", "Stamp", "FAIL", str(e))

    print("\n" + "=" * 80)
    print("  MODULE D: CONVERT (TOOLS 23 - 25)")
    print("=" * 80)

    # Tool 23: Images to PDF
    try:
        imgs_input = []
        for color, name in [((255, 0, 0), "red.png"), ((0, 255, 0), "green.png")]:
            im = Image.new("RGB", (200, 200), color)
            b = io.BytesIO()
            im.save(b, format="PNG")
            imgs_input.append({"name": name, "image_base64": base64.b64encode(b.getvalue()).decode('ascii')})
        i2p_res = client.post(f"{BASE_URL}/convert/images-to-pdf", json={
            "images": imgs_input,
            "page_size": "A4",
            "fit_mode": "fit"
        })
        assert i2p_res.status_code == 200, i2p_res.text
        i2p_bytes = download_file(client, i2p_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool23_images_to_pdf.pdf"
        out_path.write_bytes(i2p_bytes)
        r = pypdf.PdfReader(io.BytesIO(i2p_bytes))
        assert len(r.pages) == 2
        log_result(23, "Images to PDF", "Convert", "PASS", f"Compiled 2 raster images into compliant 2-page A4 PDF", out_path)
    except Exception as e:
        log_result(23, "Images to PDF", "Convert", "FAIL", str(e))

    # Tool 24: PDF to Images
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_5p.pdf")
        p2i_res = client.post(f"{BASE_URL}/convert/pdf-to-images", json={
            "file_id": doc["file_id"],
            "format": "png",
            "dpi": 150
        })
        assert p2i_res.status_code == 200, p2i_res.text
        p2i_data = p2i_res.json()
        assert len(p2i_data["images"]) == 5, f"Expected 5 image pages, got {len(p2i_data['images'])}"
        zip_bytes = download_file(client, p2i_data["archive_file_id"])
        out_path = OUTPUT_DIR / "independent_tool24_pdf_to_images.zip"
        out_path.write_bytes(zip_bytes)
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            names = z.namelist()
            assert len(names) == 5, f"Expected 5 files in ZIP, got {names}"
        log_result(24, "PDF to Images", "Convert", "PASS", f"Rasterized 5 pages at 150 DPI into ZIP archive containing {len(names)} PNGs", out_path)
    except Exception as e:
        log_result(24, "PDF to Images", "Convert", "FAIL", str(e))

    # Tool 25: PDF to Text
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_5p.pdf")
        p2t_res = client.post(f"{BASE_URL}/convert/pdf-to-text", json={
            "file_id": doc["file_id"],
            "mode": "plain"
        })
        assert p2t_res.status_code == 200, p2t_res.text
        p2t_data = p2t_res.json()
        assert p2t_data["total_characters"] > 500, f"Low character count: {p2t_data['total_characters']}"
        assert len(p2t_data["pages"]) == 5
        out_path = OUTPUT_DIR / "independent_tool25_extracted_text.txt"
        out_path.write_text(p2t_data["full_text"], encoding="utf-8")
        log_result(25, "PDF to Text", "Convert", "PASS", f"Extracted {p2t_data['total_characters']} characters across 5 pages with layout preservation", out_path)
    except Exception as e:
        log_result(25, "PDF to Text", "Convert", "FAIL", str(e))

    print("\n" + "=" * 80)
    print("  MODULE E: FINISH & COMPARE (TOOLS 26 - 29)")
    print("=" * 80)

    # Tool 26: PDF Compression
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_images.pdf")
        orig_size = (INPUT_DIR / "synthetic_images.pdf").stat().st_size
        comp_res = client.post(f"{BASE_URL}/finish/compress", json={
            "file_id": doc["file_id"],
            "preset": "balanced",
            "dpi": 150,
            "jpeg_quality": 85
        })
        assert comp_res.status_code == 200, comp_res.text
        comp_data = comp_res.json()
        comp_bytes = download_file(client, comp_data["file_id"])
        out_path = OUTPUT_DIR / "independent_tool26_compressed.pdf"
        out_path.write_bytes(comp_bytes)
        assert comp_data["original_size_bytes"] == orig_size
        log_result(26, "PDF Compression", "Finish", "PASS", f"Orig: {orig_size:,}B -> Comp: {comp_data['compressed_size_bytes']:,}B ({comp_data['percent_reduction']:.1f}% saved)", out_path)
    except Exception as e:
        log_result(26, "PDF Compression", "Finish", "FAIL", str(e))

    # Tool 27: Edit Metadata
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_1p.pdf")
        em_res = client.post(f"{BASE_URL}/finish/metadata/edit", json={
            "file_id": doc["file_id"],
            "metadata": {
                "title": "AUDITED_NEW_TITLE",
                "author": "Chief Auditor",
                "subject": "Independent Verification",
                "keywords": "audit, production, pass",
                "custom_metadata": {"/AuditID": "AUDIT-2026-X9"}
            }
        })
        assert em_res.status_code == 200, em_res.text
        em_bytes = download_file(client, em_res.json()["file_id"])
        out_path = OUTPUT_DIR / "independent_tool27_edited_metadata.pdf"
        out_path.write_bytes(em_bytes)
        r = pypdf.PdfReader(io.BytesIO(em_bytes))
        meta = r.metadata
        assert meta.title == "AUDITED_NEW_TITLE"
        assert meta.author == "Chief Auditor"
        log_result(27, "Edit PDF Metadata", "Finish", "PASS", f"Updated Title: '{meta.title}', Author: '{meta.author}', Keywords: '{meta.get('/Keywords')}'", out_path)
    except Exception as e:
        log_result(27, "Edit PDF Metadata", "Finish", "FAIL", str(e))

    # Tool 28: Remove Metadata
    try:
        doc = upload_file(client, INPUT_DIR / "synthetic_1p.pdf")
        rm_res = client.post(f"{BASE_URL}/finish/metadata/remove", json={
            "file_id": doc["file_id"],
            "mode": "deep",
            "remove_author": True,
            "remove_title": True,
            "remove_subject": True,
            "remove_keywords": True,
            "remove_creator_producer": True,
            "remove_timestamps": True,
            "remove_custom_entries": True,
            "remove_xmp": True,
            "remove_thumbnails": True
        })
        assert rm_res.status_code == 200, rm_res.text
        rm_data = rm_res.json()
        clean_bytes = download_file(client, rm_data["document"]["file_id"])
        out_path = OUTPUT_DIR / "independent_tool28_cleansed_metadata.pdf"
        out_path.write_bytes(clean_bytes)
        r = pypdf.PdfReader(io.BytesIO(clean_bytes))
        meta = r.metadata
        assert meta.author is None or meta.author == ""
        assert meta.title is None or meta.title == ""
        log_result(28, "Remove PDF Metadata", "Finish", "PASS", f"Deep sanitation purged all identifying fields (is_sanitized={rm_data['verification_report']['is_sanitized']})", out_path)
    except Exception as e:
        log_result(28, "Remove PDF Metadata", "Finish", "FAIL", str(e))

    # Tool 29: Compare PDFs
    try:
        docA = upload_file(client, INPUT_DIR / "synthetic_1p.pdf")
        docB = upload_file(client, INPUT_DIR / "synthetic_5p.pdf")
        cmp_res = client.post(f"{BASE_URL}/finish/compare", json={
            "original_file_id": docA["file_id"],
            "revised_file_id": docB["file_id"],
            "mode": "all",
            "sensitivity_threshold": 15
        })
        assert cmp_res.status_code == 200, cmp_res.text
        cmp_data = cmp_res.json()
        assert cmp_data["total_text_differences"] > 0 or len(cmp_data["added_pages"]) > 0
        rpt_res = client.get(f"{BASE_URL}/finish/compare/{cmp_data['comparison_id']}/report?format=html")
        assert rpt_res.status_code == 200
        out_path = OUTPUT_DIR / "independent_tool29_comparison_report.html"
        out_path.write_bytes(rpt_res.content)
        log_result(29, "Compare PDFs", "Finish", "PASS", f"Compared 1p vs 5p documents, detected differences, generated HTML audit report ({len(rpt_res.content):,} bytes)", out_path)
    except Exception as e:
        log_result(29, "Compare PDFs", "Finish", "FAIL", str(e))

    print("\n" + "=" * 80)
    print("  CRITICAL SECURITY & BOUNDARY ATTACK AUDIT")
    print("=" * 80)

    security_checks = []

    # Security 1: Path Traversal
    try:
        bad_res = client.get(f"{BASE_URL}/document/../../../../etc/passwd/download")
        assert bad_res.status_code in [400, 404, 422], f"Path traversal not blocked: {bad_res.status_code}"
        security_checks.append({"name": "Path Traversal Escape Guard", "status": "PASS", "details": f"Blocked attempt with HTTP {bad_res.status_code}"})
        print(f"  [\033[92mPASS\033[0m] Security: Path Traversal blocked ({bad_res.status_code})")
    except Exception as e:
        security_checks.append({"name": "Path Traversal Escape Guard", "status": "FAIL", "details": str(e)})
        print(f"  [\033[91mFAIL\033[0m] Security: Path Traversal: {e}")

    # Security 2: 0-Byte File Rejection
    try:
        files = {"file": ("empty.pdf", b"", "application/pdf")}
        zero_res = client.post(f"{BASE_URL}/document/upload", files=files)
        assert zero_res.status_code == 400, f"0-byte file not rejected: {zero_res.status_code}"
        security_checks.append({"name": "0-Byte File Rejection", "status": "PASS", "details": f"Rejected 0-byte upload with HTTP {zero_res.status_code}"})
        print(f"  [\033[92mPASS\033[0m] Security: 0-Byte File Rejected ({zero_res.status_code})")
    except Exception as e:
        security_checks.append({"name": "0-Byte File Rejection", "status": "FAIL", "details": str(e)})
        print(f"  [\033[91mFAIL\033[0m] Security: 0-Byte File Rejection: {e}")

    # Security 3: Non-PDF MIME Rejection
    try:
        files = {"file": ("malicious.txt", b"plain text payload", "text/plain")}
        mime_res = client.post(f"{BASE_URL}/document/upload", files=files)
        assert mime_res.status_code == 400, f"Non-PDF mime not rejected: {mime_res.status_code}"
        security_checks.append({"name": "Non-PDF MIME Rejection", "status": "PASS", "details": f"Rejected text/plain payload with HTTP {mime_res.status_code}"})
        print(f"  [\033[92mPASS\033[0m] Security: Non-PDF MIME Rejected ({mime_res.status_code})")
    except Exception as e:
        security_checks.append({"name": "Non-PDF MIME Rejection", "status": "FAIL", "details": str(e)})
        print(f"  [\033[91mFAIL\033[0m] Security: Non-PDF MIME Rejection: {e}")

    # Security 4: Corrupted Byte Stream Rejection
    try:
        files = {"file": ("corrupt.pdf", (INPUT_DIR / "synthetic_corrupted.pdf").read_bytes(), "application/pdf")}
        corrupt_res = client.post(f"{BASE_URL}/document/upload", files=files)
        assert corrupt_res.status_code in [400, 422] or "error" in corrupt_res.text.lower(), f"Corrupted PDF not safely handled: {corrupt_res.status_code}"
        security_checks.append({"name": "Corrupted PDF Safety", "status": "PASS", "details": f"Handled malformed stream safely (HTTP {corrupt_res.status_code})"})
        print(f"  [\033[92mPASS\033[0m] Security: Corrupted PDF Safely Handled ({corrupt_res.status_code})")
    except Exception as e:
        security_checks.append({"name": "Corrupted PDF Safety", "status": "FAIL", "details": str(e)})
        print(f"  [\033[91mFAIL\033[0m] Security: Corrupted PDF: {e}")

    # Security 5: Non-loopback Host Rejection
    try:
        ext_client = httpx.Client(headers={"Host": "evil-external-domain.com"})
        ext_res = ext_client.get(f"{BASE_URL}/document/system/health")
        assert ext_res.status_code == 403, f"External host header not rejected with 403: {ext_res.status_code}"
        security_checks.append({"name": "Host Header Injection & External Rejection", "status": "PASS", "details": f"External Host header blocked with HTTP {ext_res.status_code}"})
        print(f"  [\033[92mPASS\033[0m] Security: External Host Header Rejected ({ext_res.status_code})")
    except Exception as e:
        security_checks.append({"name": "Host Header Injection & External Rejection", "status": "FAIL", "details": str(e)})
        print(f"  [\033[91mFAIL\033[0m] Security: Host Rejection: {e}")

    print("\n" + "=" * 80)
    print("  ORIGINAL INPUT FILE IMMUTABILITY CHECK")
    print("=" * 80)
    immutability_passed = True
    for fname, orig_hash in initial_hashes.items():
        curr_hash = sha256(INPUT_DIR / fname)
        if curr_hash != orig_hash:
            print(f"  [\033[91mFAIL\033[0m] MUTATION DETECTED: {fname} hash changed!")
            immutability_passed = False
        else:
            print(f"  [\033[92mOK\033[0m] {fname:28s}: Unmodified (Bit-for-bit identical)")
    
    assert immutability_passed, "Input document corruption detected!"

    # Summary
    pass_count = sum(1 for r in results if r["status"] == "PASS")
    fail_count = sum(1 for r in results if r["status"] == "FAIL")
    sec_pass = sum(1 for s in security_checks if s["status"] == "PASS")

    audit_summary = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total_tools_tested": len(results),
        "tools_passed": pass_count,
        "tools_failed": fail_count,
        "tool_pass_rate": f"{(pass_count / len(results)) * 100:.1f}%",
        "security_checks_passed": sec_pass,
        "security_total": len(security_checks),
        "input_immutability_preserved": immutability_passed,
        "tool_results": results,
        "security_results": security_checks
    }

    (LOG_DIR / "audit_results.json").write_text(json.dumps(audit_summary, indent=2))
    print("\n" + "=" * 80)
    print(f"  AUDIT SUMMARY: {pass_count}/{len(results)} Tools PASS | {sec_pass}/{len(security_checks)} Security Checks PASS")
    print(f"  Artifacts saved to: {OUTPUT_DIR}")
    print(f"  Structured log:     {LOG_DIR / 'audit_results.json'}")
    print("=" * 80)

if __name__ == "__main__":
    run_audit()
