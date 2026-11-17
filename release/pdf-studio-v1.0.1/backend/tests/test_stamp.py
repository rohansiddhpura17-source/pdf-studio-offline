import io
import base64
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from pypdf import PdfWriter, PdfReader
from pypdf.generic import NameObject, DictionaryObject, DecodedStreamObject

from main import app
from utils.storage import get_file_path

client = TestClient(app, base_url="http://127.0.0.1:8001")

def create_sample_pdf(page_count: int = 3, text_per_page: str = "Standard body text") -> str:
    """Helper to generate a multi-page PDF and return its file_id."""
    writer = PdfWriter()
    for i in range(1, page_count + 1):
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
        stream.set_data(f"BT /Helvetica 14 Tf 50 700 Td ({text_per_page} on Page {i}) Tj ET".encode('latin1'))
        page[NameObject('/Contents')] = stream

    buf = io.BytesIO()
    writer.write(buf)
    buf.seek(0)

    resp = client.post(
        "/api/document/upload",
        files={"file": ("test_stamp_doc.pdf", buf.getvalue(), "application/pdf")}
    )
    assert resp.status_code == 200
    return resp.json()["file_id"]

def create_base64_png(color=(255, 0, 0, 180), size=(120, 60)) -> str:
    img = Image.new("RGBA", size, color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode('ascii')


def test_tool1_text_watermark():
    file_id = create_sample_pdf(page_count=2)
    resp = client.post(
        "/api/stamp/watermark",
        json={
            "file_id": file_id,
            "watermark_type": "text",
            "text": "TOP SECRET DRAFT",
            "font_family": "Helvetica",
            "font_size": 48.0,
            "color": "#D92828",
            "opacity": 0.3,
            "rotation": 45.0,
            "position": "center",
            "repeat": False,
            "placement": "foreground",
        }
    )
    assert resp.status_code == 200
    doc = resp.json()
    new_path = get_file_path(doc["file_id"])
    reader = PdfReader(new_path)
    # Check that watermark was stamped into page
    assert "TOP SECRET DRAFT" in reader.pages[0].extract_text()
    assert "TOP SECRET DRAFT" in reader.pages[1].extract_text()


def test_tool1_image_watermark():
    file_id = create_sample_pdf(page_count=2)
    img_b64 = create_base64_png(size=(100, 50))
    resp = client.post(
        "/api/stamp/watermark",
        json={
            "file_id": file_id,
            "watermark_type": "image",
            "image_base64": img_b64,
            "image_scale": 1.5,
            "rotation": 0.0,
            "placement": "background",
        }
    )
    assert resp.status_code == 200
    doc = resp.json()
    assert doc["page_count"] == 2


def test_tool1_watermark_page_range_filtering():
    file_id = create_sample_pdf(page_count=4)
    resp = client.post(
        "/api/stamp/watermark",
        json={
            "file_id": file_id,
            "watermark_type": "text",
            "text": "CONFIDENTIAL RANGE",
            "page_range": "1, 3",
            "rotation": 0.0,
        }
    )
    assert resp.status_code == 200
    doc = resp.json()
    reader = PdfReader(get_file_path(doc["file_id"]))
    # Page 1 & 3 should have watermark, Page 2 & 4 should not
    assert "CONFIDENTIAL RANGE" in reader.pages[0].extract_text()
    assert "CONFIDENTIAL RANGE" not in reader.pages[1].extract_text()
    assert "CONFIDENTIAL RANGE" in reader.pages[2].extract_text()
    assert "CONFIDENTIAL RANGE" not in reader.pages[3].extract_text()


def test_tool2_page_numbers_arabic():
    file_id = create_sample_pdf(page_count=3)
    resp = client.post(
        "/api/stamp/page-numbers",
        json={
            "file_id": file_id,
            "position": "bottom-center",
            "format": "arabic",
            "prefix": "Page ",
            "include_total": True,
            "separator": " of ",
            "start_number": 1,
            "font_size": 11.0,
        }
    )
    assert resp.status_code == 200
    doc = resp.json()
    reader = PdfReader(get_file_path(doc["file_id"]))
    # Page 1 should contain 'Page 1 of 3'
    assert "Page 1 of 3" in reader.pages[0].extract_text()
    assert "Page 2 of 3" in reader.pages[1].extract_text()
    assert "Page 3 of 3" in reader.pages[2].extract_text()


def test_tool2_page_numbers_roman_and_skip_cover():
    file_id = create_sample_pdf(page_count=4)
    resp = client.post(
        "/api/stamp/page-numbers",
        json={
            "file_id": file_id,
            "position": "bottom-right",
            "format": "roman_upper",
            "skip_cover": True,
            "start_page": 2,
            "start_number": 1,
            "prefix": "Sec - ",
        }
    )
    assert resp.status_code == 200
    doc = resp.json()
    reader = PdfReader(get_file_path(doc["file_id"]))
    # Page 1 (cover) should be skipped
    assert "Sec -" not in reader.pages[0].extract_text()
    # Page 2 should have Roman 'I', Page 3 should have 'II'
    assert "Sec - I" in reader.pages[1].extract_text()
    assert "Sec - II" in reader.pages[2].extract_text()


def test_tool3_headers_and_footers():
    file_id = create_sample_pdf(page_count=2)
    resp = client.post(
        "/api/stamp/header-footer",
        json={
            "file_id": file_id,
            "header_left": "Acme Legal Corp",
            "header_center": "{title}",
            "header_right": "Confidential",
            "footer_left": "Version 1.0",
            "footer_center": "Page {page} of {total}",
            "footer_right": "{date}",
            "divider_line": True,
            "line_thickness": 0.8,
            "font_size": 9.0,
        }
    )
    assert resp.status_code == 200
    doc = resp.json()
    reader = PdfReader(get_file_path(doc["file_id"]))
    p1_text = reader.pages[0].extract_text()
    assert "Acme Legal Corp" in p1_text
    assert "Version 1.0" in p1_text
    assert "Page 1 of 2" in p1_text


def test_tool4_date_stamp():
    file_id = create_sample_pdf(page_count=2)
    resp = client.post(
        "/api/stamp/date",
        json={
            "file_id": file_id,
            "date_text": "07 November 2026",
            "position": "top-right",
            "color": "#17243B",
            "font_size": 10.0,
        }
    )
    assert resp.status_code == 200
    doc = resp.json()
    reader = PdfReader(get_file_path(doc["file_id"]))
    assert "07 November 2026" in reader.pages[0].extract_text()
    assert "07 November 2026" in reader.pages[1].extract_text()
