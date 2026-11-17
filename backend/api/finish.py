import json
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import HTMLResponse, JSONResponse

from schemas.finish import (
    CompressRequest,
    CompressResponse,
    GetMetadataResponse,
    EditMetadataRequest,
    RemoveMetadataRequest,
    PrivacyVerificationReport,
    CompareRequest,
    CompareResponse,
)
from schemas.document import DocumentInfo
from services.pdf_finish import PDFCompressService, PDFMetadataService, PDFCompareService

router = APIRouter(prefix="/api/finish", tags=["Finish & Compare"])

# Global cache for recent comparisons to serve reports
_comparison_cache = {}

# --- 1. Compression ---
@router.post("/compress", response_model=CompressResponse)
async def compress_pdf(req: CompressRequest):
    try:
        return PDFCompressService.compress_pdf(req)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compress PDF: {str(e)}")

# --- 2. Metadata Inspection & Editing ---
@router.get("/metadata/{file_id}", response_model=GetMetadataResponse)
async def get_pdf_metadata(file_id: str):
    try:
        return PDFMetadataService.get_metadata(file_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to inspect metadata: {str(e)}")

@router.post("/metadata/edit", response_model=DocumentInfo)
async def edit_pdf_metadata(req: EditMetadataRequest):
    try:
        return PDFMetadataService.edit_metadata(req)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to edit metadata: {str(e)}")

@router.post("/metadata/remove")
async def remove_pdf_metadata(req: RemoveMetadataRequest):
    try:
        doc_info, report = PDFMetadataService.remove_metadata(req)
        return {
            "document": doc_info,
            "verification_report": report,
            "report": report,
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sanitize metadata: {str(e)}")

# --- 3. Document Comparison ---
@router.post("/compare", response_model=CompareResponse)
async def compare_pdfs(req: CompareRequest):
    try:
        res = PDFCompareService.compare_pdfs(req)
        _comparison_cache[res.comparison_id] = res
        return res
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

@router.get("/compare/{comparison_id}/report")
async def export_comparison_report(comparison_id: str, format: str = Query("html")):
    res = _comparison_cache.get(comparison_id)
    if not res:
        raise HTTPException(status_code=404, detail="Comparison report not found or expired")

    if format == "html":
        html_content = PDFCompareService.generate_html_report(res)
        return HTMLResponse(content=html_content, status_code=200)
    else:
        return JSONResponse(content=res.model_dump(), status_code=200)
