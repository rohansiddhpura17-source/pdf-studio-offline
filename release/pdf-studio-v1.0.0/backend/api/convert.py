import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from schemas.document import DocumentInfoResponse
from schemas.convert import (
    ImagesToPdfRequest,
    PdfToImagesRequest,
    PdfToImagesResponse,
    PdfToTextRequest,
    PdfToTextResponse,
)
from services.pdf_convert import PDFConvertService
from utils.storage import get_file_path

router = APIRouter(prefix="/api/convert", tags=["Convert"])

@router.post("/images-to-pdf", response_model=DocumentInfoResponse)
async def convert_images_to_pdf(req: ImagesToPdfRequest):
    try:
        return PDFConvertService.images_to_pdf(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to convert images to PDF: {str(e)}")

@router.post("/pdf-to-images", response_model=PdfToImagesResponse)
async def convert_pdf_to_images(req: PdfToImagesRequest):
    try:
        return PDFConvertService.pdf_to_images(req)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render PDF to images: {str(e)}")

@router.post("/pdf-to-text", response_model=PdfToTextResponse)
async def convert_pdf_to_text(req: PdfToTextRequest):
    try:
        return PDFConvertService.pdf_to_text(req)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract text from PDF: {str(e)}")

@router.get("/download/{archive_id}")
async def download_converted_archive(archive_id: str):
    file_path = get_file_path(archive_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="Archive not found or expired")

    filename = file_path.name
    media_type = "application/zip" if filename.endswith(".zip") else "application/octet-stream"
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type=media_type,
    )
