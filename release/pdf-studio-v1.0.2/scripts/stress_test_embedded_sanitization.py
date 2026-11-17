#!/usr/bin/env python3
"""
PDF Studio v1.0.1 — Embedded Content Sanitization Stress Test Suite
Generates 8 specific embedded threat PDFs and tests them against the running v1.0.1 backend.
Performs recursive object inspection to determine whether actions/scripts/attachments remain.
"""
import os
import sys
import io
import json
import requests
import subprocess
from pypdf import PdfWriter, PdfReader
from pypdf.generic import (
    DictionaryObject,
    NameObject,
    NumberObject,
    ArrayObject,
    DecodedStreamObject,
    ByteStringObject,
    TextStringObject,
    IndirectObject
)

BACKEND_URL = "http://127.0.0.1:8001"
CORPUS_DIR = "/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/evidence/stress_test/corpus"
OUTPUT_DIR = "/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/evidence/stress_test/outputs"
LOGS_DIR = "/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/evidence/stress_test/logs"

os.makedirs(CORPUS_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

results = {}

def upload_pdf(filepath: str) -> str:
    with open(filepath, "rb") as f:
        resp = requests.post(
            f"{BACKEND_URL}/api/document/upload",
            files={"file": (os.path.basename(filepath), f, "application/pdf")}
        )
    resp.raise_for_status()
    return resp.json()["file_id"]

def download_pdf(file_id: str, out_path: str):
    resp = requests.get(f"{BACKEND_URL}/api/document/{file_id}/download")
    resp.raise_for_status()
    with open(out_path, "wb") as f:
        f.write(resp.content)

def sanitize_pdf(file_id: str) -> dict:
    req = {
        "file_id": file_id,
        "mode": "deep",
        "remove_author": True,
        "remove_title": True,
        "remove_subject": True,
        "remove_keywords": True,
        "remove_creator_producer": True,
        "remove_timestamps": True,
        "remove_custom_entries": True,
        "remove_xmp": True,
        "remove_thumbnails": True,
        "remove_embedded_files": True,
        "remove_javascript": True,
        "remove_actions": True
    }
    resp = requests.post(f"{BACKEND_URL}/api/finish/metadata/remove", json=req)
    return resp.status_code, resp.json() if resp.status_code == 200 else resp.text

def recursive_inspect_pdf(reader: PdfReader) -> dict:
    """Recursively traverse all PDF objects to find any embedded files, JS, or actions."""
    visited = set()
    found = {
        "embedded_files": [],
        "javascript_scripts": [],
        "actions": [],
        "additional_actions": []
    }

    def walk(obj):
        obj_id = id(obj)
        if obj_id in visited:
            return
        visited.add(obj_id)

        if isinstance(obj, dict):
            # Check for JavaScript
            if NameObject("/JS") in obj:
                found["javascript_scripts"].append(str(obj[NameObject("/JS")]))
            if NameObject("/JavaScript") in obj:
                found["javascript_scripts"].append(str(obj[NameObject("/JavaScript")]))
            # Check for Actions
            if NameObject("/A") in obj:
                a = obj[NameObject("/A")]
                a_obj = a.get_object() if hasattr(a, "get_object") else a
                if isinstance(a_obj, dict):
                    found["actions"].append(str(a_obj.get(NameObject("/S"), "UnknownAction")))
            # Check for Additional Actions
            if NameObject("/AA") in obj:
                aa = obj[NameObject("/AA")]
                aa_obj = aa.get_object() if hasattr(aa, "get_object") else aa
                if isinstance(aa_obj, dict):
                    for k in aa_obj.keys():
                        found["additional_actions"].append(str(k))
            # Check for EmbeddedFiles
            if NameObject("/EmbeddedFiles") in obj:
                ef = obj[NameObject("/EmbeddedFiles")]
                found["embedded_files"].append(str(ef))
            if NameObject("/Type") in obj and obj[NameObject("/Type")] == NameObject("/Filespec"):
                found["embedded_files"].append(str(obj.get(NameObject("/F"), "FileSpec")))

            for k, v in obj.items():
                v_obj = v.get_object() if hasattr(v, "get_object") else v
                walk(v_obj)

        elif isinstance(obj, list):
            for item in obj:
                item_obj = item.get_object() if hasattr(item, "get_object") else item
                walk(item_obj)

    try:
        root_ref = reader.trailer.get("/Root")
        root = root_ref.get_object() if hasattr(root_ref, "get_object") else root_ref
        walk(root)
    except Exception as e:
        found["walk_error"] = str(e)

    return found

# -----------------------------------------------------------------------------
# Test 1: Attachments in PDF Catalog
# -----------------------------------------------------------------------------
def test_embed_1_catalog_attachments():
    print("\n--- Testing Embed 1: Catalog Attachments ---")
    writer = PdfWriter()
    p = writer.add_blank_page(width=500, height=700)
    writer.add_attachment("confidential_payload.exe", b"MZ_EXECUTABLE_BINARY_PAYLOAD_DATA")

    corpus_file = os.path.join(CORPUS_DIR, "stress_embed1_attachments.pdf")
    with open(corpus_file, "wb") as f:
        writer.write(f)

    file_id = upload_pdf(corpus_file)
    status_code, resp_data = sanitize_pdf(file_id)
    out_file = os.path.join(OUTPUT_DIR, "stress_embed1_attachments_out.pdf")
    download_pdf(resp_data["document"]["file_id"], out_file)

    reader = PdfReader(out_file)
    inspected = recursive_inspect_pdf(reader)
    clean = len(inspected["embedded_files"]) == 0 and len(reader.attachments) == 0

    results["Embed 1: Catalog Attachments"] = {
        "status": "PASS" if clean else "FAIL",
        "description": "Embedded file attachment in /Root /Names /EmbeddedFiles",
        "detail": f"Remaining attachments in reader: {len(reader.attachments)}, in object tree: {len(inspected['embedded_files'])}.",
        "input_file": corpus_file,
        "output_file": out_file
    }

# -----------------------------------------------------------------------------
# Test 2: JavaScript in Document Actions
# -----------------------------------------------------------------------------
def test_embed_2_document_js():
    print("\n--- Testing Embed 2: Document JavaScript ---")
    writer = PdfWriter()
    p = writer.add_blank_page(width=500, height=700)

    js_action = DictionaryObject({
        NameObject("/S"): NameObject("/JavaScript"),
        NameObject("/JS"): TextStringObject("app.alert('Document Triggered JS');")
    })
    js_name_tree = DictionaryObject({
        NameObject("/Names"): ArrayObject([TextStringObject("InitScript"), writer._add_object(js_action)])
    })
    root = writer._root_object
    root[NameObject("/Names")] = DictionaryObject({
        NameObject("/JavaScript"): writer._add_object(js_name_tree)
    })

    corpus_file = os.path.join(CORPUS_DIR, "stress_embed2_document_js.pdf")
    with open(corpus_file, "wb") as f:
        writer.write(f)

    file_id = upload_pdf(corpus_file)
    status_code, resp_data = sanitize_pdf(file_id)
    out_file = os.path.join(OUTPUT_DIR, "stress_embed2_document_js_out.pdf")
    download_pdf(resp_data["document"]["file_id"], out_file)

    reader = PdfReader(out_file)
    inspected = recursive_inspect_pdf(reader)
    clean = len(inspected["javascript_scripts"]) == 0

    results["Embed 2: Document JavaScript"] = {
        "status": "PASS" if clean else "FAIL",
        "description": "Document JavaScript in /Names /JavaScript",
        "detail": f"Remaining scripts in object tree: {len(inspected['javascript_scripts'])}.",
        "input_file": corpus_file,
        "output_file": out_file
    }

# -----------------------------------------------------------------------------
# Test 3: Page-level Additional Actions (/AA)
# -----------------------------------------------------------------------------
def test_embed_3_page_aa():
    print("\n--- Testing Embed 3: Page-level Additional Actions ---")
    writer = PdfWriter()
    p = writer.add_blank_page(width=500, height=700)

    page_open_action = DictionaryObject({
        NameObject("/S"): NameObject("/JavaScript"),
        NameObject("/JS"): TextStringObject("console.println('Page Opened');")
    })
    p[NameObject("/AA")] = DictionaryObject({
        NameObject("/O"): writer._add_object(page_open_action)
    })

    corpus_file = os.path.join(CORPUS_DIR, "stress_embed3_page_aa.pdf")
    with open(corpus_file, "wb") as f:
        writer.write(f)

    file_id = upload_pdf(corpus_file)
    status_code, resp_data = sanitize_pdf(file_id)
    out_file = os.path.join(OUTPUT_DIR, "stress_embed3_page_aa_out.pdf")
    download_pdf(resp_data["document"]["file_id"], out_file)

    reader = PdfReader(out_file)
    inspected = recursive_inspect_pdf(reader)
    has_page_aa = "/AA" in reader.pages[0]

    clean = (not has_page_aa) and (len(inspected["additional_actions"]) == 0)
    results["Embed 3: Page-level Additional Actions"] = {
        "status": "PASS" if clean else "FAIL",
        "description": "Page /AA open action trigger",
        "detail": f"Page /AA dictionary present: {has_page_aa}. Tree AA count: {len(inspected['additional_actions'])}.",
        "input_file": corpus_file,
        "output_file": out_file
    }

# -----------------------------------------------------------------------------
# Test 4: Form Field & Widget Actions
# -----------------------------------------------------------------------------
def test_embed_4_form_field_actions():
    print("\n--- Testing Embed 4: Form Field and Widget Actions ---")
    writer = PdfWriter()
    p = writer.add_blank_page(width=500, height=700)

    # Create AcroForm field with Keystroke (/K) JavaScript action
    field_dict = DictionaryObject({
        NameObject("/FT"): NameObject("/Tx"),
        NameObject("/T"): TextStringObject("SSN_Field"),
        NameObject("/Rect"): ArrayObject([NumberObject(50), NumberObject(500), NumberObject(250), NumberObject(530)]),
        NameObject("/Subtype"): NameObject("/Widget"),
        NameObject("/AA"): DictionaryObject({
            NameObject("/K"): DictionaryObject({
                NameObject("/S"): NameObject("/JavaScript"),
                NameObject("/JS"): TextStringObject("app.alert('Keystroke intercepted');")
            })
        })
    })
    field_ref = writer._add_object(field_dict)
    p[NameObject("/Annots")] = ArrayObject([field_ref])

    root = writer._root_object
    root[NameObject("/AcroForm")] = DictionaryObject({
        NameObject("/Fields"): ArrayObject([field_ref])
    })

    corpus_file = os.path.join(CORPUS_DIR, "stress_embed4_field_actions.pdf")
    with open(corpus_file, "wb") as f:
        writer.write(f)

    file_id = upload_pdf(corpus_file)
    status_code, resp_data = sanitize_pdf(file_id)
    out_file = os.path.join(OUTPUT_DIR, "stress_embed4_field_actions_out.pdf")
    download_pdf(resp_data["document"]["file_id"], out_file)

    reader = PdfReader(out_file)
    inspected = recursive_inspect_pdf(reader)
    clean = len(inspected["javascript_scripts"]) == 0

    results["Embed 4: Form Field & Widget Actions"] = {
        "status": "PASS" if clean else "FAIL",
        "description": "Form field /AA /K keystroke JavaScript action",
        "detail": f"Remaining scripts in tree: {len(inspected['javascript_scripts'])}. Annotations sanitized: {clean}.",
        "input_file": corpus_file,
        "output_file": out_file
    }

# -----------------------------------------------------------------------------
# Test 5: Annotation Actions (/S /Launch)
# -----------------------------------------------------------------------------
def test_embed_5_annot_actions():
    print("\n--- Testing Embed 5: Annotation Actions (/S /Launch) ---")
    writer = PdfWriter()
    p = writer.add_blank_page(width=500, height=700)

    # Malicious launch annotation (e.g. launch cmd.exe / powershell)
    launch_action = DictionaryObject({
        NameObject("/S"): NameObject("/Launch"),
        NameObject("/F"): TextStringObject("/bin/sh")
    })
    link_annot = DictionaryObject({
        NameObject("/Type"): NameObject("/Annot"),
        NameObject("/Subtype"): NameObject("/Link"),
        NameObject("/Rect"): ArrayObject([NumberObject(100), NumberObject(200), NumberObject(300), NumberObject(240)]),
        NameObject("/A"): writer._add_object(launch_action)
    })
    p[NameObject("/Annots")] = ArrayObject([writer._add_object(link_annot)])

    corpus_file = os.path.join(CORPUS_DIR, "stress_embed5_annot_launch.pdf")
    with open(corpus_file, "wb") as f:
        writer.write(f)

    file_id = upload_pdf(corpus_file)
    status_code, resp_data = sanitize_pdf(file_id)
    out_file = os.path.join(OUTPUT_DIR, "stress_embed5_annot_launch_out.pdf")
    download_pdf(resp_data["document"]["file_id"], out_file)

    reader = PdfReader(out_file)
    inspected = recursive_inspect_pdf(reader)
    clean = "/Launch" not in inspected["actions"]

    results["Embed 5: Annotation Actions (/Launch)"] = {
        "status": "PASS" if clean else "FAIL",
        "description": "Link annotation with /S /Launch executable trigger",
        "detail": f"Actions found in object tree: {inspected['actions']}. Launch purged: {clean}.",
        "input_file": corpus_file,
        "output_file": out_file
    }

# -----------------------------------------------------------------------------
# Test 6: Outline / Bookmark Actions
# -----------------------------------------------------------------------------
def test_embed_6_outline_actions():
    print("\n--- Testing Embed 6: Outline / Bookmark Actions ---")
    writer = PdfWriter()
    p = writer.add_blank_page(width=500, height=700)

    # Create Outline hierarchy with JavaScript action
    js_action = DictionaryObject({
        NameObject("/S"): NameObject("/JavaScript"),
        NameObject("/JS"): TextStringObject("app.alert('Bookmark Clicked');")
    })
    item_ref = writer._add_object(DictionaryObject({
        NameObject("/Title"): TextStringObject("Malicious Chapter 1"),
        NameObject("/A"): writer._add_object(js_action)
    }))
    outlines = DictionaryObject({
        NameObject("/Type"): NameObject("/Outlines"),
        NameObject("/First"): item_ref,
        NameObject("/Last"): item_ref,
        NameObject("/Count"): NumberObject(1)
    })
    root = writer._root_object
    root[NameObject("/Outlines")] = writer._add_object(outlines)

    corpus_file = os.path.join(CORPUS_DIR, "stress_embed6_outline_actions.pdf")
    with open(corpus_file, "wb") as f:
        writer.write(f)

    file_id = upload_pdf(corpus_file)
    status_code, resp_data = sanitize_pdf(file_id)
    out_file = os.path.join(OUTPUT_DIR, "stress_embed6_outline_actions_out.pdf")
    download_pdf(resp_data["document"]["file_id"], out_file)

    reader = PdfReader(out_file)
    inspected = recursive_inspect_pdf(reader)
    clean = len(inspected["javascript_scripts"]) == 0

    results["Embed 6: Outline / Bookmark Actions"] = {
        "status": "PASS" if clean else "FAIL",
        "description": "Bookmark /Outlines item containing /S /JavaScript action",
        "detail": f"Remaining scripts in tree: {len(inspected['javascript_scripts'])}. In v1.0.1, outlines are not recursively sanitized.",
        "input_file": corpus_file,
        "output_file": out_file
    }

# -----------------------------------------------------------------------------
# Test 7: OpenAction and Named Actions
# -----------------------------------------------------------------------------
def test_embed_7_openaction_named():
    print("\n--- Testing Embed 7: OpenAction with Named Action ---")
    writer = PdfWriter()
    p = writer.add_blank_page(width=500, height=700)

    named_action = DictionaryObject({
        NameObject("/S"): NameObject("/Named"),
        NameObject("/N"): NameObject("/Print")
    })
    root = writer._root_object
    root[NameObject("/OpenAction")] = writer._add_object(named_action)

    corpus_file = os.path.join(CORPUS_DIR, "stress_embed7_openaction_named.pdf")
    with open(corpus_file, "wb") as f:
        writer.write(f)

    file_id = upload_pdf(corpus_file)
    status_code, resp_data = sanitize_pdf(file_id)
    out_file = os.path.join(OUTPUT_DIR, "stress_embed7_openaction_named_out.pdf")
    download_pdf(resp_data["document"]["file_id"], out_file)

    reader = PdfReader(out_file)
    inspected = recursive_inspect_pdf(reader)
    root_post = reader.trailer.get("/Root").get_object()
    has_openaction = "/OpenAction" in root_post

    clean = not has_openaction
    results["Embed 7: OpenAction & Named Actions"] = {
        "status": "PASS" if clean else "FAIL",
        "description": "Root catalog /OpenAction with /Named action",
        "detail": f"/OpenAction present in root: {has_openaction}. Purged: {clean}.",
        "input_file": corpus_file,
        "output_file": out_file
    }

# -----------------------------------------------------------------------------
# Test 8: Encrypted and Malformed PDFs
# -----------------------------------------------------------------------------
def test_embed_8_encrypted_malformed():
    print("\n--- Testing Embed 8: Encrypted & Malformed PDFs ---")
    writer = PdfWriter()
    p = writer.add_blank_page(width=500, height=700)
    writer.encrypt(user_password="password123", owner_password="ownersecret456")

    corpus_file_enc = os.path.join(CORPUS_DIR, "stress_embed8_encrypted.pdf")
    with open(corpus_file_enc, "wb") as f:
        writer.write(f)

    # Attempt to upload encrypted PDF
    upload_success = False
    upload_msg = ""
    try:
        file_id = upload_pdf(corpus_file_enc)
        upload_success = True
        status_code, resp_data = sanitize_pdf(file_id)
        sanitized_flag = resp_data.get("verification", {}).get("is_sanitized", False)
        warnings = resp_data.get("verification", {}).get("warnings", [])
        upload_msg = f"Uploaded. Sanitized flag: {sanitized_flag}, Warnings: {warnings}"
    except requests.exceptions.HTTPError as e:
        upload_msg = f"HTTP Error on upload/processing: {e.response.status_code} - {e.response.text}"

    # Malformed PDF test
    corpus_file_mal = os.path.join(CORPUS_DIR, "stress_embed8_malformed.pdf")
    with open(corpus_file_mal, "wb") as f:
        f.write(b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF_CORRUPTED_STREAM")

    mal_rejected = False
    mal_msg = ""
    try:
        upload_pdf(corpus_file_mal)
    except requests.exceptions.HTTPError as e:
        mal_rejected = True
        mal_msg = f"Correctly rejected malformed PDF with HTTP {e.response.status_code}: {e.response.text}"

    results["Embed 8: Encrypted & Malformed PDFs"] = {
        "status": "PASS" if mal_rejected else "PARTIAL",
        "description": "Encrypted PDF and malformed byte stream handling",
        "detail": f"Malformed rejection: {mal_rejected} ({mal_msg}). Encrypted handling: {upload_msg}.",
        "input_file": corpus_file_enc,
        "output_file": "N/A"
    }

def main():
    test_embed_1_catalog_attachments()
    test_embed_2_document_js()
    test_embed_3_page_aa()
    test_embed_4_form_field_actions()
    test_embed_5_annot_actions()
    test_embed_6_outline_actions()
    test_embed_7_openaction_named()
    test_embed_8_encrypted_malformed()

    summary_file = os.path.join(LOGS_DIR, "embedded_sanitization_stress_summary.json")
    with open(summary_file, "w") as f:
        json.dump(results, f, indent=2)

    print("\n=======================================================")
    print("EMBEDDED SANITIZATION STRESS TEST RESULTS")
    print("=======================================================")
    for k, v in results.items():
        print(f"[{v['status']}] {k}: {v['detail']}")
    print("=======================================================")

if __name__ == "__main__":
    main()
