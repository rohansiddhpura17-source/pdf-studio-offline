from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from .document import DocumentInfoResponse

class MergeRequest(BaseModel):
    file_ids: List[str] = Field(..., min_length=2, description="List of file IDs to merge in order")
    output_filename: Optional[str] = "merged_document.pdf"

class SplitRequest(BaseModel):
    file_id: str
    mode: Literal["all_pages", "ranges", "after_pages"] = "ranges"
    ranges: Optional[List[str]] = Field(default=None, description="e.g. ['1-3', '4-5']")
    split_after_pages: Optional[List[int]] = Field(default=None, description="e.g. [2, 4]")

class SplitResponse(BaseModel):
    success: bool
    message: str
    output_documents: List[DocumentInfoResponse]

class ReorderRequest(BaseModel):
    file_id: str
    page_order: List[int] = Field(..., description="1-indexed list of page numbers in desired sequence")

class RotateRequest(BaseModel):
    file_id: str
    page_numbers: List[int] = Field(..., description="1-indexed page numbers to rotate")
    angle: int = Field(..., description="Rotation angle: 90, 180, or 270 degrees clockwise")

class DeleteRequest(BaseModel):
    file_id: str
    page_numbers: List[int] = Field(..., description="1-indexed page numbers to delete")

class DuplicateRequest(BaseModel):
    file_id: str
    page_numbers: List[int] = Field(..., description="1-indexed page numbers to duplicate")
    count: int = Field(default=1, ge=1, le=10, description="Number of copies per page")

class ExtractRequest(BaseModel):
    file_id: str
    page_numbers: List[int] = Field(..., description="1-indexed page numbers to extract")
    output_filename: Optional[str] = "extracted_pages.pdf"

class InsertBlankRequest(BaseModel):
    file_id: str
    target_page: int = Field(..., ge=1, description="1-indexed anchor page")
    position: Literal["before", "after"] = "after"
    count: int = Field(default=1, ge=1, le=20)
    paper_size: Literal["A4", "Letter"] = "A4"
    orientation: Literal["portrait", "landscape"] = "portrait"

class CropBox(BaseModel):
    left: float = Field(default=0.0, ge=0.0)
    bottom: float = Field(default=0.0, ge=0.0)
    right: float = Field(default=0.0, ge=0.0)
    top: float = Field(default=0.0, ge=0.0)

class CropRequest(BaseModel):
    file_id: str
    page_numbers: List[int] = Field(..., description="1-indexed page numbers to crop")
    crop_box: CropBox
