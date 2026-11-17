from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

ShapeType = Literal['rect', 'rounded_rect', 'circle', 'ellipse', 'line', 'arrow']

class Point(BaseModel):
    x: float
    y: float

class Rect(BaseModel):
    x: float
    y: float
    width: float
    height: float

class TextAnnotationItem(BaseModel):
    id: Optional[str] = None
    page_number: int = Field(..., ge=1)
    text: str
    x: float
    y: float
    width: Optional[float] = None
    height: Optional[float] = None
    font_family: str = "Helvetica"  # Helvetica, Times-Roman, Courier
    font_size: float = 14.0
    color: str = "#17243B"  # Hex color
    bold: bool = False
    italic: bool = False
    align: str = "left"  # left, center, right
    opacity: float = 1.0

class ImageAnnotationItem(BaseModel):
    id: Optional[str] = None
    page_number: int = Field(..., ge=1)
    image_base64: str  # Data URL or raw base64
    x: float
    y: float
    width: float
    height: float
    opacity: float = 1.0

class HighlightAnnotationItem(BaseModel):
    id: Optional[str] = None
    page_number: int = Field(..., ge=1)
    rects: List[Rect]
    color: str = "#FFE500"  # Hex color
    opacity: float = 0.4

class DrawPath(BaseModel):
    points: List[Point]
    color: str = "#2859D9"
    width: float = 2.0
    opacity: float = 1.0

class DrawAnnotationItem(BaseModel):
    id: Optional[str] = None
    page_number: int = Field(..., ge=1)
    paths: List[DrawPath]

class ShapeAnnotationItem(BaseModel):
    id: Optional[str] = None
    page_number: int = Field(..., ge=1)
    shape_type: ShapeType
    x: float
    y: float
    width: float
    height: float
    stroke_color: str = "#2859D9"
    stroke_width: float = 2.0
    fill_color: Optional[str] = None  # None for transparent
    opacity: float = 1.0
    radius: Optional[float] = 8.0  # For rounded rect

class WhiteoutAnnotationItem(BaseModel):
    id: Optional[str] = None
    page_number: int = Field(..., ge=1)
    rects: List[Rect]

class RedactAnnotationItem(BaseModel):
    id: Optional[str] = None
    page_number: int = Field(..., ge=1)
    rects: List[Rect]
    target_text: Optional[str] = None
    fill_color: str = "#000000"
    overlay_text: Optional[str] = "[REDACTED]"
    text_color: str = "#FFFFFF"

class SignatureAnnotationItem(BaseModel):
    id: Optional[str] = None
    page_number: int = Field(..., ge=1)
    signature_image_base64: str  # Base64 transparent PNG/JPG
    x: float
    y: float
    width: float
    height: float
    signer_name: Optional[str] = None
    include_timestamp: bool = False
    timestamp_text: Optional[str] = None

class FormFieldInfo(BaseModel):
    name: str
    field_type: str  # 'text', 'checkbox', 'radio', 'choice', 'unknown'
    value: Any = None
    rect: Optional[List[float]] = None  # [x, y, width, height]
    page_number: Optional[int] = None
    options: Optional[List[str]] = None

class GetFormFieldsResponse(BaseModel):
    has_form_fields: bool
    fields: List[FormFieldInfo]

class FormFillRequest(BaseModel):
    field_values: Dict[str, Any]
    flatten: bool = False

class BatchApplyEditsRequest(BaseModel):
    texts: Optional[List[TextAnnotationItem]] = []
    images: Optional[List[ImageAnnotationItem]] = []
    highlights: Optional[List[HighlightAnnotationItem]] = []
    drawings: Optional[List[DrawAnnotationItem]] = []
    shapes: Optional[List[ShapeAnnotationItem]] = []
    whiteouts: Optional[List[WhiteoutAnnotationItem]] = []
    redactions: Optional[List[RedactAnnotationItem]] = []
    signatures: Optional[List[SignatureAnnotationItem]] = []
    form_fills: Optional[Dict[str, Any]] = None
    flatten_forms: bool = False
