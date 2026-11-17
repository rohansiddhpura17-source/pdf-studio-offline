# Changelog — PDF Studio

All notable changes to this project will be documented in this file.

## [1.0.0] - Phase 6: Final Acceptance Audit, Quality Assurance, Packaging & Delivery (2026-11-08)
### Added
- **Master 29-Tool Acceptance Suite (`scripts/verify_all_29_tools.py`)**:
  - Comprehensive automated test runner executing non-destructive operations against real PDF and media inputs for all 29 tools.
  - Generates verifiable physical output artifacts in `acceptance_artifacts/` (`tool01_merged.pdf` through `tool29_comparison_report.html`) and structured test report `acceptance_artifacts/verification_results.json`.
  - Achieved **100% Pass Rate (29/29 Tools Verified PASS)**.
- **Critical Security & Privacy Audit Engine (`scripts/verify_security_and_privacy.py`)**:
  - Permanent byte-level redaction verification: Ensures target string bytes and character glyph tokens are purged in-place from physical PDF content streams (0 extracted instances, 0 raw file byte occurrences).
  - Deep metadata sanitation verification: Purges Title, Author, Subject, Keywords, Creator, Producer, custom trailer dictionary keys, and embedded `/Metadata` XMP streams.
  - Path traversal & payload boundary protection: Blocks path escape sequences (`../`), 0-byte uploads, corrupted payloads, and non-PDF MIME formats with HTTP 400.
  - Zero-leak offline air-gap audit: Scans client code, bundle assets, and backend code to guarantee 100% local loopback execution (`127.0.0.1`) without external CDNs, analytical trackers, or telemetry links.
  - Achieved **100% Security Pass Rate (4/4 Critical Gates Verified PASS)**.
- **Performance & Scalability Benchmark Suite (`scripts/benchmark_performance.py`)**:
  - Multi-tier document scalability profiling across 1-page, 10-page, 50-page, 100-page, image-heavy, and scanned documents.
  - Profiles parse latency, thumbnail rasterization, bulk stamping, memory RSS footprint, and production frontend bundle sizes, documented in `docs/PERFORMANCE_REPORT.md`.
- **Production Launch & Process Management Scripts**:
  - `scripts/start_pdf_studio.sh`: Portable launcher using relative project path discovery, runtime dependency checks, background daemon execution with PID tracking (`.run/`), port health polling, and clean terminal banner output.
  - `scripts/stop_pdf_studio.sh`: Safe shutdown utility terminating tracked PIDs and releasing bound ports (8001 and 5173).
- **Dual-Hosting Production Backend Architecture (`backend/main.py`)**:
  - Extended FastAPI backend with `fastapi.staticfiles.StaticFiles` mounting `frontend/dist/` at `/` when available, enabling single-port standalone deployment on `http://127.0.0.1:8001/` while preserving hot-reloading development on `http://127.0.0.1:5173/`.
  - Added `/api/status` endpoint for structured health reporting.
- **Phase 6 Desktop Acceptance Screenshots (`screenshots/phase-6/`)**:
  - Captured 12 high-DPI desktop viewports (1440x900) via Playwright:
    1. `01_document_home.png`
    2. `02_main_pdf_editor.png`
    3. `03_organise_workspace.png`
    4. `04_edit_workspace.png`
    5. `05_stamp_workspace.png`
    6. `06_convert_workspace.png`
    7. `07_finish_workspace.png`
    8. `08_compression_result.png`
    9. `09_metadata_cleanup_report.png`
    10. `10_pdf_comparison_result.png`
    11. `11_final_pdf_export.png`
    12. `12_settings_and_privacy.png`
- **Production Packaging & Release Manifest**:
  - Assembled clean standalone distribution tree `release/pdf-studio-v1.0.0/` free of development caches, virtual environments, and OS metadata files.
  - Compressed standalone zip distributable `release/pdf-studio-v1.0.0.zip` (26 MB).
  - Generated cryptographic checksum manifest `release/SHA256SUMS.txt` with SHA-256 digests.
- **Documentation Suite**:
  - `RELEASE_NOTES.md`: Comprehensive v1.0.0 release notes covering all 29 tools, security guarantees, performance metrics, and system requirements.
  - `INSTALLATION.md`: Platform-specific setup guide for macOS, Linux, and Windows.
  - `RELEASE_CHECKLIST.md`: Pre-flight release verification checklist covering all modules.
  - `licenses/THIRD_PARTY_LICENSES.md`: Open-source license attribution notice.
  - `docs/PHASE_6_INITIAL_AUDIT.md`: Pre-implementation audit report.
  - `docs/PHASE_6_TOOL_ACCEPTANCE_MATRIX.md`: Complete 29-tool acceptance matrix.
  - `docs/PHASE_6_FINAL_ACCEPTANCE_REPORT.md`: Master 10-Gate Final Acceptance Report.
  - `docs/PERFORMANCE_REPORT.md`: System performance benchmark report.
  - `docs/DEPENDENCY_AND_LICENSE_AUDIT.md`: Dependency security and license audit.

### Fixed
- **React 19 Rules of Hooks Violation (`frontend/src/features/editor/EditorWorkspace.tsx`)**: Reordered `useEffect` hook to execute before conditional workspace returns, preventing unhandled runtime exceptions.
- **In-Place Stream Modification for Redaction (`backend/services/pdf_redact.py`)**: Updated `_data` attribute of target stream objects in-place (`target_obj._data = final_stream_data`) to prevent orphaned content stream retention in `writer._objects`.
- **Query Parameter Schema Compatibility (`backend/api/finish.py`)**: Resolved `TypeError: Query() got unexpected keyword argument 'enum'` by utilizing standard query parameters.
- **Vector Test Stream Generation (`backend/tests/test_finish.py`)**: Replaced external ReportLab dependency with native `pypdf.generic.DecodedStreamObject` vector text generation.
- **Latin-1 Codec Encoding (`backend/services/pdf_document.py`)**: Replaced non-ASCII em-dashes `\u2014` with standard ASCII `--` in sample PDF generator.

---

## [0.5.0] - Phase 5: Module E (Finish & Compare) Completed (2026-11-07)
### Added
- **Module E Backend Engine (`backend/services/pdf_finish.py`, `backend/schemas/finish.py`, `backend/api/finish.py`)**:
  - `PDFCompressService.compress_pdf`: 3-stage optimization pipeline combining Flate stream deflation via zlib, identical xref font and object deduplication via `writer.compress_identical_objects()`, and Pillow raster image downsampling with customizable DPI (72–300) and JPEG quality (40–100%). Includes 4 presets (Maximum Quality, Balanced, Strong Compression, Custom) and computes truthful bytes saved and percentage reduction ratio.
  - `PDFMetadataService.get_metadata`: Extracts standard document catalog `/Info` dictionary tags, custom keys, and technical properties (PDF version, page dimensions, byte size, page count, XMP metadata stream presence).
  - `PDFMetadataService.edit_metadata`: Updates `/Title`, `/Author`, `/Subject`, `/Keywords`, `/Creator`, `/Producer`, and ISO creation/modification timestamps, and inserts arbitrary custom `/CustomKey = Value` trailer dictionary entries.
  - `PDFMetadataService.remove_metadata`: Implements Standard Sanitization (nullifies identifying author attributes) and Deep Sanitization (performs clean catalog rebuild, completely purges `/Info`, deletes the `/Metadata` XML stream, and purges embedded thumbnail caches), returning a formal `PrivacyVerificationReport`.
  - `PDFCompareService.compare_pdfs`: Dual-document comparative engine supporting asymmetric page count alignment (added/removed pages), word-level textual diffing with `difflib.SequenceMatcher` (`replace`, `insert`, `delete` opcodes), and high-resolution visual differencing via Poppler `pdftoppm`, Pillow `ImageChops.difference`, sensitivity thresholding, and magenta/crimson heatmap generation.
  - `PDFCompareService.generate_html_report`: Generates self-contained, offline HTML/JSON comparison audit reports with metadata summaries, difference statistics, and formatted tabular diff logs.
- **REST Endpoints (`backend/api/finish.py`)**:
  - `POST /api/finish/compress`: Compresses PDF with preset and custom options.
  - `GET /api/finish/metadata/{file_id}`: Retrieves document catalog metadata and technical properties.
  - `POST /api/finish/metadata/edit`: Updates document catalog and custom dictionary keys.
  - `POST /api/finish/metadata/remove`: Sanitizes document metadata with standard or deep clean rebuild.
  - `POST /api/finish/compare`: Executes dual-document textual and visual comparison.
  - `GET /api/finish/compare/{comparison_id}/report`: Exports standalone comparison audit reports (HTML or JSON).
- **Frontend Finish & Compare Workspace (`src/features/finish/`)**:
  - `FinishCompareWorkspace.tsx`: Main workspace container with TopBar, subtool sidebar, central viewport, right properties inspector, and bottom status bar.
  - `FinishSidebar.tsx`: Module E subtool switcher for PDF Compression, Edit Metadata, Remove Metadata, and Compare PDFs.
  - `CompressionView.tsx`: File size metrics, 3-stage pipeline explanation, preset cards, animated visual space optimization meter, and single-click buttons to download or replace the active editor document.
  - `MetadataEditorView.tsx`: Technical document properties bar, editable catalog fields with keyword tag pills, custom key-value manager, and live dirty-state indicator.
  - `MetadataCleanupView.tsx`: Mode switcher (Standard vs Deep), granular privacy checkboxes, essential distinction notice vs secure redaction, and Privacy Verification Report card with "100% Clean" audit badge.
  - `PdfCompareView.tsx`: Baseline Document A and revised Document B dropzones, synchronized Side-by-Side viewer, Interactive Overlay blend with 0–100% opacity slider, Difference Heatmap viewer with variance percentage pills, and textual changes tab with added (`+`) and removed (`-`) blocks.
  - Inspectors: `CompressionInspector.tsx`, `MetadataInspector.tsx`, `MetadataCleanupInspector.tsx`, and `CompareInspector.tsx`.
  - `useFinishStore.ts`: Dedicated Zustand state store managing state across all 4 finish tools.
  - `DocumentHome.tsx`: Direct entry points for "Compress PDF" and "Compare PDFs".
- **Automated Test Coverage**:
  - 8 new Pytest unit tests in `backend/tests/test_finish.py`. Total passing backend tests across all phases: **51/51** (`51 passed, 1 warning in 2.26s`).
  - Playwright automated browser test script (`capture_phase5_screenshots.py`) generating 17 high-resolution Chrome screenshots in `screenshots/phase-5/`.

## [0.4.0] - Phase 4: Module C (Stamp) & Module D (Convert) Completed (2026-11-07)
### Added
- **Module C Backend Engine (`backend/services/pdf_stamp.py`, `backend/schemas/stamp.py`, `backend/api/stamp.py`)**:
  - `apply_watermark`: Text watermarks with Type1 fonts, font sizing, hex color parsing, opacity via `/ExtGState`, rotation matrices (`[cos θ, sin θ, -sin θ, cos θ, cx, cy] Tm`), repeat tiling grid calculation, and foreground overlay vs. background underlay (`ArrayObject([bg_stream, orig_stream])`). Image watermarks with transparency preservation, aspect ratio locking, and scaling.
  - `apply_page_numbers`: 6 geometric positions (top/bottom × left/center/right), 4 numbering formats (Arabic standard, two-digit padded, lowercase Roman, uppercase Roman), start number offsets, custom prefix/suffix ("Page X of Y"), and cover page exclusion (`skip_cover`).
  - `apply_header_footer`: 3-column running header and footer layout (left, center, right), dynamic placeholder interpolation (`{title}`, `{page}`, `{total}`, `{date}`, `{time}`), divider lines, and customizable margins.
  - `apply_date_stamp`: Visual date stamps with preset formats (`DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`, full written date) or custom label, opacity, rotation, and positioning, accompanied by visual stamp notices distinguishing visual stamps from PKI cryptographic signatures.
- **Module D Backend Engine (`backend/services/pdf_convert.py`, `backend/schemas/convert.py`, `backend/api/convert.py`)**:
  - `images_to_pdf`: Batch compilation of PNG, JPEG, WebP, and TIFF images into standardized PDFs with page sizes (A4, Letter, A3, A5, Legal, Original, Custom), fit/fill/stretch scaling, margins, background color compositing, and per-image rotation.
  - `pdf_to_images`: High-DPI Poppler `pdftoppm` rasterization (72, 96, 150, 200, 300 DPI) into lossless PNG or quality-adjusted JPEG images, base64 thumbnail generation, and automated ZIP archive packaging for bulk download.
  - `pdf_to_text`: Plain and layout-preserving text extraction, page breaks preservation, page-by-page character metrics, and intelligent scanned document detection ($<15$ characters with image present flags scanned pages) with informative OCR limitation notices.
- **Frontend Stamp & Convert Workspace (`src/features/stamp-convert/`)**:
  - `StampConvertWorkspace.tsx`: Master workspace with top bar, left tool sidebar, center canvas/views, right contextual inspector, and bottom status bar.
  - `StampSidebar.tsx`: Sidebar switcher for all 7 tools across Module C (Stamp) and Module D (Convert).
  - `StampLiveCanvas.tsx`: PDF.js canvas with live interactive stamp overlay rendering watermarks, page numbers, headers/footers, and date stamps.
  - `ImagesToPdfView.tsx`: Image dropzone and compilation queue with thumbnails, reordering, rotation, and remove buttons.
  - `PdfToImagesView.tsx`: Rendered image gallery with individual downloads and bulk ZIP archive download button.
  - `PdfToTextView.tsx`: Extracted text viewer with full document and per-page tabs, search query highlighting, copy button, .txt export, and scanned document detection warning alert banner.
  - Inspectors: `WatermarkInspector.tsx`, `PageNumberInspector.tsx`, `HeaderFooterInspector.tsx`, `DateStampInspector.tsx`, `ImagesToPdfInspector.tsx`, `PdfToImagesInspector.tsx`, `PdfToTextInspector.tsx`, and `PageRangeSelector.tsx`.
  - `useStampConvertStore.ts`: Dedicated Zustand store managing state across all 7 tools.
  - `DocumentHome.tsx`: Quick tool cards for "Stamp & Number" and "Convert & Extract".
- **Automated Test Coverage**:
  - 13 new Pytest unit tests in `backend/tests/test_stamp.py` (7 tests) and `backend/tests/test_convert.py` (6 tests). Total passing backend tests: **43/43**.
  - Puppeteer E2E script (`test-phase4-e2e.mjs`) generating 13 high-resolution Chrome screenshots in `screenshots/phase-4/`.

## [0.3.0] - Phase 3: Module B — Edit Tools Completed (2026-11-07)
### Added
- **Module B Backend Engine (`pdf_edit.py`, `pdf_redact.py`, `schemas/edit.py`)**:
  - `add_text`: Synthesizes standard PDF Type1 text operators (`/Helvetica`, `/Times-Roman`, `/Courier`) with size, color, bold, italic, and opacity controls.
  - `add_image`: Decodes PNG, JPEG, WebP, rasterizes through PIL, and embeds into PDF page via `pypdf.Transformation`.
  - `add_highlight`: Applies semi-transparent color rectangles utilizing PDF `/ExtGState` alpha blend dictionaries.
  - `add_draw`: Smooth vector ink paths with round caps (`1 J`) and round joins (`1 j`).
  - `add_shapes`: Vector path generators for 6 geometric shapes (Rectangle, Rounded Rectangle with cubic Bézier corners, Circle, Ellipse, Line, and Directional Arrow with trigonometry-computed arrowhead).
  - `add_whiteout`: Cosmetic opaque white box masking that leaves underlying text intact in stream.
  - `add_redact`: True secure redaction engine that parses and sanitizes content streams, removes matching `Tj`/`TJ` text operands, scrubs overlapping annotations, and burns opaque redaction blocks with `[REDACTED]` overlay.
  - `add_signature`: Visual signature stamp embedding supporting stylus/mouse draw paths, cursive script calligraphy typography, and transparent PNG uploads, with signer label and timestamp metadata.
  - `get_form_fields` & `fill_form`: AcroForm field detection and automated serialization using `PdfWriter.update_page_form_field_values()`, with optional form field flattening.
  - `batch_apply_edits`: Atomic batch execution of all editing operations.
- **REST Endpoints**: 11 new endpoints mounted under `/api/edit/*`.
- **Frontend Edit Workspace & Interactive Components**:
  - `AnnotationLayer.tsx`: Scale- and DPI-aware SVG/HTML canvas layer translating client clicks into normalized 72 pt/in PDF point coordinates.
  - `EditInspector.tsx`: Dynamic properties inspector for active tool and selected annotations.
  - `SignatureDialog.tsx`: 3-tab signature creation dialog (Draw, Type, Upload).
  - `RedactionConfirmDialog.tsx`: Security audit warning modal explaining permanent data removal.
  - `useEditStore.ts`: Dedicated Zustand store with undo/redo snapshot stack and live draft counter.
- **Automated Test Coverage**:
  - 10 new Pytest tests in `backend/tests/test_edit.py` verifying all 9 tools and asserting `assert secret_text not in extracted_text` for true redaction. Total passing backend tests: **30/30**.
  - Automated Puppeteer E2E test script (`test-phase3-e2e.mjs`) generating 13 high-resolution Chrome screenshots in `screenshots/phase-3/`.

## [0.2.0] - Phase 2: Module A — Organise Tools Completed
### Added
- **Module A Backend Service (`PDFOrganiseService`)**:
  - `merge_pdfs`: Combines multiple documents sequentially with ordering control.
  - `split_pdf`: Supports all-pages, custom comma-separated ranges, and break-point splitting.
  - `reorder_pages`: Validated arbitrary page permutations with boundary guards.
  - `rotate_pages`: 90°, 180°, and 270° clockwise rotation on selected or all pages.
  - `delete_pages`: Deletes selected pages while preventing empty document states.
  - `duplicate_pages`: Clones selected pages with configurable copy counts (1–10).
  - `extract_pages`: Exports non-contiguous page subsets to independent PDFs.
  - `insert_blank_page`: Inserts blank pages with A4/Letter size and portrait/landscape orientation.
  - `crop_pages`: Real PDF page-box trimming (`/CropBox` and `/MediaBox`).
- **Organise REST Endpoints**: 9 dedicated routes under `/api/organise/*` with Pydantic request validation.
- **Frontend Organise Workspace (`OrganiseWorkspace.tsx`)**:
  - Interactive thumbnail grid (`PageGrid.tsx`) with drag-and-drop page reordering.
  - Multi-page selection toolbar with Select All, Deselect, Move Left, Move Right, and Reverse Order.
  - Right properties inspector with 9 dedicated tool control panels.
  - Undo, Redo, and Reset changes engine backed by Zustand store.
  - Destructive action confirmation modal for page deletions.
- **Automated Test Coverage**:
  - 11 new Pytest tests in `backend/tests/test_organise.py` (20/20 total backend tests passing).
  - 12 new E2E Chrome automation screenshots in `screenshots/phase-2/`.

## [0.1.1] - Phase 1: Acceptance Audit & Hardening
### Fixed
- Corrected `LocalhostSecurityMiddleware` to return `JSONResponse(status_code=403)` when rejecting foreign Host headers.
- Eliminated external jsdelivr cMap reference by bundling `/cmaps/` locally in `frontend/public/cmaps/`.
- Bound backend to loopback port `8001` with `PDF_STUDIO_PORT` environment override to prevent port collisions.

## [0.1.0] - Phase 1: Foundation
### Added
- Complete project architecture, requirements, test plan, and documentation.
- FastAPI backend and React 19 + TypeScript + Vite frontend with BSERC design tokens.
- Offline PDF rendering via PDF.js with local worker.
- Document Home with drag-and-drop upload and recent documents list.
- 50-page navigation, zoom controls, and non-destructive Save As.
