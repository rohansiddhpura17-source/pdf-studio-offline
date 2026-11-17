# PDF Studio — Architecture & Technical Design

## 1. High-Level Architecture Overview

PDF Studio is structured as an offline-first desktop web application comprising a modern React 19 / TypeScript frontend client communicating locally over loopback HTTP (`127.0.0.1`) with a Python FastAPI microservice.

```mermaid
flowchart TD
    subgraph Browser ["Browser Client (Port 5173 / Localhost)"]
        UI["React 19 + TypeScript + Tailwind CSS"]
        DocStore["Zustand Document Store (Navigation, Zoom, History)"]
        EditStore["Zustand Edit Store (Draft Edits, Undo/Redo, Tool Config)"]
        Renderer["PDF.js Local Canvas Engine (/cmaps/ bundled offline)"]
        AnnotationLayer["Interactive SVG/HTML Annotation Layer (Scale & DPI Aware)"]
        OrganiseUI["Organise Workspace (Page Grid, Multi-Select, Drag & Drop)"]
        EditInspector["Contextual Tool Properties Inspector"]
    end

    subgraph Backend ["Python Local Service (Port 8001 / 127.0.0.1)"]
        API["FastAPI App (Localhost Security Guard)"]
        DocRouter["Document Router (/api/document/*)"]
        OrganiseRouter["Organise Router (/api/organise/*)"]
        EditRouter["Edit Router (/api/edit/*)"]
        
        DocService["PDFDocumentService (Structure Inspection & Thumbnails)"]
        OrganiseService["PDFOrganiseService (pypdf Page Manipulation Engine)"]
        EditService["PDFEditService (Vector Stream Generator & Form Engine)"]
        RedactService["PDFRedactService (C-level Stream Sanitizer & Purge)"]
        Storage["Local Temp Sandbox (UUID-isolated, Non-destructive)"]
    end

    UI <--> |REST JSON / Binary Stream| API
    AnnotationLayer <--> |Normalized PDF Points (72 pt/in)| EditStore
    EditStore --> EditRouter
    EditRouter --> EditService
    EditService --> RedactService
    EditService --> Storage
    OrganiseUI --> OrganiseRouter
    OrganiseRouter --> OrganiseService
    DocRouter --> DocService
```

---

## 2. Coordinate Transformation Model

PDF Studio implements a strict separation between viewport display pixels and permanent document coordinates:

1. **PDF Point Space**: Standard PDF coordinates use typographic points (`72 pt/inch`), with the mathematical origin `(0, 0)` located at the **bottom-left** corner of the page MediaBox/CropBox.
2. **Screen Canvas Space**: Browser DOM and mouse events use pixels with origin `(0, 0)` at the **top-left** of the visible viewport.
3. **Transformation Functions**:
   $$\text{scaleX} = \frac{\text{displayedWidthPx}}{\text{pdfWidthPt}}, \quad \text{scaleY} = \frac{\text{displayedHeightPx}}{\text{pdfHeightPt}}$$
   $$\text{x}_{\text{pdf}} = \frac{\text{px}}{\text{scaleX}}$$
   $$\text{y}_{\text{pdf}} = \text{pdfHeightPt} - \frac{\text{py}}{\text{scaleY}} - \text{elementHeightPt}$$
   $$\text{leftPx} = \text{x}_{\text{pdf}} \cdot \text{scaleX}$$
   $$\text{topPx} = (\text{pdfHeightPt} - \text{y}_{\text{pdf}} - \text{elementHeightPt}) \cdot \text{scaleY}$$

This guarantees that all annotations, drawings, highlights, redactions, and signatures remain pixel-perfect regardless of viewport zoom level (`25%` to `400%`), window resizing, or Retina `devicePixelRatio`.

---

## 3. Module B — Edit Architecture

The Edit engine in `backend/services/pdf_edit.py` and `backend/services/pdf_redact.py` implements genuine vector manipulations without external cloud dependencies:

### 3.1 Vector PDF Stream Synthesizer
- **Text Elements**: Injects standard PDF Type1 fonts (`/Helvetica`, `/Helvetica-Bold`, `/Times-Roman`, `/Courier`) with exact font sizing, RGB color operators (`rg`), and text matrices (`BT`, `Tf`, `Td`, `Tj`, `ET`).
- **Geometric Shapes**: Synthesizes pure PostScript/PDF path drawing operators:
  - Rectangles: `x y w h re` with stroke (`S`) or fill (`b`/`f`).
  - Rounded Rectangles: Path construction using cubic Bézier segments (`c` operator with constant $k = 0.5522847498 \times \text{radius}$).
  - Circles & Ellipses: 4-segment Bézier curves centered at $(cx, cy)$.
  - Lines & Directional Arrows: Vector lines (`m`, `l`, `S`) with trigonometrically computed arrowheads ($30^\circ$ barb angle, calculated via $\theta = \operatorname{atan2}(\Delta y, \Delta x)$).
- **Freehand Drawing**: Smoothed polyline paths utilizing round line caps (`1 J`) and round line joins (`1 j`).
- **Highlights**: Color rectangle overlays blended using semi-transparent `/ExtGState` dictionaries with `/ca` / `/CA` alpha parameters ($0.2$ to $0.8$).

### 3.2 Secure Redaction Stream Sanitizer (`pdf_redact.py`)
- **Cosmetic Whiteout vs. True Redaction**:
  - *Whiteout*: Appends an opaque white fill box (`1 1 1 rg re f`). Leaves underlying text bytes completely intact in the stream for non-destructive presentation covers.
  - *Secure Redaction*: Permanently tokenizes and rewrites the content stream. Deletes text literals from `Tj` and `TJ` operations, purges overlapping `/Annots` (links, popups, form widgets) from the page dictionary, and paints an opaque redaction block with contrasting overlay text (`[REDACTED]`).
  - **Automated Verification**: Rigorously tested with `assert secret_text not in extracted_text`.

### 3.3 Digital Signatures
- **Visual Stamp Implementation**: Converts drawn vectors, typed script typography (e.g. cursive Brush Script), or uploaded transparent PNGs into PDF image XObjects.
- **Placement & Scaling**: Utilizes `pypdf.Transformation` to position and scale signatures without raster degradation.
- **Cryptographic Distinction**: App explicitly informs users that visual signature stamps are for approval and signing workflows, distinguished from X.509 PKI certificate hardware tokens.

### 3.4 AcroForm Detection & Processing
- **Inspection**: Evaluates document catalog `/AcroForm` dictionaries and page-level `/Widget` annotations.
- **Filling**: Employs `PdfWriter.update_page_form_field_values()` for interactive text fields and checkboxes.
- **Flattening**: Optional feature to bake interactive form inputs into static page content streams.

---

## 4. Module A — Organise Architecture

All 9 Organise tools operate non-destructively on PDF content streams:

1. **Merge (`POST /api/organise/merge`)**: Streams multiple input PDFs into a new ordered PDF document.
2. **Split (`POST /api/organise/split`)**: Partitions documents by page slices, custom comma-separated ranges, or break points.
3. **Reorder (`POST /api/organise/reorder`)**: Rebuilds the document sequence using an explicit 1-indexed page permutation.
4. **Rotate (`POST /api/organise/rotate`)**: Permanently modifies `/Rotate` page attributes (90°, 180°, 270° CW).
5. **Delete (`POST /api/organise/delete`)**: Filters out specified page indices, guaranteeing at least one page remains.
6. **Duplicate (`POST /api/organise/duplicate`)**: Clones targeted page dictionaries and inserts consecutive copies.
7. **Extract (`POST /api/organise/extract`)**: Assembles arbitrary page sets into an independent standalone PDF.
8. **Insert Blank (`POST /api/organise/insert-blank`)**: Synthesizes blank vector canvas pages (A4/Letter in portrait/landscape).
9. **Crop (`POST /api/organise/crop`)**: Adjusts `/CropBox` and `/MediaBox` bounding coordinates with validation against inverted boundaries.

---

## 5. Module C — Stamp Architecture

Module C (`backend/services/pdf_stamp.py`) implements specialized vector and image stamping tools:

### 5.1 Watermark Engine
- **Text Watermarks**: Synthesizes Type1 font text matrices (`[cos θ, sin θ, -sin θ, cos θ, cx, cy] Tm`) with user-specified rotation, point size, RGB coloration, and opacity (`/ExtGState` transparency dictionary).
- **Tiling Grid Repeat**: Calculates spatial grid steps across page `MediaBox` bounds and renders repeating tiled watermarks (`loose`: 2×2, `medium`: 2×3, `dense`: 3×4).
- **Foreground vs. Background Underlay**:
  - *Foreground*: Appended to the page's `/Contents` stream array so it renders above document text and imagery.
  - *Background (Underlay)*: Prepended to `/Contents` via `ArrayObject([bg_stream, orig_stream])` so it renders behind document text and vectors.
- **Image Watermarks**: Embeds PNG/JPEG/WebP image XObjects, scaling to user ratios and applying alpha masks while preserving aspect ratios.

### 5.2 Page Numbering Engine
- **6-Position Geometry**: Top-Left, Top-Center, Top-Right, Bottom-Left, Bottom-Center, Bottom-Right calculated relative to page width and height with customizable margins (`margin_x`, `margin_y`).
- **Formatting Schemes**:
  - `arabic`: Standard 1, 2, 3...
  - `padded`: Two-digit padded `01`, `02`, `03`...
  - `roman_lower`: Lowercase Roman numerals (`i`, `ii`, `iii`, `iv`, `v`...) via algorithmic subtraction mapping.
  - `roman_upper`: Uppercase Roman numerals (`I`, `II`, `III`, `IV`, `V`...).
- **Options**: Start number offset, custom prefix/suffix (`Page X of Y`), and `skip_cover` to exclude page 1 (cover page).

### 5.3 Headers and Footers Engine
- **Three-Column Spatial Layout**: Independent left-aligned, center-aligned, and right-aligned text fields for both the top header and bottom footer margins.
- **Dynamic Template Placeholders**: Evaluates tags at render time:
  - `{title}`: Document name.
  - `{page}`: Current page number.
  - `{total}`: Total pages in document.
  - `{date}`: Localized formatted date.
  - `{time}`: Current time string.
- **Divider Lines**: Optional horizontal stroke lines (`m`, `l`, `S`) with custom stroke colors separating headers and footers from document body content.

### 5.4 Date Stamp Engine
- **Visual Timestamps**: Formats local dates (`DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`, `07 November 2026`) or custom text with rotation, opacity, and positioning.
- **Compliance & Legal Safety**: Distinguishes visual date stamps from PKI cryptographic certificates.

---

## 6. Module D — Convert Architecture

Module D (`backend/services/pdf_convert.py`) implements bidirectional document and image format conversions:

### 6.1 Images to PDF Engine
- **Batch Raster Assembly**: Decodes PNG, JPEG, WebP, and TIFF images via Pillow (PIL).
- **Standard Page Sizes**: Normalizes to standard typographic point dimensions (A4: 595.28 × 841.89 pt, Letter: 612 × 792 pt, A3, A5, Legal, Original, Custom).
- **Fit & Scaling Modes**:
  - `fit` (Contain): Proportional scaling to fit within page margins without cropping.
  - `fill` (Crop): Proportional scaling to fill entire page area.
  - `stretch`: Non-proportional stretching to exact available width and height.
- **Background Compositing**: For transparent PNG/WebP images, composites over configurable background colors (`bg_color`).

### 6.2 PDF to Images Rasterizer
- **High-DPI Poppler Rendering**: Integrates with local `pdftoppm` binary to rasterize vector PDF pages at 72, 96, 150, 200, or 300 DPI into lossless PNG or quality-adjusted JPEG images.
- **Automated ZIP Packaging**: Employs Python `zipfile` with `ZIP_DEFLATED` compression to archive rendered pages into a downloadable zip file (`document_images.zip`).
- **Individual Previews & Downloads**: Returns base64 thumbnails and pixel dimensions for immediate browser gallery viewing and individual downloads.

### 6.3 PDF to Text Extractor
- **Extraction Modes**: Supports `plain` text extraction (optimized for reading and searching) and `layout` preservation (maintaining column spacing).
- **Page Segmentation**: Provides page-by-page character counts and text breakdowns alongside concatenated full document text.
- **Scanned Document Detection**: Evaluates character density per page ($<15$ characters with image present indicates a raster scan). Emits an informative notice explaining that vector text extraction was performed and that OCR is excluded.

---

## 7. Module E — Finish & Compare Architecture

Module E (`backend/services/pdf_finish.py`) implements finalization, privacy sanitization, and dual-document verification:

### 7.1 PDF Compression Engine
- **Three-Stage Optimization Pipeline**:
  1. *Flate Stream Deflation*: Compresses uncompressed content streams, glyph runs, and page descriptors using zlib/flate algorithms.
  2. *Object Deduplication*: Inspects the PDF cross-reference table (`xref`), identifying duplicated font subsets, ColorSpace profiles, and shared resources, repointing them to unified indirect objects via `writer.compress_identical_objects()`.
  3. *Adaptive Raster Downsampling*: Iterates page XObject images via Pillow (PIL), downsampling high-DPI bitmaps to target resolutions (72, 96, 150, or 300 DPI) and applying DCT JPEG compression with user-defined quality factors.
- **Truthful Reduction Metrics**:
  $$\text{bytes\_saved} = \text{original\_size\_bytes} - \text{compressed\_size\_bytes}$$
  $$\text{percent\_reduction} = \frac{\text{bytes\_saved}}{\text{original\_size\_bytes}} \times 100$$
  If a file is already optimized, the service returns truthful zero/minimal delta statistics without artificial fabrication or padding.

### 7.2 PDF Metadata Inspection & Editing Engine
- **Standard Catalog Fields**: Reads and writes standard PDF `/Info` dictionary tags (`/Title`, `/Author`, `/Subject`, `/Keywords`, `/Creator`, `/Producer`, `/CreationDate`, `/ModDate`).
- **Custom Dictionary Keys**: Supports arbitrary `/CustomKey = Value` insertion into the document trailer `/Info` dictionary.
- **Technical Document Properties**: Extracts structural metrics including PDF specification version (e.g. `1.7`), page dimensions in typographic points, byte sizes, and XMP XML stream presence.

### 7.3 PDF Metadata Removal & Privacy Sanitization Engine
- **Sanitization Modes**:
  - *Standard Sanitization*: Nullifies identifying author attributes while preserving document bookmarks and outline trees.
  - *Deep Sanitization (Clean Rebuild)*: Reconstructs the document catalog from scratch. Completely strips the `/Info` trailer dictionary, purges the `/Metadata` XML stream, and deletes embedded thumbnail caches.
- **Privacy Verification & Audit**: Evaluates the output PDF to verify zero metadata residuals and produces a `PrivacyVerificationReport` listing `fields_before`, `fields_removed`, and `fields_remaining`.
- **Architectural Distinction vs Redaction**: Prominently clarifies that metadata sanitization strips background headers and software fingerprints, whereas visual page text and raster images require the Secure Redaction tool.

### 7.4 Dual-Document Comparison Engine
- **Page Alignment Strategy**: Handles documents of differing lengths ($N_{\text{orig}} \neq N_{\text{rev}}$), categorizing extra pages as `added` or `removed`.
- **Word-Level Text Diffing**: Employs Python `difflib.SequenceMatcher` to tokenize page text into word vectors, identifying exact insertions, deletions, and replacements with page-by-page mapping.
- **Pixel-Level Visual Differencing**:
  1. High-resolution page rasterization via local Poppler `pdftoppm`.
  2. Canvas dimension alignment and difference calculation via `ImageChops.difference(orig, rev)`.
  3. Sensitivity thresholding: pixels with delta $> \tau$ (default $\tau = 15$) are classified as changed.
  4. Magenta/crimson heatmap generation via `Image.composite(magenta_overlay, orig, mask)`.
- **Self-Contained Audit Reports**: Generates standalone, offline HTML audit reports containing side-by-side metadata cards, summary statistics, and formatted tabular text diff logs.

---

## 8. Dependency Licensing Review

| Library | License | Usage in PDF Studio | Distribution & Compliance Notes |
| :--- | :--- | :--- | :--- |
| **FastAPI** | MIT | Local REST routing & validation | Completely permissive for commercial and private use. |
| **Uvicorn** | BSD-3-Clause | ASGI server binding to 127.0.0.1:8001 | Completely permissive. |
| **pypdf** | BSD-3-Clause | Document metadata, page merging, splitting, reordering, cropping, vector stream insertion, form filling | Completely permissive pure-Python engine. |
| **Pillow (PIL)**| HPND | Image parsing, transparency compositing, PDF rasterization | Permissive BSD-like image manipulation. |
| **pdfjs-dist** | Apache 2.0 | Client-side viewport rendering & thumbnail generation | Permissive; worker script and `/cmaps/` bundled locally. |
| **Lucide React**| ISC | UI iconography | Permissive. |
| **Framer Motion**| MIT | UI transitions and modal interactions | Permissive. |
