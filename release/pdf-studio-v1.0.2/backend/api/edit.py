from fastapi import APIRouter, HTTPException, Depends
from schemas.document import DocumentInfo
from schemas.edit import (
    TextAnnotationItem,
    ImageAnnotationItem,
    HighlightAnnotationItem,
    DrawAnnotationItem,
    ShapeAnnotationItem,
    WhiteoutAnnotationItem,
    RedactAnnotationItem,
    SignatureAnnotationItem,
    FormFillRequest,
    GetFormFieldsResponse,
    BatchApplyEditsRequest,
)
from services.pdf_edit import PDFEditService

router = APIRouter(prefix="/api/edit", tags=["Edit"])

@router.get("/{file_id}/form-fields", response_model=GetFormFieldsResponse)
async def get_form_fields(file_id: str):
    try:
        return PDFEditService.get_form_fields(file_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to inspect form fields: {str(e)}")

@router.post("/{file_id}/batch", response_model=DocumentInfo)
async def batch_apply_edits(file_id: str, edits: BatchApplyEditsRequest):
    try:
        return PDFEditService.apply_batch_edits(file_id, edits)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply edits: {str(e)}")

@router.post("/{file_id}/text", response_model=DocumentInfo)
async def add_text(file_id: str, item: TextAnnotationItem):
    try:
        req = BatchApplyEditsRequest(texts=[item])
        return PDFEditService.apply_batch_edits(file_id, req)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add text: {str(e)}")

@router.post("/{file_id}/image", response_model=DocumentInfo)
async def add_image(file_id: str, item: ImageAnnotationItem):
    try:
        req = BatchApplyEditsRequest(images=[item])
        return PDFEditService.apply_batch_edits(file_id, req)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add image: {str(e)}")

@router.post("/{file_id}/highlight", response_model=DocumentInfo)
async def add_highlight(file_id: str, item: HighlightAnnotationItem):
    try:
        req = BatchApplyEditsRequest(highlights=[item])
        return PDFEditService.apply_batch_edits(file_id, req)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add highlight: {str(e)}")

@router.post("/{file_id}/draw", response_model=DocumentInfo)
async def add_draw(file_id: str, item: DrawAnnotationItem):
    try:
        req = BatchApplyEditsRequest(drawings=[item])
        return PDFEditService.apply_batch_edits(file_id, req)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add drawing: {str(e)}")

@router.post("/{file_id}/shape", response_model=DocumentInfo)
async def add_shape(file_id: str, item: ShapeAnnotationItem):
    try:
        req = BatchApplyEditsRequest(shapes=[item])
        return PDFEditService.apply_batch_edits(file_id, req)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add shape: {str(e)}")

@router.post("/{file_id}/whiteout", response_model=DocumentInfo)
async def add_whiteout(file_id: str, item: WhiteoutAnnotationItem):
    try:
        req = BatchApplyEditsRequest(whiteouts=[item])
        return PDFEditService.apply_batch_edits(file_id, req)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add whiteout: {str(e)}")

@router.post("/{file_id}/redact", response_model=DocumentInfo)
async def add_redact(file_id: str, item: RedactAnnotationItem):
    try:
        req = BatchApplyEditsRequest(redactions=[item])
        return PDFEditService.apply_batch_edits(file_id, req)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply redaction: {str(e)}")

@router.post("/{file_id}/signature", response_model=DocumentInfo)
async def add_signature(file_id: str, item: SignatureAnnotationItem):
    try:
        req = BatchApplyEditsRequest(signatures=[item])
        return PDFEditService.apply_batch_edits(file_id, req)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add signature: {str(e)}")

@router.post("/{file_id}/form-fill", response_model=DocumentInfo)
async def fill_form(file_id: str, item: FormFillRequest):
    try:
        req = BatchApplyEditsRequest(form_fills=item.field_values, flatten_forms=item.flatten)
        return PDFEditService.apply_batch_edits(file_id, req)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fill form fields: {str(e)}")
