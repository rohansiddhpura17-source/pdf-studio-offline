from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field

# 1. Compression Schemas
class CompressRequest(BaseModel):
    file_id: str
    preset: Literal['max_quality', 'balanced', 'strong', 'custom'] = 'balanced'
    dpi: Optional[int] = 150
    jpeg_quality: Optional[int] = 85
    compress_streams: bool = True
    remove_duplicate_objects: bool = True
    optimize_images: bool = True
    preserve_metadata: bool = True

class CompressResponse(BaseModel):
    file_id: str
    original_filename: str
    original_size_bytes: int
    compressed_size_bytes: int
    bytes_saved: int
    percent_reduction: float
    page_count: int
    duration_ms: float
    preset: str
    is_already_optimized: bool
    details: str

# 2. Metadata Schemas
class MetadataInfo(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    subject: Optional[str] = None
    keywords: Optional[str] = None
    creator: Optional[str] = None
    producer: Optional[str] = None
    creation_date: Optional[str] = None
    mod_date: Optional[str] = None
    custom_metadata: Dict[str, str] = Field(default_factory=dict)

class DocumentProperties(BaseModel):
    pdf_version: str = "1.7"
    page_count: int
    file_size_bytes: int
    page_dimensions: str
    is_encrypted: bool
    has_xmp: bool
    metadata_fields_found: List[str] = Field(default_factory=list)

class GetMetadataResponse(BaseModel):
    file_id: str
    filename: str
    metadata: MetadataInfo
    properties: DocumentProperties

class EditMetadataRequest(BaseModel):
    file_id: str
    metadata: MetadataInfo

class RemoveMetadataRequest(BaseModel):
    file_id: str
    mode: Literal['standard', 'deep'] = 'standard'
    remove_author: bool = True
    remove_title: bool = True
    remove_subject: bool = True
    remove_keywords: bool = True
    remove_creator_producer: bool = True
    remove_timestamps: bool = True
    remove_custom_entries: bool = True
    remove_xmp: bool = True
    remove_thumbnails: bool = True
    remove_embedded_files: bool = True
    remove_javascript: bool = True
    remove_actions: bool = True

class PrivacyVerificationReport(BaseModel):
    file_id: str
    mode: str
    fields_before: List[str]
    fields_removed: List[str]
    fields_remaining: List[str]
    embedded_files_found: List[str] = Field(default_factory=list)
    embedded_files_removed: List[str] = Field(default_factory=list)
    scripts_removed: int = 0
    actions_removed: int = 0
    warnings: List[str] = Field(default_factory=list)
    is_sanitized: bool
    details: str

# 3. Comparison Schemas
class CompareRequest(BaseModel):
    original_file_id: str
    revised_file_id: str
    mode: Literal['all', 'text', 'visual'] = 'all'
    sensitivity_threshold: int = 15

class TextDiffBlock(BaseModel):
    page_number: int
    type: Literal['added', 'removed', 'modified', 'unchanged']
    text: str
    old_text: Optional[str] = None
    new_text: Optional[str] = None

class PageVisualDiffItem(BaseModel):
    page_number: int
    orig_page_image_b64: Optional[str] = None
    rev_page_image_b64: Optional[str] = None
    diff_heatmap_b64: Optional[str] = None
    diff_percentage: float = 0.0
    has_visual_change: bool = False
    is_unpaired: bool = False
    unpaired_status: Optional[str] = None

class CompareResponse(BaseModel):
    comparison_id: str
    orig_file_id: str
    orig_filename: str
    orig_page_count: int
    rev_file_id: str
    rev_filename: str
    rev_page_count: int
    added_pages: List[int] = Field(default_factory=list)
    removed_pages: List[int] = Field(default_factory=list)
    pages_with_text_changes: List[int] = Field(default_factory=list)
    pages_with_visual_changes: List[int] = Field(default_factory=list)
    total_text_differences: int = 0
    total_visual_differences: int = 0
    duration_ms: float
    text_diffs: List[TextDiffBlock] = Field(default_factory=list)
    visual_diffs: List[PageVisualDiffItem] = Field(default_factory=list)
    summary: str
