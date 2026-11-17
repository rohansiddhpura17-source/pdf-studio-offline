import io
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, status
from fastapi.responses import Response, FileResponse
from typing import Optional

try:
    from schemas.document import DocumentInfoResponse, OperationResponse, SaveAsRequest
    from services.pdf_document import PDFDocumentService
    from utils.storage import (
        save_uploaded_file,
        get_file_path,
        store_new_version,
        purge_all_temp_storage,
        sanitize_filename
    )
except ImportError:
    from ..schemas.document import DocumentInfoResponse, OperationResponse, SaveAsRequest
    from ..services.pdf_document import PDFDocumentService
    from ..utils.storage import (
        save_uploaded_file,
        get_file_path,
        store_new_version,
        purge_all_temp_storage,
        sanitize_filename
    )

router = APIRouter(prefix="/api/document", tags=["Document"])

@router.post("/upload", response_model=DocumentInfoResponse)
async def upload_document(file: UploadFile = File(...)):
    filename = file.filename or "document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF documents are supported."
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded PDF file is empty (0 bytes)."
        )

    if not content.startswith(b"%PDF"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Corrupted or invalid PDF file header."
        )

    file_id, file_path = save_uploaded_file(content, filename)
    try:
        info = PDFDocumentService.inspect_document(file_id)
        return info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unable to parse PDF structure: {str(e)}"
        )

@router.get("/{file_id}/info", response_model=DocumentInfoResponse)
async def get_document_info(file_id: str):
    try:
        return PDFDocumentService.inspect_document(file_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{file_id}/download")
async def download_document(file_id: str):
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="Document not found.")

    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type="application/pdf"
    )

@router.get("/{file_id}/page/{page_num}/thumbnail")
async def get_page_thumbnail(file_id: str, page_num: int, width: int = Query(default=240, ge=60, le=800)):
    try:
        thumb_bytes = PDFDocumentService.render_page_thumbnail(file_id, page_num, max_width=width)
        return Response(content=thumb_bytes, media_type="image/png")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found.")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Thumbnail rendering failed: {str(e)}")

@router.post("/sample", response_model=DocumentInfoResponse)
async def create_sample_document(pages: int = Query(default=50, ge=1, le=100)):
    try:
        file_id, _ = PDFDocumentService.create_synthetic_pdf(num_pages=pages)
        return PDFDocumentService.inspect_document(file_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate synthetic PDF: {str(e)}")

@router.post("/{file_id}/save-as", response_model=DocumentInfoResponse)
async def save_as(file_id: str, request: SaveAsRequest):
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="Document not found.")
    
    clean_name = sanitize_filename(request.new_filename)
    if not clean_name.lower().endswith(".pdf"):
        clean_name += ".pdf"
        
    with open(file_path, "rb") as f:
        content = f.read()
        
    new_id, _ = save_uploaded_file(content, clean_name)
    return PDFDocumentService.inspect_document(new_id)

@router.post("/system/cleanup", response_model=OperationResponse)
async def cleanup_temporary_files():
    purged_count = purge_all_temp_storage()
    return OperationResponse(
        success=True,
        message=f"Purged {purged_count} temporary session files.",
        details={"purged_count": purged_count}
    )

@router.get("/system/health")
async def health_check():
    return {
        "status": "healthy",
        "app": "PDF Studio",
        "mode": "offline-localhost",
        "version": "1.0.0"
    }
