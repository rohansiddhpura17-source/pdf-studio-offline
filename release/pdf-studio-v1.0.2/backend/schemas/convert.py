from typing import List, Optional, Literal
from pydantic import BaseModel, Field

class ImageConvertItem(BaseModel):
    image_base64: Optional[str] = None
    data_base64: Optional[str] = None
    name: Optional[str] = "image"
    rotation: int = 0

class ImagesToPdfRequest(BaseModel):
    images: List[ImageConvertItem]
    page_size: str = "A4"  # A4, A3, A5, Letter, Legal, Original, Custom
    orientation: Literal['portrait', 'landscape', 'auto'] = 'portrait'
    fit_mode: Literal['fit', 'fill', 'stretch'] = 'fit'
    margin: float = 36.0
    margin_pt: Optional[float] = None
    background_color: str = "#FFFFFF"
    bg_color: Optional[str] = None
    custom_width: Optional[float] = None
    custom_height: Optional[float] = None
    output_filename: str = "converted_document.pdf"

class PdfToImagesRequest(BaseModel):
    file_id: str
    format: Literal['png', 'jpeg'] = 'png'
    dpi: int = 150
    quality: int = 85
    page_selection: Optional[List[int]] = None
    page_range: Optional[str] = None

class RenderedImageItem(BaseModel):
    page_number: int
    image_base64: str
    width: int
    height: int
    size_bytes: int
    format: str

class PdfToImagesResponse(BaseModel):
    total_pages_rendered: int
    images: List[RenderedImageItem]
    archive_file_id: Optional[str] = None
    archive_filename: Optional[str] = None
    format: str = "png"
    dpi: int = 150

class PdfToTextRequest(BaseModel):
    file_id: str
    extraction_mode: Optional[Literal['plain', 'layout']] = 'plain'
    mode: Optional[Literal['plain', 'layout']] = None
    include_page_headers: Optional[bool] = True
    preserve_page_breaks: Optional[bool] = None
    page_selection: Optional[List[int]] = None
    page_range: Optional[str] = None

class PageTextItem(BaseModel):
    page_number: int
    text: str
    char_count: int = 0
    character_count: int = 0
    is_scanned_likely: bool = False
    is_likely_scanned: bool = False

class PdfToTextResponse(BaseModel):
    full_text: str
    total_chars: int = 0
    total_characters: int = 0
    pages: List[PageTextItem]
    has_scanned_pages: bool = False
    scanned_warning: Optional[str] = None
