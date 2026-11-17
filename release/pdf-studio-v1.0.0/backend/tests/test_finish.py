import io
import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter, PdfReader
from pypdf.generic import NameObject, DictionaryObject, DecodedStreamObject
from PIL import Image

from main import app
from utils.storage import save_uploaded_file

client = TestClient(app, base_url="http://127.0.0.1:8001")


def create_test_pdf_with_images(text: str = "Test document content") -> str:
    """Create a PDF with text and an embedded image to test compression and metadata."""
    writer = PdfWriter()
    page = writer.add_blank_page(width=595.28, height=841.89)

    # Add an uncompressed/large test image into the page
    im = Image.new("RGB", (600, 600), color=(180, 50, 50))
    img_pdf_buf = io.BytesIO()
    im.save(img_pdf_buf, format="PDF")
    img_pdf_buf.seek(0)
    img_reader = PdfReader(img_pdf_buf)
    page.merge_page(img_reader.pages[0])

    writer.add_metadata({
        "/Title": "Original Confidential Title",
        "/Author": "Secret Author",
        "/Subject": "Testing Finish Module",
        "/Keywords": "security, test, bserc",
        "/Creator": "PDF Studio Test Suite",
    })

    out_buf = io.BytesIO()
    writer.write(out_buf)
    file_id, _ = save_uploaded_file(out_buf.getvalue(), "test_finish_source.pdf")
    return file_id


def create_vector_text_pdf(paragraphs: list[str]) -> str:
    """Create a vector PDF with text using pure pypdf stream objects without external libraries."""
    writer = PdfWriter()
    for para in paragraphs:
        page = writer.add_blank_page(width=612, height=792)
        fonts = DictionaryObject({
            NameObject('/Helvetica'): DictionaryObject({
                NameObject('/Type'): NameObject('/Font'),
                NameObject('/Subtype'): NameObject('/Type1'),
                NameObject('/BaseFont'): NameObject('/Helvetica'),
            })
        })
        page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'): fonts})
        stream = DecodedStreamObject()
        stream.set_data(f"BT /Helvetica 14 Tf 50 700 Td ({para}) Tj ET".encode('latin1'))
        page[NameObject('/Contents')] = stream

    buf = io.BytesIO()
    writer.write(buf)
    file_id, _ = save_uploaded_file(buf.getvalue(), "vector_doc.pdf")
    return file_id


# --- Tool 1: Compression Tests ---
def test_tool1_compress_balanced_preset():
    file_id = create_test_pdf_with_images("Compress test document")
    resp = client.post(
        "/api/finish/compress",
        json={
            "file_id": file_id,
            "preset": "balanced",
            "dpi": 150,
            "jpeg_quality": 85,
            "optimize_images": True,
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["file_id"] is not None
    assert data["original_size_bytes"] > 0
    assert data["compressed_size_bytes"] > 0
    assert data["page_count"] == 1
    assert data["preset"] == "balanced"

    # Verify compressed PDF validity
    comp_resp = client.get(f"/api/document/{data['file_id']}/info")
    assert comp_resp.status_code == 200
    comp_doc = comp_resp.json()
    assert comp_doc["page_count"] == 1


def test_tool1_compress_truthful_statistics():
    file_id = create_test_pdf_with_images("Already tight document")
    resp = client.post(
        "/api/finish/compress",
        json={
            "file_id": file_id,
            "preset": "max_quality",
            "optimize_images": False,
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "percent_reduction" in data
    assert "is_already_optimized" in data
    if data["compressed_size_bytes"] >= data["original_size_bytes"]:
        assert data["bytes_saved"] == 0
        assert data["is_already_optimized"] is True


# --- Tool 2: Metadata Inspection & Editing Tests ---
def test_tool2_get_and_edit_metadata():
    file_id = create_test_pdf_with_images()

    # 1. Get metadata
    get_resp = client.get(f"/api/finish/metadata/{file_id}")
    assert get_resp.status_code == 200
    meta_data = get_resp.json()
    assert meta_data["metadata"]["title"] == "Original Confidential Title"
    assert meta_data["metadata"]["author"] == "Secret Author"
    assert meta_data["properties"]["page_count"] == 1

    # 2. Edit metadata
    edit_resp = client.post(
        "/api/finish/metadata/edit",
        json={
            "file_id": file_id,
            "metadata": {
                "title": "Updated Public Report",
                "author": "Dr. Jane Doe",
                "subject": "Published Research",
                "keywords": "quantum, computing",
                "creator": "PDF Studio Pro",
                "custom_metadata": {"Department": "Engineering"},
            }
        }
    )
    assert edit_resp.status_code == 200
    new_doc = edit_resp.json()
    assert new_doc["file_id"] is not None

    # Verify newly saved metadata
    verify_resp = client.get(f"/api/finish/metadata/{new_doc['file_id']}")
    assert verify_resp.status_code == 200
    verified = verify_resp.json()
    assert verified["metadata"]["title"] == "Updated Public Report"
    assert verified["metadata"]["author"] == "Dr. Jane Doe"
    assert verified["metadata"]["keywords"] == "quantum, computing"


# --- Tool 3: Metadata Removal & Privacy Sanitization Tests ---
def test_tool3_remove_metadata_standard():
    file_id = create_test_pdf_with_images()
    resp = client.post(
        "/api/finish/metadata/remove",
        json={
            "file_id": file_id,
            "mode": "standard",
            "remove_author": True,
            "remove_title": True,
            "remove_subject": False,
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    report = data["verification_report"]
    assert report["is_sanitized"] is True
    assert any("Author" in f for f in report["fields_removed"])
    assert any("Title" in f for f in report["fields_removed"])


def test_tool3_remove_metadata_deep_sanitization():
    file_id = create_test_pdf_with_images()
    resp = client.post(
        "/api/finish/metadata/remove",
        json={
            "file_id": file_id,
            "mode": "deep",
            "remove_thumbnails": True,
            "remove_xmp": True,
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    report = data["verification_report"]
    assert report["mode"] == "deep"
    assert report["is_sanitized"] is True


# --- Tool 4: Comparison Tests ---
def test_tool4_compare_identical_documents():
    file_id1 = create_vector_text_pdf(["The quick brown fox jumps over the lazy dog."])
    file_id2 = create_vector_text_pdf(["The quick brown fox jumps over the lazy dog."])

    resp = client.post(
        "/api/finish/compare",
        json={
            "original_file_id": file_id1,
            "revised_file_id": file_id2,
            "mode": "all",
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["orig_page_count"] == 1
    assert data["rev_page_count"] == 1
    assert data["total_text_differences"] == 0
    assert len(data["pages_with_text_changes"]) == 0


def test_tool4_compare_modified_text():
    file_id_orig = create_vector_text_pdf(["Clause 1: Vendor provides five units."])
    file_id_rev = create_vector_text_pdf(["Clause 1: Vendor provides ten units."])

    resp = client.post(
        "/api/finish/compare",
        json={
            "original_file_id": file_id_orig,
            "revised_file_id": file_id_rev,
            "mode": "all",
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_text_differences"] > 0
    assert 1 in data["pages_with_text_changes"]
    assert any(d["type"] in ("modified", "added", "removed") for d in data["text_diffs"])

    # Test report export
    cmp_id = data["comparison_id"]
    report_resp = client.get(f"/api/finish/compare/{cmp_id}/report?format=html")
    assert report_resp.status_code == 200
    assert "PDF Studio — Document Comparison Audit" in report_resp.text


def test_tool4_compare_differing_page_counts():
    file_id_1p = create_vector_text_pdf(["Single page doc."])
    file_id_2p = create_vector_text_pdf(["First page text.", "Second page text."])

    resp = client.post(
        "/api/finish/compare",
        json={
            "original_file_id": file_id_1p,
            "revised_file_id": file_id_2p,
            "mode": "all",
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["orig_page_count"] == 1
    assert data["rev_page_count"] == 2
    assert 2 in data["added_pages"]
