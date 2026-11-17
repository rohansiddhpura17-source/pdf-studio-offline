from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class PageInfo(BaseModel):
    page_number: int # 1-indexed
    width: float     # Points
    height: float    # Points
    rotation: int    # 0, 90, 180, 270

class DocumentMetadata(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    subject: Optional[str] = None
    keywords: Optional[str] = None
    creator: Optional[str] = None
    producer: Optional[str] = None
    creation_date: Optional[str] = None
    mod_date: Optional[str] = None

class DocumentInfoResponse(BaseModel):
    file_id: str
    filename: str
    size_bytes: int
    page_count: int
    pages: List[PageInfo]
    metadata: DocumentMetadata
    is_encrypted: bool = False
    is_repaired: bool = False

DocumentInfo = DocumentInfoResponse

class OperationResponse(BaseModel):
    success: bool
    message: str
    file_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class SaveAsRequest(BaseModel):
    new_filename: str
