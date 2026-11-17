import io
import base64
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from pypdf import PdfWriter, PdfReader
from pypdf.generic import (
    NameObject,
    DictionaryObject,
    DecodedStreamObject,
    TextStringObject,
    ArrayObject,
    NumberObject
)

from main import app
from utils.storage import get_file_path

client = TestClient(app, base_url="http://127.0.0.1:8001")

def create_sample_pdf(text_lines=None, form_fields=None) -> str:
    """Helper to upload a test PDF and return its file_id."""
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)

    # Add fonts
    fonts = DictionaryObject({
        NameObject('/Helvetica'): DictionaryObject({
            NameObject('/Type'): NameObject('/Font'),
            NameObject('/Subtype'): NameObject('/Type1'),
            NameObject('/BaseFont'): NameObject('/Helvetica'),
        })
    })
    page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'): fonts})

    if text_lines:
        stream_ops = []
        curr_y = 700
        for line in text_lines:
            stream_ops.append(f"BT /Helvetica 14 Tf 50 {curr_y} Td ({line}) Tj ET")
            curr_y -= 30
        stream = DecodedStreamObject()
        stream.set_data("\n".join(stream_ops).encode('latin1'))
        page[NameObject('/Contents')] = stream

    if form_fields:
        field_refs = []
        for name, initial_val in form_fields.items():
            field = DictionaryObject({
                NameObject('/Type'): NameObject('/Annot'),
                NameObject('/Subtype'): NameObject('/Widget'),
                NameObject('/FT'): NameObject('/Tx'),
                NameObject('/T'): TextStringObject(name),
                NameObject('/V'): TextStringObject(initial_val),
                NameObject('/Rect'): ArrayObject([NumberObject(50), NumberObject(600), NumberObject(250), NumberObject(630)]),
            })
            f_ref = writer._add_object(field)
            field_refs.append(f_ref)
        page[NameObject('/Annots')] = ArrayObject(field_refs)
        writer._root_object[NameObject('/AcroForm')] = DictionaryObject({
            NameObject('/Fields'): ArrayObject(field_refs),
            NameObject('/NeedAppearances'): NameObject('/true')
        })

    buf = io.BytesIO()
    writer.write(buf)
    buf.seek(0)

    resp = client.post(
        "/api/document/upload",
        files={"file": ("test_sample.pdf", buf.getvalue(), "application/pdf")}
    )
    assert resp.status_code == 200
    return resp.json()["file_id"]

def create_base64_png(color=(255, 0, 0, 255), size=(100, 50)) -> str:
    img = Image.new("RGBA", size, color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode('ascii')


def test_tool1_add_text():
    file_id = create_sample_pdf(text_lines=["Base document heading"])
    resp = client.post(
        f"/api/edit/{file_id}/text",
        json={
            "page_number": 1,
            "text": "Newly Inserted Author Annotation",
            "x": 60,
            "y": 500,
            "font_family": "Helvetica",
            "font_size": 16,
            "color": "#2859D9",
            "bold": True,
            "italic": False,
            "opacity": 1.0
        }
    )
    assert resp.status_code == 200
    new_doc = resp.json()
    new_file_id = new_doc["file_id"]

    # Verify text was written into PDF stream
    new_path = get_file_path(new_file_id)
    reader = PdfReader(new_path)
    extracted = reader.pages[0].extract_text()
    assert "Newly Inserted Author Annotation" in extracted


def test_tool2_add_image():
    file_id = create_sample_pdf()
    img_b64 = create_base64_png(color=(0, 128, 255, 255), size=(200, 100))
    resp = client.post(
        f"/api/edit/{file_id}/image",
        json={
            "page_number": 1,
            "image_base64": img_b64,
            "x": 100,
            "y": 400,
            "width": 150,
            "height": 75,
            "opacity": 1.0
        }
    )
    assert resp.status_code == 200
    new_doc = resp.json()
    assert new_doc["page_count"] == 1


def test_tool3_add_highlight():
    file_id = create_sample_pdf(text_lines=["Important contract section"])
    resp = client.post(
        f"/api/edit/{file_id}/highlight",
        json={
            "page_number": 1,
            "rects": [{"x": 50, "y": 690, "width": 200, "height": 20}],
            "color": "#FFE500",
            "opacity": 0.4
        }
    )
    assert resp.status_code == 200
    new_doc = resp.json()
    new_path = get_file_path(new_doc["file_id"])
    reader = PdfReader(new_path)
    # Highlight is semi-transparent, text underneath is intact
    assert "Important contract section" in reader.pages[0].extract_text()


def test_tool4_add_draw():
    file_id = create_sample_pdf()
    resp = client.post(
        f"/api/edit/{file_id}/draw",
        json={
            "page_number": 1,
            "paths": [
                {
                    "points": [{"x": 100, "y": 100}, {"x": 150, "y": 200}, {"x": 200, "y": 150}],
                    "color": "#15966B",
                    "width": 3.0,
                    "opacity": 1.0
                }
            ]
        }
    )
    assert resp.status_code == 200
    new_doc = resp.json()
    assert new_doc["page_count"] == 1


def test_tool5_add_shapes():
    file_id = create_sample_pdf()
    shapes = [
        {"page_number": 1, "shape_type": "rect", "x": 50, "y": 50, "width": 100, "height": 50, "stroke_color": "#2859D9", "stroke_width": 2, "fill_color": "#DCE3EF", "opacity": 1.0},
        {"page_number": 1, "shape_type": "rounded_rect", "x": 200, "y": 50, "width": 100, "height": 50, "stroke_color": "#17243B", "stroke_width": 2, "radius": 10.0, "opacity": 1.0},
        {"page_number": 1, "shape_type": "circle", "x": 350, "y": 50, "width": 60, "height": 60, "stroke_color": "#E91E63", "stroke_width": 2, "opacity": 1.0},
        {"page_number": 1, "shape_type": "line", "x": 50, "y": 200, "width": 100, "height": 0, "stroke_color": "#000000", "stroke_width": 1.5, "opacity": 1.0},
        {"page_number": 1, "shape_type": "arrow", "x": 200, "y": 200, "width": 100, "height": 50, "stroke_color": "#2859D9", "stroke_width": 2, "opacity": 1.0},
    ]
    for shape in shapes:
        resp = client.post(f"/api/edit/{file_id}/shape", json=shape)
        assert resp.status_code == 200


def test_tool6_add_whiteout_cosmetic():
    file_id = create_sample_pdf(text_lines=["Confidential draft note"])
    resp = client.post(
        f"/api/edit/{file_id}/whiteout",
        json={
            "page_number": 1,
            "rects": [{"x": 45, "y": 690, "width": 200, "height": 30}]
        }
    )
    assert resp.status_code == 200
    new_doc = resp.json()
    new_path = get_file_path(new_doc["file_id"])
    reader = PdfReader(new_path)
    # Whiteout is COSMETIC overlay: underlying text is deliberately intact in stream
    assert "Confidential draft note" in reader.pages[0].extract_text()


def test_tool7_secure_redaction_permanent_removal():
    secret_text = "CLASSIFIED_SSN_987-65-4321"
    file_id = create_sample_pdf(text_lines=[secret_text, "Public Information Text"])

    # First verify secret is in the unredacted document
    orig_path = get_file_path(file_id)
    reader_orig = PdfReader(orig_path)
    assert secret_text in reader_orig.pages[0].extract_text()

    # Now apply true secure redaction targeting secret_text and its bounding box
    resp = client.post(
        f"/api/edit/{file_id}/redact",
        json={
            "page_number": 1,
            "rects": [{"x": 40, "y": 680, "width": 300, "height": 40}],
            "target_text": secret_text,
            "fill_color": "#000000",
            "overlay_text": "[REDACTED]",
            "text_color": "#FFFFFF"
        }
    )
    assert resp.status_code == 200
    new_doc = resp.json()
    new_path = get_file_path(new_doc["file_id"])

    # VITAL SECURITY AUDIT ASSERTION:
    # Extracted text MUST NOT contain secret_text!
    reader_redacted = PdfReader(new_path)
    extracted = reader_redacted.pages[0].extract_text()

    assert secret_text not in extracted, f"CRITICAL SECURITY FAILURE: {secret_text} was still extractable from PDF!"
    assert "Public Information Text" in extracted
    assert "[REDACTED]" in extracted


def test_tool8_digital_signatures():
    file_id = create_sample_pdf()
    sig_b64 = create_base64_png(color=(20, 40, 180, 255), size=(150, 60))
    resp = client.post(
        f"/api/edit/{file_id}/signature",
        json={
            "page_number": 1,
            "signature_image_base64": sig_b64,
            "x": 100,
            "y": 200,
            "width": 120,
            "height": 45,
            "signer_name": "Rohan Siddhpura",
            "include_timestamp": True,
            "timestamp_text": "2026-11-07 16:30 UTC"
        }
    )
    assert resp.status_code == 200
    new_doc = resp.json()
    new_path = get_file_path(new_doc["file_id"])
    reader = PdfReader(new_path)
    extracted = reader.pages[0].extract_text()
    assert "Rohan Siddhpura" in extracted


def test_tool9_form_fields_and_filling():
    file_id = create_sample_pdf(form_fields={"applicant_name": "John Doe", "email_address": "john@example.com"})

    # Inspect form fields
    resp_fields = client.get(f"/api/edit/{file_id}/form-fields")
    assert resp_fields.status_code == 200
    fields_data = resp_fields.json()
    assert fields_data["has_form_fields"] is True
    names = [f["name"] for f in fields_data["fields"]]
    assert "applicant_name" in names

    # Fill form fields
    resp_fill = client.post(
        f"/api/edit/{file_id}/form-fill",
        json={
            "field_values": {"applicant_name": "Jane Smith"},
            "flatten": False
        }
    )
    assert resp_fill.status_code == 200
    filled_doc = resp_fill.json()
    filled_path = get_file_path(filled_doc["file_id"])
    reader = PdfReader(filled_path)
    text_fields = reader.get_form_text_fields()
    assert text_fields.get("applicant_name") == "Jane Smith"


def test_batch_apply_edits():
    file_id = create_sample_pdf(text_lines=["Base document for batch test"])
    resp = client.post(
        f"/api/edit/{file_id}/batch",
        json={
            "texts": [
                {"page_number": 1, "text": "Batch Header", "x": 100, "y": 600, "font_size": 18, "color": "#17243B"}
            ],
            "shapes": [
                {"page_number": 1, "shape_type": "rect", "x": 90, "y": 590, "width": 200, "height": 30, "stroke_color": "#2859D9", "stroke_width": 1}
            ],
            "highlights": [
                {"page_number": 1, "rects": [{"x": 50, "y": 690, "width": 150, "height": 20}], "color": "#FFE500"}
            ]
        }
    )
    assert resp.status_code == 200
    new_doc = resp.json()
    new_path = get_file_path(new_doc["file_id"])
    reader = PdfReader(new_path)
    text = reader.pages[0].extract_text()
    assert "Batch Header" in text
