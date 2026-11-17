import io
import pytest
import zlib
from PIL import Image, ImageDraw
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    DecodedStreamObject,
    NameObject,
    NumberObject,
    DictionaryObject,
    ArrayObject
)
from schemas.edit import Rect, RedactAnnotationItem
from services.pdf_redact import apply_redaction_to_page, scan_page_images_recursive

def create_rgb_grid_image(w=200, h=200):
    im = Image.new("RGB", (w, h), (255, 255, 255))
    draw = ImageDraw.Draw(im)
    draw.rectangle([0, 0, w//2, h//2], fill=(255, 0, 0)) # TL: Red
    draw.rectangle([w//2, 0, w, h//2], fill=(0, 255, 0)) # TR: Green
    draw.rectangle([0, h//2, w//2, h], fill=(0, 0, 255)) # BL: Blue
    draw.rectangle([w//2, h//2, w, h], fill=(255, 255, 0)) # BR: Yellow
    buf = io.BytesIO()
    im.save(buf, format="JPEG")
    return buf.getvalue()

def test_multi_use_image_cloning_and_redaction():
    """Verify that when an image is used multiple times, redacting one occurrence clones it and zeroes pixels."""
    jpeg_bytes = create_rgb_grid_image(200, 200)
    writer = PdfWriter()
    page = writer.add_blank_page(width=600, height=800)

    img_stream = DecodedStreamObject()
    img_stream.set_data(jpeg_bytes)
    img_stream[NameObject("/Type")] = NameObject("/XObject")
    img_stream[NameObject("/Subtype")] = NameObject("/Image")
    img_stream[NameObject("/Width")] = NumberObject(200)
    img_stream[NameObject("/Height")] = NumberObject(200)
    img_stream[NameObject("/ColorSpace")] = NameObject("/DeviceRGB")
    img_stream[NameObject("/BitsPerComponent")] = NumberObject(8)
    img_stream[NameObject("/Filter")] = NameObject("/DCTDecode")
    img_ref = writer._add_object(img_stream)

    page[NameObject("/Resources")] = DictionaryObject({
        NameObject("/XObject"): DictionaryObject({NameObject("/ImShared"): img_ref})
    })

    # Draw image twice:
    # 1. At [50, 500, 150, 150]
    # 2. At [350, 100, 150, 150]
    stream_content = b"q 150 0 0 150 50 500 cm /ImShared Do Q\nq 150 0 0 150 350 100 cm /ImShared Do Q\n"
    s_obj = DecodedStreamObject()
    s_obj.set_data(stream_content)
    page[NameObject("/Contents")] = writer._add_object(s_obj)

    # Redact only the first occurrence: [50, 500, 150, 150]
    redact_item = RedactAnnotationItem(
        page_number=1,
        rects=[Rect(x=50, y=500, width=150, height=150)],
        fill_color="#000000"
    )
    apply_redaction_to_page(page, redact_item, 600, 800, writer=writer)

    # Inspect page resources: Should have cloned object e.g. /ImShared_redacted_1
    xobjs = page["/Resources"]["/XObject"]
    assert len(xobjs) == 2, f"Expected 2 XObjects (orig and cloned), found {len(xobjs)}"

    # Check cloned image has black pixels
    cloned_key = [k for k in xobjs.keys() if "redacted" in str(k)][0]
    cloned_obj = xobjs[cloned_key].get_object()
    cloned_im = Image.open(io.BytesIO(cloned_obj.get_data()))
    # Top-left quadrant was red, should now be black (0, 0, 0)
    assert cloned_im.getpixel((50, 50)) == (0, 0, 0), "Expected cloned image to be redacted"

    # Check original image still exists and is intact for occurrence 2
    orig_obj = xobjs[NameObject("/ImShared")].get_object()
    orig_im = Image.open(io.BytesIO(orig_obj.get_data()))
    # Original should still have red in top-left
    assert orig_im.getpixel((50, 50))[0] > 200, "Expected original image to remain intact for unredacted occurrence"

def test_nested_form_xobject_traversal_and_redaction():
    """Verify that images nested inside Form XObjects are discovered and redacted."""
    jpeg_bytes = create_rgb_grid_image(200, 200)
    writer = PdfWriter()
    page = writer.add_blank_page(width=600, height=800)

    # Image
    img_stream = DecodedStreamObject()
    img_stream.set_data(jpeg_bytes)
    img_stream[NameObject("/Type")] = NameObject("/XObject")
    img_stream[NameObject("/Subtype")] = NameObject("/Image")
    img_stream[NameObject("/Width")] = NumberObject(200)
    img_stream[NameObject("/Height")] = NumberObject(200)
    img_stream[NameObject("/ColorSpace")] = NameObject("/DeviceRGB")
    img_stream[NameObject("/BitsPerComponent")] = NumberObject(8)
    img_stream[NameObject("/Filter")] = NameObject("/DCTDecode")
    img_ref = writer._add_object(img_stream)

    # Form XObject containing image
    form_stream = DecodedStreamObject()
    form_stream.set_data(b"q 200 0 0 200 0 0 cm /ImNested Do Q\n")
    form_stream[NameObject("/Type")] = NameObject("/XObject")
    form_stream[NameObject("/Subtype")] = NameObject("/Form")
    form_stream[NameObject("/BBox")] = ArrayObject([NumberObject(0), NumberObject(0), NumberObject(200), NumberObject(200)])
    form_stream[NameObject("/Resources")] = DictionaryObject({
        NameObject("/XObject"): DictionaryObject({NameObject("/ImNested"): img_ref})
    })
    form_ref = writer._add_object(form_stream)

    # Page draws Form XObject at [100, 400]
    page[NameObject("/Resources")] = DictionaryObject({
        NameObject("/XObject"): DictionaryObject({NameObject("/Fm1"): form_ref})
    })
    page_content = b"q 1 0 0 1 100 400 cm /Fm1 Do Q\n"
    s_obj = DecodedStreamObject()
    s_obj.set_data(page_content)
    page[NameObject("/Contents")] = writer._add_object(s_obj)

    # Redact area over Form XObject: [100, 400, 200, 200]
    redact_item = RedactAnnotationItem(
        page_number=1,
        rects=[Rect(x=100, y=400, width=200, height=200)],
        fill_color="#000000"
    )
    apply_redaction_to_page(page, redact_item, 600, 800, writer=writer)

    # Inspect nested image
    nested_obj = form_stream["/Resources"]["/XObject"]["/ImNested"].get_object()
    nested_im = Image.open(io.BytesIO(nested_obj.get_data()))
    black_count = sum(1 for p in nested_im.getdata() if p == (0, 0, 0))
    pct = (black_count / (nested_im.width * nested_im.height)) * 100
    assert pct >= 85.0, f"Expected nested image to be blacked out, got {pct:.1f}%"

def test_smask_soft_mask_redaction():
    """Verify that /SMask soft mask transparency stream is redacted in sync with base image."""
    jpeg_bytes = create_rgb_grid_image(200, 200)
    writer = PdfWriter()
    page = writer.add_blank_page(width=600, height=800)

    # Grayscale SMask (50% gray 128)
    mask_im = Image.new("L", (200, 200), 128)
    mask_buf = io.BytesIO()
    mask_im.save(mask_buf, format="JPEG")

    mask_stream = DecodedStreamObject()
    mask_stream.set_data(mask_buf.getvalue())
    mask_stream[NameObject("/Type")] = NameObject("/XObject")
    mask_stream[NameObject("/Subtype")] = NameObject("/Image")
    mask_stream[NameObject("/Width")] = NumberObject(200)
    mask_stream[NameObject("/Height")] = NumberObject(200)
    mask_stream[NameObject("/ColorSpace")] = NameObject("/DeviceGray")
    mask_stream[NameObject("/BitsPerComponent")] = NumberObject(8)
    mask_stream[NameObject("/Filter")] = NameObject("/DCTDecode")
    mask_ref = writer._add_object(mask_stream)

    img_stream = DecodedStreamObject()
    img_stream.set_data(jpeg_bytes)
    img_stream[NameObject("/Type")] = NameObject("/XObject")
    img_stream[NameObject("/Subtype")] = NameObject("/Image")
    img_stream[NameObject("/Width")] = NumberObject(200)
    img_stream[NameObject("/Height")] = NumberObject(200)
    img_stream[NameObject("/ColorSpace")] = NameObject("/DeviceRGB")
    img_stream[NameObject("/BitsPerComponent")] = NumberObject(8)
    img_stream[NameObject("/Filter")] = NameObject("/DCTDecode")
    img_stream[NameObject("/SMask")] = mask_ref
    img_ref = writer._add_object(img_stream)

    page[NameObject("/Resources")] = DictionaryObject({
        NameObject("/XObject"): DictionaryObject({NameObject("/ImMask"): img_ref})
    })

    page_content = b"q 200 0 0 200 100 400 cm /ImMask Do Q\n"
    s_obj = DecodedStreamObject()
    s_obj.set_data(page_content)
    page[NameObject("/Contents")] = writer._add_object(s_obj)

    # Full redaction of image: [100, 400, 200, 200]
    redact_item = RedactAnnotationItem(
        page_number=1,
        rects=[Rect(x=100, y=400, width=200, height=200)],
        fill_color="#000000"
    )
    apply_redaction_to_page(page, redact_item, 600, 800, writer=writer)

    # In full redaction, /SMask reference is deleted and stream is eradicated
    im_obj = page["/Resources"]["/XObject"]["/ImMask"].get_object()
    assert "/SMask" not in im_obj or len(mask_stream._data) == 0, "Expected /SMask to be removed or wiped on full redaction"
