# PDF Studio — Product Prompts & Specifications Log

This document records the prompt instructions and system evolution throughout the development of PDF Studio for BSERC GenAI Internship (Week 2, Project 1).

## Master Prompt
- **User Role**: Senior Full-Stack Architect, Frontend Engineer, Python Developer, PDF Specialist, Product Designer, QA Engineer.
- **Goal**: Build a complete, genuine, offline-first PDF Studio desktop application with 29 real tools across 5 modules.
- **Design Tokens**: Primary `#2859D9`, Navy `#17243B`, Neutral Background `#F6F8FC`, Border `#DCE3EF`, Success `#15966B`.
- **Phased Roadmap**:
  - Phase 1: Foundation (Home, Editor workspace, PDF.js rendering, thumbnails, navigation, zoom, save/export, local backend).
  - Phase 2: Organise (9 tools: Merge, Split, Reorder, Rotate, Delete, Duplicate, Extract, Insert Blank, Crop).
  - Phase 3: Edit (9 tools including true secure redaction).
  - Phase 4: Stamp & Convert (7 tools).
  - Phase 5: Finish & Compare (4 tools).
  - Phase 6: Final QA & offline verification.

## Phase 2 Prompt
- **Objective**: Implement all nine tools of Module A — Organise with real backend PDF operations, interactive PageGrid with drag-and-drop, multi-page selection, contextual property inspectors, undo/redo history, reset, export, automated tests, and 12 screenshots.
- **Execution**: Completed with 20 backend automated tests passing, 12 verified Chrome screenshots in `screenshots/phase-2/`, and zero runtime external requests.


## Phase 3 Prompt: Module B — Edit Tools
- **Objective**: Implement all nine tools of Module B — Edit:
  1. Add Text (Helvetica, Times, Courier, custom size, bold, italic, color, alignment).
  2. Add Images (PNG, JPEG, WebP with scaling and positioning).
  3. Highlight Text (semi-transparent color chips and blend mode).
  4. Freehand Drawing (smooth vector ink paths with configurable stroke width and color).
  5. Geometric Shapes (Rectangle, Rounded Rectangle, Circle, Ellipse, Line, Directional Arrow).
  6. Whiteout Content (cosmetic opaque mask preserving underlying streams).
  7. Secure Redaction (permanent content stream rewriting, character glyph destruction, annotation scrubbing, confirmation warning modal, verified with automated extraction check).
  8. Digital Signatures (visual drawn pad, cursive script typography, transparent PNG upload, signer/timestamp metadata).
  9. PDF Form Filling (AcroForm field inspection, interactive inputs, checkboxes, form flattening option).
- **Execution & Deliverables**:
  - Implemented `pdf_edit.py`, `pdf_redact.py`, `schemas/edit.py`, and `api/edit.py` with 11 endpoints.
  - Implemented `AnnotationLayer.tsx`, `EditInspector.tsx`, `SignatureDialog.tsx`, `RedactionConfirmDialog.tsx`, and `useEditStore.ts`.
  - Added 10 automated Pytest tests in `test_edit.py` bringing the total passing test suite to **30/30 passed**.
  - Captured 13 high-resolution Chrome E2E screenshots in `screenshots/phase-3/`.
  - Updated all documentation (`README.md`, `ARCHITECTURE.md`, `REQUIREMENTS.md`, `SECURITY_AND_PRIVACY.md`, `TEST_PLAN.md`, `ACCEPTANCE_CHECKLIST.md`, `USER_GUIDE.md`, `CHANGELOG.md`, `prompts.md`, `PROJECT_TRACKER.md`).

## Phase 4 Prompt: Module C (Stamp) & Module D (Convert)
- **Objective**: Implement seven tools across Module C (Stamp) and Module D (Convert):
  - **Module C (Stamp)**:
    1. Tool 1: Watermarks (Text with typography, opacity 5–100%, rotation -180° to 180°, center or repeating grid tiling, foreground overlay or background underlay; Image with PNG/JPEG/WebP transparency, scale, aspect lock; page ranges/exclusions).
    2. Tool 2: Page Numbers (6 positions: top/bottom × left/center/right; formats: arabic, padded, roman_lower, roman_upper; "Page X of Y", skip cover page, prefix/suffix/separator).
    3. Tool 3: Headers and Footers (3-column layout left/center/right; dynamic placeholders: `{title}`, `{page}`, `{total}`, `{date}`, `{time}`; customizable font, margins, divider line).
    4. Tool 4: Date Stamps (Local or custom date string; formats DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, full date; position, font, rotation, opacity; visual stamp notice distinguishing visual stamps from PKI cryptographic signatures).
  - **Module D (Convert)**:
    5. Tool 5: Images to PDF (Batch PNG, JPEG, WebP, TIFF; queue management, reordering, rotation; page sizes A4, A3, A5, Letter, Legal, Original, Custom; fit/fill/stretch, margins, background color).
    6. Tool 6: PDF to Images (Export pages to PNG/JPEG at 72, 96, 150, 200, 300 DPI via Poppler `pdftoppm`; individual image download + all pages zipped into a downloadable `.zip` archive).
    7. Tool 7: PDF to Text (Plain & layout extraction modes; page break & paragraph preservation; page-by-page breakdown; scanned document detection with informative OCR limitation warning).
- **Execution & Deliverables**:
  - Implemented `pdf_stamp.py`, `pdf_convert.py`, schemas, and mounted endpoints in `api/stamp.py` and `api/convert.py`.
  - Implemented `StampConvertWorkspace.tsx`, `StampSidebar.tsx`, `StampLiveCanvas.tsx`, `ImagesToPdfView.tsx`, `PdfToImagesView.tsx`, `PdfToTextView.tsx`, all 7 inspector sub-panels, and `useStampConvertStore.ts`.
  - Added 13 automated Pytest tests in `test_stamp.py` and `test_convert.py` bringing the total passing test suite to **43/43 passed**.
  - Captured 13 high-resolution Chrome E2E screenshots in `screenshots/phase-4/`.
  - Updated all documentation (`README.md`, `ARCHITECTURE.md`, `REQUIREMENTS.md`, `SECURITY_AND_PRIVACY.md`, `TEST_PLAN.md`, `ACCEPTANCE_CHECKLIST.md`, `USER_GUIDE.md`, `CHANGELOG.md`, `prompts.md`, `PROJECT_TRACKER.md`).

## Phase 5 Prompt: Module E — Finish & Compare Tools
- **Objective**: Implement all four tools of Module E — Finish & Compare:
  1. Tool 1: PDF Compression (Presets: Maximum Quality, Balanced, Strong, Custom; downsample raster graphics, compress streams, deduplicate identical objects, truthful file size reduction metrics without padding, visual space reduction meter).
  2. Tool 2: Edit Document Metadata (Title, Author, Subject, Keywords with tag pills, Creator, Producer, Creation/Mod timestamps, custom dictionary keys `/Key=Value`, technical document properties inspector).
  3. Tool 3: Remove Document Metadata & Privacy Sanitization (Standard vs Deep clean rebuild modes, granular privacy checkboxes, XML XMP stream removal, thumbnail cache cleaning, privacy verification audit report, visual stamp distinction notice vs secure redaction).
  4. Tool 4: Compare Two PDFs (Dual document selection, asymmetric page count alignment, word-level text diffing with `difflib.SequenceMatcher`, visual layout comparison with Side-by-Side, Interactive Overlay blend, and Difference Heatmap modes, plus exportable standalone HTML/JSON audit reports).
- **Execution & Deliverables**:
  - Implemented `pdf_finish.py`, `schemas/finish.py`, and mounted endpoints in `api/finish.py`.
  - Implemented `FinishCompareWorkspace.tsx`, `FinishSidebar.tsx`, `CompressionView.tsx`, `MetadataEditorView.tsx`, `MetadataCleanupView.tsx`, `PdfCompareView.tsx`, all 4 right inspector sub-panels, and `useFinishStore.ts`.
  - Added 8 automated Pytest tests in `test_finish.py` bringing the total passing test suite to **51/51 passed** (`51 passed, 1 warning in 2.26s`).
  - Captured 17 high-resolution Chrome E2E screenshots in `screenshots/phase-5/`.
  - Updated all documentation (`README.md`, `ARCHITECTURE.md`, `REQUIREMENTS.md`, `SECURITY_AND_PRIVACY.md`, `TEST_PLAN.md`, `ACCEPTANCE_CHECKLIST.md`, `USER_GUIDE.md`, `CHANGELOG.md`, `PROJECT_TRACKER.md`, `prompts.md`).

## Phase 6 Prompt: Final Acceptance Audit, Quality Assurance, Packaging & Delivery
- **Objective**: Conduct comprehensive final acceptance auditing, defect remediation, performance profiling, security and air-gap verification, production packaging, and final delivery documentation across all 29 PDF tools.
- **Execution & Deliverables**:
  - Implemented `verify_all_29_tools.py` verifying all 29 tools against real PDF documents with physical output artifacts generated in `acceptance_artifacts/` (100% Pass Rate).
  - Implemented `verify_security_and_privacy.py` asserting physical byte-level redaction, deep metadata purging, input boundary traversal protection, and zero-leak air-gap compliance (100% Security Pass Rate).
  - Implemented `benchmark_performance.py` evaluating parse latency, thumbnail generation, bulk stamping, and memory RSS footprint across 1p, 10p, 50p, and 100p documents. Documented results in `docs/PERFORMANCE_REPORT.md`.
  - Conducted complete dependency audit across 64 frontend and backend dependencies, verifying 100% permissive open source licensing (MIT, BSD-3, Apache-2.0, ISC). Documented in `docs/DEPENDENCY_AND_LICENSE_AUDIT.md`.
  - Fixed React 19 Rules of Hooks violation in `EditorWorkspace.tsx` and in-place stream memory modification in `pdf_redact.py`.
  - Captured 12 high-DPI desktop viewports (1440x900) via Playwright in `screenshots/phase-6/`.
  - Created production launch scripts `scripts/start_pdf_studio.sh` and `scripts/stop_pdf_studio.sh` with portable path discovery, port checks, and clean process tracking.
  - Enabled dual-hosting architecture in `main.py` serving compiled production frontend directly from FastAPI on `http://127.0.0.1:8001/`.
  - Packaged clean standalone release distribution `release/pdf-studio-v1.0.0.zip` (26 MB) and generated cryptographic SHA-256 checksum manifest `release/SHA256SUMS.txt`.
  - Created `RELEASE_NOTES.md`, `INSTALLATION.md`, `RELEASE_CHECKLIST.md`, and master `docs/PHASE_6_FINAL_ACCEPTANCE_REPORT.md`.
