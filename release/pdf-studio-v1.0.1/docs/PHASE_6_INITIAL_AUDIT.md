# Phase 6 Initial Codebase & Architecture Audit
**Product**: PDF Studio (*Your documents. Your control. Always offline.*)  
**Project**: BSERC GenAI Internship — Week 2, Project 1  
**Audit Date**: November 8, 2026  
**Auditor**: Senior Software Architect, QA & Security Engineering Lead  
**Scope**: Complete Codebase Audit across all 29 PDF Tools, Backend & Frontend Subsystems

---

## 1. Executive Summary & Codebase Inventory

A full static and dynamic audit was conducted across the PDF Studio repository. The system consists of:
- **Backend**: Python 3.10+ FastAPI service (`backend/`) strictly bound to `127.0.0.1:8001`, with modular service layers:
  - `services/pdf_document.py` (Core inspection, metadata parsing, synthetic benchmark generation, page rasterization)
  - `services/pdf_organise.py` (9 Organise tools: Merge, Split, Reorder, Rotate, Delete, Duplicate, Extract, Insert Blank, Crop)
  - `services/pdf_edit.py` (Vector text, image XObject embedding, `/ExtGState` highlights, freehand paths, geometric shapes, cosmetic whiteout, AcroForm filling)
  - `services/pdf_redact.py` (Content stream bytecode filtering, `Tj`/`TJ` text removal, coordinate visitor extraction, `/Annots` destruction, vector opaque block burning)
  - `services/pdf_stamp.py` (Watermarks with repeat grid tiling, 6-position page numbering, 3-column running headers/footers, date stamps)
  - `services/pdf_convert.py` (Images to PDF compiler, Poppler high-DPI rasterizer, ZIP archiver, layout-preserving text extractor, scanned doc detector)
  - `services/pdf_finish.py` (Flate stream deflation, xref deduplication, DCT image resampling, metadata editing, deep sanitization, dual-document visual/text comparison, HTML report generation)
  - `security/guards.py` (`LocalhostSecurityMiddleware` enforcing client IP and Host header checks against loopback)
  - `utils/storage.py` (Cryptographic UUID isolation, path traversal guards, session tracking, temporary file purger)
- **Frontend**: React 19 / TypeScript 5 / Tailwind CSS single-page desktop editor client (`frontend/`):
  - `state/`: 4 dedicated Zustand state stores (`useDocumentStore`, `useEditStore`, `useStampConvertStore`, `useFinishStore`).
  - `services/api.ts`: Centralized loopback REST client communicating over `/api/*` proxy.
  - `features/`: Dedicated workspaces for Document Home, Editor Workspace, Organise Workspace, Stamp & Convert Workspace, Finish & Compare Workspace, Settings Modal.
  - Bundled local PDF.js worker and offline character maps (`/cmaps/`) without external CDN calls.
- **Automated Tests**: 51 passing Pytest backend unit tests (`51 passed, 0 failed, 1 warning in 2.63s`), production TypeScript build passing (`built in 3.82s`), 55 high-resolution screenshot audit captures.

---

## 2. Prioritized Issue & Risk Assessment

| ID | Issue Description | Severity | Subsystem | Status & Remediation |
|---|---|---|---|---|
| **AUD-01** | `UnicodeEncodeError` in synthetic PDF generator fallback when PyMuPDF (`fitz`) is absent | **HIGH** | `pdf_document.py` | **RESOLVED**: Replaced non-Latin-1 em-dashes (`\u2014`) with ASCII standard `--` in the pure `pypdf` vector stream generator. Tested and verified across all 9 tests in `test_phase1.py`. |
| **AUD-02** | `pdftoppm` binary path discovery limited to fixed hardcoded directories | **MEDIUM** | `pdf_finish.py` | **RESOLVED**: Added `shutil.which('pdftoppm')` to dynamic search order before checking `/opt/homebrew`, `/usr/local`, and `/usr/bin`. Ensures Poppler discovery across all package managers. |
| **AUD-03** | Potential key discrepancy in `removeMetadata` response contract (`verification_report` vs `report`) | **MEDIUM** | `api/finish.py` & `api.ts` | **RESOLVED**: Backend now supplies both keys in JSON response; frontend `api.ts` extracts `data.report || data.verification_report`. |
| **AUD-04** | Disambiguation between cosmetic whiteout and destructive secure redaction in UI | **MEDIUM** | `EditInspector.tsx`, `RedactionConfirmDialog.tsx` | **VERIFIED**: Explicit warnings and modal confirmation alert displayed prior to applying permanent redactions. Text extraction automated test confirms permanent stream destruction. |
| **AUD-05** | Legal notice distinguishing visual signature stamps from cryptographic PKI digital signatures | **LOW** | `SignatureDialog.tsx`, `DateStampInspector.tsx` | **VERIFIED**: Application UI explicitly states that visual drawn/typed signatures and date stamps are visual approval markings and do not contain X.509 PKI certificates. |
| **AUD-06** | Starlette deprecation warning regarding `httpx` with `starlette.testclient` in pytest output | **LOW** | `tests/*` | **DOCUMENTED**: Standard Starlette test client deprecation notice (non-fatal, zero functional impact on FastAPI endpoints). |

---

## 3. Subsystem Detailed Findings

### 3.1 Security & Network Isolation
- **Loopback Enforcement**: Verified that `LocalhostSecurityMiddleware` rejects non-loopback requests with HTTP 403.
- **Path Traversal Protection**: Verified that `get_file_path(file_id)` strictly validates `file_id.isalnum()` and `len(file_id) == 32`, completely blocking any relative path traversal payload (`../`, `~`, `/`).
- **Network Traffic**: Zero external HTTP/HTTPS calls observed. All dependencies, fonts, SVG icons, and PDF.js workers load from local disk.

### 3.2 State Management & Document Integrity
- **Non-Destructive Operations**: Mutating operations generate new versioned session files in `temp_storage/` without modifying the original input file. Verified via SHA-256 hash preservation tests.
- **Undo/Redo History**: Implemented in both `useDocumentStore` (for organise operations) and `useEditStore` (for annotations and forms).

### 3.3 Offline PDF Processing Engines
- No cloud conversion APIs or remote processing services are invoked.
- Vector generation, stream deflation, xref table restructuring, image downsampling, and word diffing execute in local CPU memory.

---

## 4. Conclusion & Stage B Readiness

The codebase is robust, stable, and architecturally sound. The critical and medium issues identified during initial inspection have been resolved. The application is ready for comprehensive master acceptance testing across all 29 tools.
