import io
import base64
import zipfile
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from pypdf import PdfWriter, PdfReader
from pypdf.generic import NameObject, DictionaryObject, DecodedStreamObject

from main import app
from utils.storage import get_file_path

client = TestClient(app, base_url="http://127.0.0.1:8001")

def create_base64_img(color=(40, 90, 220), size=(200, 150), fmt="PNG") -> str:
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    b64_str = base64.b64encode(buf.getvalue()).decode('ascii')
    return f"data:image/{fmt.lower()};base64,{b64_str}"

def create_sample_pdf_with_text(paragraphs: list[str]) -> str:
    writer = PdfWriter()
    for idx, para in enumerate(paragraphs, 1):
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
    buf.seek(0)
    resp = client.post(
        "/api/document/upload",
        files={"file": ("test_convert_source.pdf", buf.getvalue(), "application/pdf")}
    )
    assert resp.status_code == 200
    return resp.json()["file_id"]


def test_tool5_images_to_pdf():
    img1 = create_base64_img(color=(255, 0, 0), size=(300, 200))
    img2 = create_base64_img(color=(0, 255, 0), size=(400, 300))
    img3 = create_base64_img(color=(0, 0, 255), size=(500, 400))

    resp = client.post(
        "/api/convert/images-to-pdf",
        json={
            "images": [
                {"image_base64": img1, "name": "slide1.png"},
                {"image_base64": img2, "name": "slide2.png"},
                {"image_base64": img3, "name": "slide3.png"},
            ],
            "page_size": "A4",
            "orientation": "portrait",
            "fit_mode": "fit",
            "margin": 36.0,
            "output_filename": "photo_album.pdf",
        }
    )
    assert resp.status_code == 200
    doc = resp.json()
    assert doc["page_count"] == 3
    assert doc["filename"] == "photo_album.pdf"

    reader = PdfReader(get_file_path(doc["file_id"]))
    assert len(reader.pages) == 3
    # Check page size A4 (approx 595 x 842 pt)
    box = reader.pages[0].mediabox
    assert abs(float(box.width) - 595.28) < 1.0
    assert abs(float(box.height) - 841.89) < 1.0


def test_tool5_images_to_pdf_empty_error():
    resp = client.post(
        "/api/convert/images-to-pdf",
        json={"images": []}
    )
    assert resp.status_code == 400


def test_tool6_pdf_to_images_png():
    file_id = create_sample_pdf_with_text(["First page graphics", "Second page invoice"])
    resp = client.post(
        "/api/convert/pdf-to-images",
        json={
            "file_id": file_id,
            "format": "png",
            "dpi": 150,
            "page_selection": [1, 2],
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_pages_rendered"] == 2
    assert len(data["images"]) == 2
    assert data["archive_file_id"] is not None

    # Test downloading the ZIP archive
    archive_id = data["archive_file_id"]
    zip_resp = client.get(f"/api/convert/download/{archive_id}")
    assert zip_resp.status_code == 200
    assert zip_resp.headers["content-type"] == "application/zip"

    # Verify zip archive content
    with zipfile.ZipFile(io.BytesIO(zip_resp.content)) as zf:
        namelist = zf.namelist()
        assert len(namelist) == 2
        assert any("page_01.png" in name for name in namelist)


def test_tool6_pdf_to_images_jpeg_quality():
    file_id = create_sample_pdf_with_text(["High-res diagram on page 1"])
    resp = client.post(
        "/api/convert/pdf-to-images",
        json={
            "file_id": file_id,
            "format": "jpeg",
            "dpi": 200,
            "quality": 90,
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_pages_rendered"] == 1
    assert data["images"][0]["format"] == "jpeg"


def test_tool7_pdf_to_text():
    paras = [
        "Bharat Space Education Research Centre GenAI Internship Project 1.",
        "Module D provides genuine text extraction preserving paragraphs and reading order.",
    ]
    file_id = create_sample_pdf_with_text(paras)

    resp = client.post(
        "/api/convert/pdf-to-text",
        json={
            "file_id": file_id,
            "extraction_mode": "plain",
            "include_page_headers": True,
        }
    )
    assert resp.status_code == 200
    result = resp.json()
    assert "Bharat Space Education Research Centre" in result["full_text"]
    assert "Module D provides genuine text extraction" in result["full_text"]
    assert result["total_chars"] > 50
    assert len(result["pages"]) == 2


def test_tool7_pdf_to_text_scanned_detection():
    # Create empty/blank PDF with no text stream
    writer = PdfWriter()
    writer.add_blank_page(width=500, height=500)
    buf = io.BytesIO()
    writer.write(buf)
    buf.seek(0)
    upload_res = client.post(
        "/api/document/upload",
        files={"file": ("scanned_mock.pdf", buf.getvalue(), "application/pdf")}
    )
    blank_fid = upload_res.json()["file_id"]

    resp = client.post(
        "/api/convert/pdf-to-text",
        json={
            "file_id": blank_fid,
            "extraction_mode": "plain",
        }
    )
    assert resp.status_code == 200
    result = resp.json()
    assert result["has_scanned_pages"] is True
    assert "Scanned Document Detected" in result["scanned_warning"]
    assert "OCR" in result["scanned_warning"]
