from fastapi import APIRouter, HTTPException, status
from typing import List

try:
    from schemas.document import DocumentInfoResponse
    from schemas.organise import (
        MergeRequest,
        SplitRequest,
        SplitResponse,
        ReorderRequest,
        RotateRequest,
        DeleteRequest,
        DuplicateRequest,
        ExtractRequest,
        InsertBlankRequest,
        CropRequest
    )
    from services.pdf_organise import PDFOrganiseService
except ImportError:
    from ..schemas.document import DocumentInfoResponse
    from ..schemas.organise import (
        MergeRequest,
        SplitRequest,
        SplitResponse,
        ReorderRequest,
        RotateRequest,
        DeleteRequest,
        DuplicateRequest,
        ExtractRequest,
        InsertBlankRequest,
        CropRequest
    )
    from ..services.pdf_organise import PDFOrganiseService

router = APIRouter(prefix="/api/organise", tags=["Organise"])

@router.post("/merge", response_model=DocumentInfoResponse)
async def merge_pdfs(request: MergeRequest):
    try:
        return PDFOrganiseService.merge_pdfs(request.file_ids, request.output_filename)
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fnf))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Merge failed: {str(e)}")

@router.post("/split", response_model=SplitResponse)
async def split_pdf(request: SplitRequest):
    try:
        output_docs = PDFOrganiseService.split_pdf(
            file_id=request.file_id,
            mode=request.mode,
            ranges=request.ranges,
            split_after_pages=request.split_after_pages
        )
        return SplitResponse(
            success=True,
            message=f"Split into {len(output_docs)} separate documents.",
            output_documents=output_docs
        )
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fnf))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Split failed: {str(e)}")

@router.post("/reorder", response_model=DocumentInfoResponse)
async def reorder_pages(request: ReorderRequest):
    try:
        return PDFOrganiseService.reorder_pages(request.file_id, request.page_order)
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fnf))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Reorder failed: {str(e)}")

@router.post("/rotate", response_model=DocumentInfoResponse)
async def rotate_pages(request: RotateRequest):
    try:
        return PDFOrganiseService.rotate_pages(request.file_id, request.page_numbers, request.angle)
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fnf))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Rotation failed: {str(e)}")

@router.post("/delete", response_model=DocumentInfoResponse)
async def delete_pages(request: DeleteRequest):
    try:
        return PDFOrganiseService.delete_pages(request.file_id, request.page_numbers)
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fnf))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Delete failed: {str(e)}")

@router.post("/duplicate", response_model=DocumentInfoResponse)
async def duplicate_pages(request: DuplicateRequest):
    try:
        return PDFOrganiseService.duplicate_pages(request.file_id, request.page_numbers, request.count)
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fnf))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Duplicate failed: {str(e)}")

@router.post("/extract", response_model=DocumentInfoResponse)
async def extract_pages(request: ExtractRequest):
    try:
        return PDFOrganiseService.extract_pages(request.file_id, request.page_numbers, request.output_filename)
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fnf))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Extract failed: {str(e)}")

@router.post("/insert-blank", response_model=DocumentInfoResponse)
async def insert_blank_page(request: InsertBlankRequest):
    try:
        return PDFOrganiseService.insert_blank_page(
            file_id=request.file_id,
            target_page=request.target_page,
            position=request.position,
            count=request.count,
            paper_size=request.paper_size,
            orientation=request.orientation
        )
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fnf))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Insert blank page failed: {str(e)}")

@router.post("/crop", response_model=DocumentInfoResponse)
async def crop_pages(request: CropRequest):
    try:
        return PDFOrganiseService.crop_pages(request.file_id, request.page_numbers, request.crop_box)
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fnf))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Crop failed: {str(e)}")
