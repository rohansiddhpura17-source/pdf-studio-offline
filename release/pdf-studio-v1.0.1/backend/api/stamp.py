from fastapi import APIRouter, HTTPException
from schemas.document import DocumentInfoResponse
from schemas.stamp import (
    WatermarkRequest,
    PageNumbersRequest,
    HeaderFooterRequest,
    DateStampRequest,
)
from services.pdf_stamp import PDFStampService

router = APIRouter(prefix="/api/stamp", tags=["Stamp"])

@router.post("/watermark", response_model=DocumentInfoResponse)
async def apply_watermark(req: WatermarkRequest):
    try:
        return PDFStampService.apply_watermark(req)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply watermark: {str(e)}")

@router.post("/page-numbers", response_model=DocumentInfoResponse)
async def apply_page_numbers(req: PageNumbersRequest):
    try:
        return PDFStampService.apply_page_numbers(req)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply page numbers: {str(e)}")

@router.post("/header-footer", response_model=DocumentInfoResponse)
async def apply_header_footer(req: HeaderFooterRequest):
    try:
        return PDFStampService.apply_header_footer(req)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply headers/footers: {str(e)}")

@router.post("/date", response_model=DocumentInfoResponse)
async def apply_date_stamp(req: DateStampRequest):
    try:
        return PDFStampService.apply_date_stamp(req)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply date stamp: {str(e)}")
