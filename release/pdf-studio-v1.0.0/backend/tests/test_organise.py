import io
import pytest
from fastapi.testclient import TestClient
from main import app
from utils.storage import purge_all_temp_storage

client = TestClient(app, base_url="http://127.0.0.1:8001")

def setup_module():
    purge_all_temp_storage()

def teardown_module():
    purge_all_temp_storage()

def test_tool1_merge_pdfs():
    # Create two distinct documents
    doc1 = client.post("/api/document/sample?pages=2").json()
    doc2 = client.post("/api/document/sample?pages=3").json()

    # Merge them
    merge_res = client.post("/api/organise/merge", json={
        "file_ids": [doc1["file_id"], doc2["file_id"]],
        "output_filename": "combined_lecture.pdf"
    })
    assert merge_res.status_code == 200
    merged = merge_res.json()
    assert merged["page_count"] == 5
    assert merged["filename"] == "combined_lecture.pdf"
    assert len(merged["pages"]) == 5

    # Test error when less than 2 files
    invalid_merge = client.post("/api/organise/merge", json={
        "file_ids": [doc1["file_id"]],
    })
    assert invalid_merge.status_code == 422 # Pydantic validation min_items

def test_tool2_split_pdf_all_pages():
    doc = client.post("/api/document/sample?pages=4").json()
    split_res = client.post("/api/organise/split", json={
        "file_id": doc["file_id"],
        "mode": "all_pages"
    })
    assert split_res.status_code == 200
    data = split_res.json()
    assert data["success"] is True
    assert len(data["output_documents"]) == 4
    for out_doc in data["output_documents"]:
        assert out_doc["page_count"] == 1

def test_tool2_split_pdf_ranges():
    doc = client.post("/api/document/sample?pages=6").json()
    split_res = client.post("/api/organise/split", json={
        "file_id": doc["file_id"],
        "mode": "ranges",
        "ranges": ["1-2", "3-4", "5-6"]
    })
    assert split_res.status_code == 200
    data = split_res.json()
    assert len(data["output_documents"]) == 3
    for out_doc in data["output_documents"]:
        assert out_doc["page_count"] == 2

def test_tool2_split_pdf_after_pages():
    doc = client.post("/api/document/sample?pages=5").json()
    split_res = client.post("/api/organise/split", json={
        "file_id": doc["file_id"],
        "mode": "after_pages",
        "split_after_pages": [2]
    })
    assert split_res.status_code == 200
    data = split_res.json()
    assert len(data["output_documents"]) == 2
    assert data["output_documents"][0]["page_count"] == 2
    assert data["output_documents"][1]["page_count"] == 3

def test_tool3_reorder_pages():
    doc = client.post("/api/document/sample?pages=4").json()
    reorder_res = client.post("/api/organise/reorder", json={
        "file_id": doc["file_id"],
        "page_order": [4, 3, 2, 1]
    })
    assert reorder_res.status_code == 200
    reordered = reorder_res.json()
    assert reordered["page_count"] == 4
    assert reordered["file_id"] != doc["file_id"]

    # Invalid page bounds error
    err_res = client.post("/api/organise/reorder", json={
        "file_id": doc["file_id"],
        "page_order": [1, 99]
    })
    assert err_res.status_code == 400

def test_tool4_rotate_pages():
    doc = client.post("/api/document/sample?pages=3").json()
    rot_res = client.post("/api/organise/rotate", json={
        "file_id": doc["file_id"],
        "page_numbers": [1],
        "angle": 90
    })
    assert rot_res.status_code == 200
    rotated = rot_res.json()
    assert rotated["pages"][0]["rotation"] == 90
    assert rotated["pages"][1]["rotation"] == 0

    # Invalid angle rejection
    bad_rot = client.post("/api/organise/rotate", json={
        "file_id": doc["file_id"],
        "page_numbers": [1],
        "angle": 45
    })
    assert bad_rot.status_code == 400

def test_tool5_delete_pages():
    doc = client.post("/api/document/sample?pages=5").json()
    del_res = client.post("/api/organise/delete", json={
        "file_id": doc["file_id"],
        "page_numbers": [2, 4]
    })
    assert del_res.status_code == 200
    deleted = del_res.json()
    assert deleted["page_count"] == 3

    # Attempt deleting all pages must fail
    all_del = client.post("/api/organise/delete", json={
        "file_id": doc["file_id"],
        "page_numbers": [1, 2, 3, 4, 5]
    })
    assert all_del.status_code == 400

def test_tool6_duplicate_pages():
    doc = client.post("/api/document/sample?pages=3").json()
    dup_res = client.post("/api/organise/duplicate", json={
        "file_id": doc["file_id"],
        "page_numbers": [2],
        "count": 2
    })
    assert dup_res.status_code == 200
    duplicated = dup_res.json()
    assert duplicated["page_count"] == 5 # 3 original + 2 copies of p2

def test_tool7_extract_pages():
    doc = client.post("/api/document/sample?pages=5").json()
    ext_res = client.post("/api/organise/extract", json={
        "file_id": doc["file_id"],
        "page_numbers": [1, 3, 5],
        "output_filename": "odd_pages.pdf"
    })
    assert ext_res.status_code == 200
    extracted = ext_res.json()
    assert extracted["page_count"] == 3
    assert extracted["filename"] == "odd_pages.pdf"

    # Verify original document was not modified
    orig_info = client.get(f"/api/document/{doc['file_id']}/info").json()
    assert orig_info["page_count"] == 5

def test_tool8_insert_blank_page():
    doc = client.post("/api/document/sample?pages=3").json()
    blank_res = client.post("/api/organise/insert-blank", json={
        "file_id": doc["file_id"],
        "target_page": 2,
        "position": "after",
        "count": 1,
        "paper_size": "A4",
        "orientation": "landscape"
    })
    assert blank_res.status_code == 200
    with_blank = blank_res.json()
    assert with_blank["page_count"] == 4
    # Page 3 is the new blank landscape page (842 x 595 pt)
    blank_p = with_blank["pages"][2]
    assert blank_p["width"] == 842.0
    assert blank_p["height"] == 595.0

def test_tool9_crop_pages():
    doc = client.post("/api/document/sample?pages=2").json()
    crop_res = client.post("/api/organise/crop", json={
        "file_id": doc["file_id"],
        "page_numbers": [1],
        "crop_box": {
            "left": 20.0,
            "bottom": 30.0,
            "right": 20.0,
            "top": 30.0
        }
    })
    assert crop_res.status_code == 200
    cropped = crop_res.json()
    assert cropped["page_count"] == 2
    # Verify cropped dimensions
    p1 = cropped["pages"][0]
    assert p1["width"] == 555.0 # 595 - 40
    assert p1["height"] == 782.0 # 842 - 60
