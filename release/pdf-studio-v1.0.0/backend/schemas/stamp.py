from typing import List, Optional, Literal
from pydantic import BaseModel, Field

class WatermarkRequest(BaseModel):
    file_id: str
    watermark_type: Literal['text', 'image'] = 'text'
    text: Optional[str] = "CONFIDENTIAL"
    font_family: str = "Helvetica"
    font_size: float = 48.0
    color: str = "#D92828"
    opacity: float = 0.2
    rotation: float = 45.0
    position: str = "center"
    repeat: bool = False
    placement: Literal['foreground', 'background'] = 'foreground'
    image_base64: Optional[str] = None
    image_scale: float = 1.0
    page_selection: Optional[List[int]] = None
    page_range: Optional[str] = None
    exclude_pages: Optional[List[int]] = None

class PageNumbersRequest(BaseModel):
    file_id: str
    position: Literal['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] = 'bottom-center'
    font_family: str = "Helvetica"
    font_size: float = 10.0
    color: str = "#17243B"
    bold: bool = False
    italic: bool = False
    margin_x: float = 36.0
    margin_y: float = 36.0
    start_number: int = 1
    prefix: str = ""
    suffix: str = ""
    separator: str = " of "
    format: Literal['arabic', 'padded', 'roman_lower', 'roman_upper'] = 'arabic'
    include_total: bool = False
    start_page: int = 1
    skip_cover: bool = False
    page_selection: Optional[List[int]] = None
    exclude_pages: Optional[List[int]] = None

class HeaderFooterRequest(BaseModel):
    file_id: str
    header_left: Optional[str] = None
    header_center: Optional[str] = None
    header_right: Optional[str] = None
    footer_left: Optional[str] = None
    footer_center: Optional[str] = None
    footer_right: Optional[str] = None
    font_family: str = "Helvetica"
    font_size: float = 9.0
    color: str = "#555555"
    bold: bool = False
    italic: bool = False
    margin_x: float = 36.0
    margin_y: float = 30.0
    divider_line: bool = True
    line_thickness: float = 0.5
    line_color: str = "#DCE3EF"
    skip_cover: bool = False
    page_selection: Optional[List[int]] = None
    page_range: Optional[str] = None

class DateStampRequest(BaseModel):
    file_id: str
    date_text: Optional[str] = None
    format: str = "DD/MM/YYYY"
    position: Literal['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'] = 'top-right'
    font_family: str = "Helvetica"
    font_size: float = 10.0
    color: str = "#17243B"
    opacity: float = 1.0
    rotation: float = 0.0
    margin_x: float = 36.0
    margin_y: float = 36.0
    placement: Literal['foreground', 'background'] = 'foreground'
    page_selection: Optional[List[int]] = None
    page_range: Optional[str] = None
