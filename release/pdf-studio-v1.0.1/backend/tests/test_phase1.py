import hashlib
import io
import pytest
from fastapi.testclient import TestClient
from main import app
from utils.storage import purge_all_temp_storage, get_file_path

client = TestClient(app, base_url="http://127.0.0.1:8001")

def setup_module():
    purge_all_temp_storage()

def teardown_module():
    purge_all_temp_storage()

def test_system_health():
    """Verify backend health endpoint reports offline-localhost mode."""
    response = client.get("/api/document/system/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["mode"] == "offline-localhost"

def test_generate_sample_pdf_50_pages():
    """Audit Item 4: Test generation and structure of a 50-page PDF."""
    response = client.post("/api/document/sample?pages=50")
    assert response.status_code == 200
    data = response.json()
    assert data["page_count"] == 50
    assert len(data["pages"]) == 50
    assert data["size_bytes"] > 0
    assert "file_id" in data
    assert data["filename"].endswith(".pdf")
    
    # Assert geometry of all pages
    for page in data["pages"]:
        assert page["page_number"] >= 1
        assert page["width"] == 595.0
        assert page["height"] == 842.0

def test_inspect_document():
    """Audit Item 4: Verify document structure inspection."""
    create_res = client.post("/api/document/sample?pages=5")
    assert create_res.status_code == 200
    file_id = create_res.json()["file_id"]

    info_res = client.get(f"/api/document/{file_id}/info")
    assert info_res.status_code == 200
    info = info_res.json()
    assert info["file_id"] == file_id
    assert info["page_count"] == 5
    assert len(info["pages"]) == 5
    assert info["metadata"]["title"] is not None

def test_thumbnail_rendering():
    """Audit Item 4: Verify thumbnail generation produces valid PNG image bytes."""
    create_res = client.post("/api/document/sample?pages=3")
    file_id = create_res.json()["file_id"]

    thumb_res = client.get(f"/api/document/{file_id}/page/1/thumbnail?width=200")
    assert thumb_res.status_code == 200
    assert thumb_res.headers["content-type"] == "image/png"
    # PNG signature check (bytes 1-4: \x89PNG)
    assert thumb_res.content.startswith(b"\x89PNG")

def test_download_document():
    """Audit Item 4: Verify document download streams valid PDF bytes."""
    create_res = client.post("/api/document/sample?pages=2")
    file_id = create_res.json()["file_id"]

    down_res = client.get(f"/api/document/{file_id}/download")
    assert down_res.status_code == 200
    assert down_res.headers["content-type"] == "application/pdf"
    assert down_res.content.startswith(b"%PDF")

def test_save_as_preserves_original_integrity():
    """
    Audit Item 5: Confirm that the original PDF remains 100% unchanged after Save As.
    Calculates SHA-256 before and after the Save As operation.
    """
    create_res = client.post("/api/document/sample?pages=5")
    original_id = create_res.json()["file_id"]
    original_name = create_res.json()["filename"]

    # Read original file bytes and compute SHA-256 hash
    orig_path = get_file_path(original_id)
    assert orig_path is not None and orig_path.exists()
    with open(orig_path, "rb") as f:
        orig_bytes_before = f.read()
    hash_before = hashlib.sha256(orig_bytes_before).hexdigest()

    # Perform Save As
    save_as_res = client.post(
        f"/api/document/{original_id}/save-as",
        json={"new_filename": "independent_copy.pdf"}
    )
    assert save_as_res.status_code == 200
    new_doc = save_as_res.json()
    new_id = new_doc["file_id"]
    assert new_id != original_id
    assert new_doc["filename"] == "independent_copy.pdf"

    # Verify original file on disk is bit-for-bit identical after Save As
    with open(orig_path, "rb") as f:
        orig_bytes_after = f.read()
    hash_after = hashlib.sha256(orig_bytes_after).hexdigest()
    assert hash_before == hash_after
    assert orig_bytes_before == orig_bytes_after

    # Verify new file on disk exists independently
    new_path = get_file_path(new_id)
    assert new_path is not None and new_path.exists()
    assert new_path != orig_path

def test_upload_invalid_file_rejected():
    """Audit Item 7: Reject corrupted or non-PDF files."""
    # Test non-PDF extension
    files = {"file": ("malicious.exe", b"NOT A PDF CONTENT", "application/octet-stream")}
    res = client.post("/api/document/upload", files=files)
    assert res.status_code == 400
    assert "Only PDF documents are supported" in res.json()["detail"]

    # Test PDF extension with fake header
    fake_pdf = {"file": ("fake.pdf", b"CORRUPTED BYTES WITHOUT MAGIC", "application/pdf")}
    res_fake = client.post("/api/document/upload", files=fake_pdf)
    assert res_fake.status_code == 400
    assert "Corrupted or invalid PDF" in res_fake.json()["detail"]

    # Test empty file (0 bytes)
    empty_pdf = {"file": ("empty.pdf", b"", "application/pdf")}
    res_empty = client.post("/api/document/upload", files=empty_pdf)
    assert res_empty.status_code == 400
    assert "empty (0 bytes)" in res_empty.json()["detail"]

def test_temporary_file_cleanup():
    """Audit Item 7: Verify purge_all_temp_storage endpoint cleans up session files."""
    # Create documents
    client.post("/api/document/sample?pages=2")
    client.post("/api/document/sample?pages=2")

    cleanup_res = client.post("/api/document/system/cleanup")
    assert cleanup_res.status_code == 200
    data = cleanup_res.json()
    assert data["success"] is True
    assert data["details"]["purged_count"] >= 1

def test_security_middleware_rejects_external_hosts():
    """Audit Item 7: Verify that foreign Host headers are rejected with 403 Forbidden."""
    res = client.get("/api/document/system/health", headers={"Host": "malicious-site.com"})
    assert res.status_code == 403
    assert "Access restricted" in res.json()["detail"] or "Host" in res.json()["detail"]
