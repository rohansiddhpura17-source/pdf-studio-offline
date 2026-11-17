# PDF Studio — Requirements Specification

## 1. Product Overview
- **Product Name**: PDF Studio
- **Tagline**: *Your documents. Your control. Always offline.*
- **Context**: BSERC GenAI Internship — Week 2, Project 1
- **Category**: Offline-first Desktop PDF Editor & Document Processing Engine
- **Target Platforms**: macOS, Windows, Linux via Desktop Web Browsers (Target viewport: 1440px desktop, secondary: tablet/laptop)

## 2. Core Functional Requirements (29 Tools across 5 Modules)

### Module A — Organise (9 Tools) — [STATUS: IMPLEMENTED & VERIFIED]
1. **Merge PDF Files**: Combine two or more PDF files into a single ordered PDF file.
2. **Split PDF Documents**: Split a PDF into individual pages or custom page ranges (e.g., 1-3, 4-8).
3. **Reorder Pages**: Drag-and-drop page thumbnail reordering with visual preview and persistent order index.
4. **Rotate Individual Pages**: Clockwise (90°), counter-clockwise (-90°), and 180° page rotation per page or bulk.
5. **Delete Pages**: Remove selected pages with confirmation and real-time page count update.
6. **Duplicate Pages**: Clone existing pages and insert them adjacent to the source page.
7. **Extract Selected Pages**: Export specific selected pages into a new standalone PDF document.
8. **Insert Blank Pages**: Create and insert blank A4/letter pages at any position.
9. **Crop PDF Pages**: Define visual or numerical crop margins (top, bottom, left, right) to trim margins.

### Module B — Edit (9 Tools) — [STATUS: IMPLEMENTED & VERIFIED]
1. **Add Text**: Place custom text annotations with font size (8-72pt), colour, standard PDF fonts (Helvetica, Times, Courier), bold, italic, and alignment controls.
2. **Add Images**: Insert PNG, JPEG, or WebP images with bounding-box scaling and position coordinates.
3. **Highlight Text**: Highlight text spans and free-form rectangular regions with customizable highlight colors (Yellow, Green, Blue, Pink, Orange) and alpha transparency.
4. **Freehand Drawing**: Vectorized pen/ink drawing with variable stroke width, opacity, and color.
5. **Insert Geometric Shapes**: Rectangles, rounded rectangles, circles, ellipses, lines, and directional arrows with stroke/fill settings.
6. **Whiteout Content**: Visual opaque white rectangle overlay designed to obscure content for cosmetic presentation masks while preserving underlying streams.
7. **Securely Redact Sensitive Information**: Hard, permanent removal and sanitization of text, glyphs, and images from the underlying PDF content stream. Redacted text is permanently purged and cannot be extracted via `extract_text()`, copy-paste, or OCR parsers.
8. **Add Signatures**: Create signatures via three input modes: drawing on a digital pad, typing with cursive typography, or uploading a transparent PNG signature file, with optional signer label and timestamp metadata.
9. **Fill PDF Forms**: Detect interactive AcroForm fields (text fields, checkboxes, radio buttons, dropdowns) and serialize user inputs into the document, with optional form field flattening.

### Module C — Stamp (4 Tools) — [STATUS: IMPLEMENTED & VERIFIED]
1. **Watermarks**: Apply diagonal or horizontal text or logo watermarks across all pages or custom ranges with adjustable opacity, rotation, center or repeating grid tiling, and foreground overlay or background underlay placement.
2. **Page Numbers**: Add header/footer dynamic page numbering (Arabic 1,2,3, padded 01,02,03, lowercase Roman i,ii,iii, uppercase Roman I,II,III) with 6 positions (top/bottom × left/center/right), prefix/suffix, "Page X of Y", and skip cover page options.
3. **Headers & Footers**: Apply 3-column running headers and footers with dynamic template tags (`{title}`, `{page}`, `{total}`, `{date}`, `{time}`), divider lines, and margin controls.
4. **Date Stamps**: Insert formatted timestamps (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, full date) onto designated page margins with explicit visual stamp notices distinguishing visual stamps from PKI digital signatures.

### Module D — Convert (3 Tools) — [STATUS: IMPLEMENTED & VERIFIED]
1. **Images to PDF**: Convert collections of images (PNG, JPEG, WebP, TIFF) into an assembled PDF with page size choices (A4, Letter, A3, A5, Legal, Original, Custom), fit/fill/stretch scaling, and background color.
2. **PDF to Images**: Render and export pages to high-resolution PNG or JPEG images with selectable DPI (72, 96, 150, 200, 300 DPI), page ranges, individual downloads, and automated ZIP archive creation.
3. **PDF to Text**: Extract selectable text preserving layout and paragraph structure into downloadable `.txt` files, with character metrics, search filtering, and scanned document detection with OCR limitation warnings.

### Module E — Finish & Compare (4 Tools) — [STATUS: IMPLEMENTED & VERIFIED]
1. **PDF Compression**: Optimize document streams via Flate zlib algorithms, consolidate duplicate xref objects, and downsample embedded raster images with presets (Max Quality, Balanced, Strong, Custom) with truthful original vs. compressed file size reporting.
2. **Edit Document Metadata**: Inspect and update standard `/Info` catalog tags (Title, Author, Subject, Keywords, Creator, Producer, Creation/Mod Dates), custom dictionary keys, and technical document properties.
3. **Remove Document Metadata**: Clean all metadata dictionaries, XMP metadata streams, and tracking artifacts with Standard vs Deep clean rebuild modes and a post-sanitization Privacy Verification Report.
4. **Compare Two PDFs**: Dual document selection, page alignment handling, word-level text diffing, visual layout comparison with Side-by-Side, Overlay blend, and Difference Heatmap modes, plus exportable standalone HTML audit reports.

## 3. Privacy, Security & Offline Non-Negotiables
- **100% Localhost Operation**: Backend binds exclusively to `127.0.0.1`.
- **Zero External Telemetry**: No tracking scripts, analytics, or external API calls.
- **Air-Gapped Execution**: Functions completely when Wi-Fi and network adapters are disabled.
- **Zero Cloud Storage**: All PDF processing occurs on the local device filesystem/memory.
- **Non-Destructive Workflows**: Original files are never overwritten silently; all outputs are saved as new files.
- **Ephemeral Sandbox**: Uploaded files and processing artifacts are kept in a managed local temporary session directory with automated cleanup.

## 4. UI/UX Design System Specifications
- **Tokens**:
  - Primary Action: `#2859D9`
  - Deep Navy Text / Brand: `#17243B`
  - App Canvas / Neutral Background: `#F6F8FC`
  - Subtle Borders & Separators: `#DCE3EF`
  - Success / Saved Status: `#15966B`
  - Warning: `#D97706`
  - Danger / Redaction: `#DC2626`
- **Layout Structure**:
  - Top Bar: Brand logo, document title, undo/redo, zoom controls, save actions, offline status badge.
  - Left Rail: Module switchers (Organise, Edit, Stamp, Convert, Finish) & page thumbnail drawer.
  - Central Canvas: High-performance PDF.js canvas viewport with smooth pan and zoom.
  - Right Inspector: Contextual tool controls, active selection properties, and quick actions.
  - Bottom Status Bar: Current page / total pages, zoom level indicator, file size, offline badge.
