"""
Tests for v1.0.1 Remediation Priorities:
- Secure Raster Image Redaction (underlying pixel modification)
- Synthetic PDF Generator Indirect Reference Compliance
- Embedded Content Sanitization & Safety Warnings
"""

import io
import subprocess
import tempfile
import os
import pypdf
from pypdf.generic import NameObject, DictionaryObject, TextStringObject, ArrayObject
from PIL import Image

from main import app
from fastapi.testclient import TestClient
from services.pdf_document import PDFDocumentService
from services.pdf_edit import PDFEditService
from services.pdf_finish import PDFMetadataService
from schemas.edit import BatchApplyEditsRequest, RedactAnnotationItem, Rect
from schemas.finish import RemoveMetadataRequest
from utils.storage import save_uploaded_file, get_file_path

client = TestClient(app)

def test_secure_raster_image_redaction_pixels():
    """Verify that redaction permanently modifies underlying image pixels in the XObject."""
    # Create test PDF with a solid red 200x200 image
    writer = pypdf.PdfWriter()
    page = writer.add_blank_page(width=400, height=400)
    
    test_img = Image.new("RGB", (200, 200), color=(255, 0, 0))
    img_buf = io.BytesIO()
    test_img.save(img_buf, format="JPEG")
    
    # Place image on page at (100, 100) with size 200x200
    # In PDF coordinates: q 200 0 0 200 100 100 cm /Im0 Do Q
    from pypdf.generic import DecodedStreamObject
    stream = DecodedStreamObject()
    stream.set_data(b"q 200.0 0 0 200.0 100.0 100.0 cm /Im0 Do Q\n")
    ind_stream = writer._add_object(stream)
    page[NameObject("/Contents")] = ind_stream
    
    # Add XObject
    img_stream = pypdf.generic.EncodedStreamObject()
    img_stream._data = img_buf.getvalue()
    img_stream[NameObject("/Type")] = NameObject("/XObject")
    img_stream[NameObject("/Subtype")] = NameObject("/Image")
    img_stream[NameObject("/Width")] = pypdf.generic.NumberObject(200)
    img_stream[NameObject("/Height")] = pypdf.generic.NumberObject(200)
    img_stream[NameObject("/ColorSpace")] = NameObject("/DeviceRGB")
    img_stream[NameObject("/BitsPerComponent")] = pypdf.generic.NumberObject(8)
    img_stream[NameObject("/Filter")] = NameObject("/DCTDecode")
    img_stream[NameObject("/Length")] = pypdf.generic.NumberObject(len(img_buf.getvalue()))
    
    ind_img = writer._add_object(img_stream)
    page[NameObject("/Resources")] = DictionaryObject({
        NameObject("/XObject"): DictionaryObject({
            NameObject("/Im0"): ind_img
        })
    })
    
    pdf_buf = io.BytesIO()
    writer.write(pdf_buf)
    
    fid, fpath = save_uploaded_file(pdf_buf.getvalue(), "raster_test.pdf")
    
    # Apply redaction over left half of the image: (100, 100, 100, 200)
    req = BatchApplyEditsRequest(redactions=[
        RedactAnnotationItem(
            id="red_img_test",
            page_number=1,
            rects=[Rect(x=100, y=100, width=100, height=200)],
            fill_color="#000000"
        )
    ])
    
    doc_res = PDFEditService.apply_batch_edits(fid, req)
    out_path = get_file_path(doc_res.file_id)
    
    # Verify the exported PDF with pypdf and poppler pdfimages
    reader = pypdf.PdfReader(str(out_path))
    re_extracted = reader.pages[0].images[0].image
    
    # Redacted region: x in [0, 100] in image pixels
    redacted_pixel = re_extracted.getpixel((50, 100))
    # Unredacted region: x in [101, 199] in image pixels
    unredacted_pixel = re_extracted.getpixel((150, 100))
    
    assert redacted_pixel == (0, 0, 0), f"Expected (0, 0, 0) but got {redacted_pixel}"
    assert unredacted_pixel[0] > 200, f"Expected red pixel but got {unredacted_pixel}"

def test_synthetic_pdf_generator_poppler_compliance():
    """Verify that synthetic PDF generator uses valid indirect object references for /Contents."""
    fid, fpath = PDFDocumentService.create_synthetic_pdf(num_pages=5)
    
    # Inspect with pdfinfo
    res_info = subprocess.run(["pdfinfo", str(fpath)], capture_output=True, text=True)
    assert res_info.returncode == 0
    assert "Syntax Error" not in res_info.stderr
    assert "wrong type (stream)" not in res_info.stderr
    
    # Inspect with pdftotext
    res_text = subprocess.run(["pdftotext", str(fpath), "-"], capture_output=True, text=True)
    assert res_text.returncode == 0
    assert "Syntax Error" not in res_text.stderr
    assert len(res_text.stdout) > 0

def test_embedded_content_sanitization_and_reporting():
    """Verify that remove_metadata purges attachments, scripts, actions, and reports metrics."""
    w = pypdf.PdfWriter()
    w.add_blank_page(width=200, height=200)
    w.add_attachment("confidential_budget.xlsx", b"sensitive payload data")
    
    js_dict = DictionaryObject({
        NameObject("/S"): NameObject("/JavaScript"),
        NameObject("/JS"): TextStringObject("app.alert('Test');")
    })
    
    # Preserve /EmbeddedFiles created by add_attachment in /Names
    names_ref = w._root_object.get(NameObject("/Names"))
    if hasattr(names_ref, "get_object"):
        names = names_ref.get_object()
    else:
        names = names_ref or DictionaryObject()
        w._root_object[NameObject("/Names")] = names
        
    names[NameObject("/JavaScript")] = DictionaryObject({
        NameObject("/Names"): ArrayObject([TextStringObject("Script1"), js_dict])
    })
    w._root_object[NameObject("/OpenAction")] = js_dict
    w.add_metadata({"/Title": "Classified Project", "/Author": "Auditor"})
    
    buf = io.BytesIO()
    w.write(buf)
    fid, fpath = save_uploaded_file(buf.getvalue(), "embedded_test.pdf")
    
    req = RemoveMetadataRequest(file_id=fid, mode="deep")
    doc_info, report = PDFMetadataService.remove_metadata(req)
    
    assert report.is_sanitized is True
    assert "confidential_budget.xlsx" in report.embedded_files_removed
    assert report.scripts_removed >= 1
    assert report.actions_removed >= 1
    assert len(report.warnings) == 0
    
    out_path = get_file_path(doc_info.file_id)
    r_out = pypdf.PdfReader(str(out_path))
    assert len(r_out.attachments) == 0
    assert "/OpenAction" not in r_out.trailer["/Root"]
    assert "/JavaScript" not in r_out.trailer["/Root"].get("/Names", {})
