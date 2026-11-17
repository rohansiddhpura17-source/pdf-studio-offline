# PDF Studio — User Guide

## Welcome to PDF Studio
PDF Studio is your private, offline-first PDF workspace. All your documents remain on your local computer at all times.

---

## Getting Started

### Launching the Application
1. **Start the Local Backend**:
   ```bash
   cd 01-PDF-Studio/backend
   PYTHONPATH=. ./venv/bin/python3 -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
   ```
2. **Start the Frontend Client**:
   ```bash
   cd 01-PDF-Studio/frontend
   npm run dev
   ```
3. Open your browser and navigate to `http://127.0.0.1:5173`.

---

## Module B — Edit Workspace (Tools 1–9)

The Edit workspace provides professional annotation and markup tools accessed by clicking **Edit** in the left sidebar or the **Edit & Redact** card on the home screen.

### Tool 1: Add Text
1. Click the **Text** tool on the secondary toolbar.
2. Click anywhere on the document page where you want to place text.
3. Edit the text inline or in the right properties inspector.
4. Customize:
   - **Font Family**: Helvetica, Times-Roman, or Courier.
   - **Font Size**: 8 pt to 72 pt.
   - **Styling**: Bold, Italic, and Text Color picker.
   - **Opacity**: 10% to 100%.

### Tool 2: Add Images
1. Click the **Image** tool on the toolbar.
2. In the right properties inspector, click **Browse Image** and choose any PNG, JPEG, or WebP graphic.
3. The image is placed on the current page canvas.
4. Drag to reposition, or select it to adjust opacity.

### Tool 3: Highlight Text
1. Click the **Highlight** tool.
2. Select a highlight color swatch in the inspector (Yellow `#FFE500`, Green `#4CAF50`, Blue `#2196F3`, Pink `#E91E63`, Orange `#FF9800`).
3. Adjust the highlight opacity slider (default 40%).
4. Click and drag a box over the text to highlight. The highlight blends naturally with the underlying text.

### Tool 4: Freehand Drawing
1. Click the **Draw** tool.
2. Choose your brush color and adjust the stroke width (1 px to 15 px).
3. Draw freely on the canvas using mouse, stylus, or trackpad.
4. All strokes render as high-fidelity vector paths with smooth round caps and joins.

### Tool 5: Geometric Shapes
1. Click the **Shapes** tool.
2. Select a shape type in the inspector:
   - **Rectangle**
   - **Rounded Rectangle** (with configurable corner radius)
   - **Circle**
   - **Ellipse**
   - **Line**
   - **Directional Arrow**
3. Choose stroke width, stroke color, and fill color (or Transparent).
4. Click and drag on the canvas to draw the shape with live geometry.

### Tool 6: Whiteout Content (Cosmetic)
1. Click the **Whiteout** tool.
2. Drag a rectangle over the content you wish to visually hide.
3. An opaque white box covers the area.
4. *Important Note*: Whiteout is a cosmetic mask and preserves the underlying text for non-destructive workflows. If you need to permanently sanitize confidential information, use **Secure Redaction**.

### Tool 7: Secure Redaction
1. Click the **Redact** tool.
2. Two redaction modes are available:
   - **Area Redaction**: Drag a box over any content on the canvas.
   - **Search & Redact**: Enter a string (e.g. SSN, credit card, secret code) in the inspector and click **Sanitize**.
3. A security confirmation dialog appears explaining the irreversible nature of redaction.
4. Click **Confirm & Redact**.
5. The redaction burns an opaque black block with `[REDACTED]` overlay and **permanently purges** the underlying text from the PDF content stream.

### Tool 8: Digital Signatures
1. Click the **Sign** tool and select **Open Signature Pad**.
2. Choose your preferred signing mode:
   - **Draw**: Draw your signature with a stylus, trackpad, or mouse.
   - **Type**: Enter your name and see it rendered in cursive calligraphy script.
   - **Upload**: Upload a transparent PNG signature file.
3. Optionally add your signer name label and toggle the automated date/time stamp.
4. Click **Place on Document** to attach your signature stamp.

### Tool 9: PDF Form Filling
1. Click the **Form Fill** tool.
2. The system automatically inspects and highlights interactive AcroForm fields (text fields, checkboxes).
3. Click directly on form fields on the canvas to enter text or toggle checkboxes.
4. Check **Flatten form fields on export** if you want the filled values permanently embedded into page content.

### Saving & Committing Edits
- As you make edits, they preview live on the canvas and accumulate in the draft counter (e.g., `3 draft edits`).
- Use **Undo** (`Ctrl+Z`) and **Redo** (`Ctrl+Y`) to step through your editing history.
- Click **Save Edits** to burn all annotations, vector paths, redactions, and signatures into a new permanent document revision.

---

## Module A — Organise Workspace (Tools 1–9)

The Organise workspace is accessed via the **Organise** tab in the left rail.

### Tool 1: Merge PDF Files
1. In the right inspector, click **Add PDF Documents** to select external PDF files from your machine.
2. Review the list of documents and their respective page counts.
3. Click **Merge Documents** to compile them into a unified PDF.

### Tool 2: Split PDF Documents
Choose between three split modes:
* **Custom Page Ranges**: Enter comma-separated ranges (e.g. `1-2, 3-5`) to generate separate PDFs.
* **Every Page**: Split every page into an individual single-page PDF.
* **Break Points**: Split after specific page numbers.

### Tool 3: Reorder Pages
* **Drag-and-Drop**: Click and drag any page thumbnail to its desired new position.
* **Shift Buttons**: Use **Move Left** or **Move Right** to shift selected pages sequentially.
* **Invert Order**: Click **Invert Complete Sequence** to reverse the entire document order.

### Tool 4: Rotate Pages
1. Select one or more pages in the grid (or choose **All Pages** in the dropdown).
2. Choose **Rotate 90° Clockwise**, **Rotate 180°**, or **Rotate 270° Counter-Clockwise**.

### Tool 5: Delete Pages
1. Select the pages you wish to remove.
2. Click **Delete Selected Pages**.
3. Review the confirmation modal and confirm deletion.

### Tool 6: Duplicate Pages
1. Select the pages you want to duplicate.
2. Set the number of copies to create (1–10).
3. Click **Duplicate Page(s)**.

### Tool 7: Extract Pages
1. Select the pages to extract.
2. Click **Extract & Download Page(s)**. A standalone PDF is generated immediately.

### Tool 8: Insert Blank Pages
1. Select an anchor page.
2. Choose position (**Insert Before** or **Insert After**), paper format (**A4** or **Letter**), and orientation.
3. Click **Insert Blank Canvas**.

### Tool 9: Crop Pages
1. Select target pages and adjust the margins (Left, Top, Right, Bottom).
2. Click **Apply Crop Box**.

---

## Module C — Stamp Workspace (Tools 1–4)

Access the Stamp tools by clicking **Stamp** in the left sidebar or the **Stamp & Number** card on the home screen.

### Tool 1: Watermarks
1. Select **Watermark** in the left sidebar.
2. Choose **Text** or **Image / Logo**:
   - In **Text** mode, enter your watermark (e.g. `CONFIDENTIAL`, `DRAFT`) or select a preset chip. Adjust font, size, color, opacity (5–100%), and rotation angle (-180° to 180°). Toggle **Repeat Tiling Grid** to tile across the sheet, or choose **Background (Underlay)** to place the watermark behind existing document text.
   - In **Image** mode, upload a PNG/JPEG/WebP graphic, and adjust scale, opacity, rotation, and aspect lock.
3. Configure target pages (All, Selected, or Custom range), and click **Apply Watermark**.

### Tool 2: Page Numbers
1. Select **Page Numbers** in the left sidebar.
2. Select your desired placement from the 6 position buttons: Top-Left, Top-Center, Top-Right, Bottom-Left, Bottom-Center, or Bottom-Right.
3. Choose the numbering format:
   - **Arabic Standard**: `1, 2, 3...`
   - **Two-Digit Padded**: `01, 02, 03...`
   - **Lowercase Roman**: `i, ii, iii, iv...`
   - **Uppercase Roman**: `I, II, III, IV...`
4. Set prefix, suffix, start number, and toggle **Include Total ("Page X of Y")**.
5. Enable **Skip Cover Page** to omit numbering on page 1.
6. Click **Apply Page Numbers**.

### Tool 3: Headers & Footers
1. Select **Header & Footer** in the left sidebar.
2. Enter left, center, and right text for both the top header and bottom footer.
3. Click the dynamic variable pills (`+ {title}`, `+ {page}`, `+ {total}`, `+ {date}`, `+ {time}`) to insert live document tags.
4. Customize font, size, color, and toggle **Draw Subtle Divider Line**.
5. Click **Apply Header & Footer**.

### Tool 4: Date Stamps
1. Select **Date Stamp** in the left sidebar.
2. Choose a date format preset (`DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`, or `Full Text`) or type a custom date label.
3. Select position alignment (Top-Left, Top-Right, Bottom-Left, Bottom-Right, or Center).
4. Review the **Visual Stamp Notice** (distinguishing visual stamps from PKI digital signatures).
5. Click **Apply Date Stamp**.

---

## Module D — Convert Workspace (Tools 5–7)

Access conversion tools by clicking **Convert** in the left sidebar or the **Convert & Extract** card on the home screen.

### Tool 5: Images to PDF
1. Select **Images to PDF** in the left sidebar.
2. Drag and drop PNG, JPEG, WebP, or TIFF image files onto the upload dropzone.
3. Adjust the compilation sequence:
   - Use the **Up/Down** arrows to reorder images.
   - Click the **Rotate** button to rotate an image 90° clockwise.
   - Click the trash icon to remove an image.
4. In the right inspector, select target page size (**A4**, **Letter**, **A3**, **A5**, **Legal**, or **Original**), orientation, fit mode (**Fit**, **Fill**, or **Stretch**), margin, and canvas background color.
5. Click **Compile to PDF** to assemble the images into a clean PDF document.

### Tool 6: PDF to Images
1. Select **PDF to Images** in the left sidebar.
2. Choose output image format (**PNG Lossless** or **JPEG Compressed**).
3. Select target resolution from the DPI presets (**72 DPI** for web, **96 DPI** for screens, **150 DPI** balanced, **200 DPI** high-res, or **300 DPI** print).
4. If JPEG is selected, configure the quality slider (30–100%).
5. Select target page range, and click **Render Images & Export**.
6. The gallery displays all rendered page images with dimensions and file sizes:
   - Click **Save** on any card to download an individual page image.
   - Click **Download All as ZIP** in the header banner to download the entire set archived in a single `.zip` file.

### Tool 7: PDF to Text
1. Select **PDF to Text** in the left sidebar.
2. Choose extraction mode (**Plain Text** for clean reading and copying, or **Preserve Layout** for spatial formatting).
3. Toggle **Preserve Page Breaks** to insert standard page separators.
4. Click **Extract Text**.
5. In the viewer:
   - Click tabs to switch between the full document and individual pages.
   - Use the search bar to locate and highlight keywords across the extracted text.
   - Click **Copy Text** to copy content to the clipboard.
   - Click **Download .TXT** to export the text as a `.txt` file.
   - If the document contains scanned raster pages with low text density, an informative **Scanned Document Detected** alert banner explains that vector text extraction was performed and OCR is not included.

---

## Module E — Finish & Compare Workspace (Tools 1–4)

Access finalization and comparison tools by clicking **Finish** in the left sidebar or the **Compress PDF** / **Compare PDFs** cards on the home screen.

### Tool 1: PDF Compression
1. Select **PDF Compression** in the Finish sidebar.
2. Review current document metrics (file size, page count).
3. Select an optimization profile:
   - **Maximum Quality**: 300 DPI graphics, lossless stream deflation, duplicate font deduplication. Best for high-res printing and document archives.
   - **Balanced (Recommended)**: 150 DPI graphics, 85% JPEG quality. Standard distribution preset.
   - **Strong Compression**: 96 DPI graphics, 70% JPEG quality, stripped metadata. Maximum reduction for email attachments.
   - **Custom**: Manually adjust the Raster Image DPI slider (72 to 300 DPI) and JPEG Compression Quality slider (40% to 100%).
4. Advanced Pipeline Toggles:
   - Toggle **Compress Content Streams** (deflate page operators and text runs).
   - Toggle **Deduplicate Identical Objects** (consolidate shared fonts and color profiles).
   - Toggle **Resample Raster Images** (downsample high-resolution bitmaps).
   - Toggle **Retain Metadata Dictionary**.
5. Click **Compress PDF**.
6. The emerald results banner displays:
   - Original vs compressed file size.
   - Exact bytes saved and percentage reduction ratio.
   - Visual space optimization meter.
   - Single-click **Download Compressed PDF** or **Replace Active Editor Document**.

### Tool 2: Edit Metadata
1. Select **Edit Metadata** in the Finish sidebar.
2. Inspect the **Document Information Dictionary** and **Technical Properties Bar** (PDF specification version, page dimensions, byte size, and XMP XML stream presence).
3. Update standard metadata fields:
   - **Title**, **Author**, **Subject**, **Keywords** (rendered as clickable tag pills), **Creator application**, **Producer engine**, **Creation Date**, and **Modification Date**.
4. Add custom dictionary keys:
   - Enter a key name (e.g. `Department`) and value (e.g. `Compliance Division`).
   - Click **Add Key** to insert it into the custom dictionary list.
   - Click the trash icon to delete any custom field.
5. Click **Save Metadata** to write changes directly into the PDF trailer dictionary.

### Tool 3: Remove Metadata (Privacy Sanitization)
1. Select **Remove Metadata** in the Finish sidebar.
2. Review the **Essential Notice**: Clarifies that metadata removal purges hidden background headers and tracking artifacts, while visible page content must be removed using the **Secure Redaction** tool in the Edit workspace.
3. Select a sanitization mode:
   - **Standard Sanitization**: Clears identifying author fields while preserving document bookmark trees.
   - **Deep Sanitization (Clean Rebuild)**: Completely reconstructs the PDF catalog, wiping `/Info`, stripping the `/Metadata` XMP stream, and deleting embedded thumbnail caches.
4. Customize granular attributes to purge:
   - Author & Creator, Document Title, Subject, Keywords, Software Footprints, Timestamps, Custom Keys, XMP Stream, and Embedded Thumbnails.
5. Click **Sanitize & Rebuild PDF**.
6. The **Privacy Verification & Audit Report** confirms:
   - Total fields detected before sanitization.
   - Total fields purged and erased.
   - Sanitization status badge ("100% Clean").
   - Single-click **Download Sanitized PDF**.

### Tool 4: Compare PDFs (Dual-Document Diffing)
1. Select **Compare PDFs** in the Finish sidebar.
2. Document A (Original / Baseline) is automatically populated with the active document.
3. Choose Document B (Revised / Modified):
   - Click **Upload Revised PDF** to pick a file from your computer.
   - Or click **Create Sample Revision & Compare** to generate an instant synthetic revision for side-by-side analysis.
4. Select comparison scope (**All**, **Text Only**, or **Visual Only**) and adjust the **Visual Sensitivity** slider (5 to 50, default 15).
5. Explore differences across the interactive viewer:
   - **Side-by-Side Mode**: Inspect original and revised pages simultaneously with synchronized page navigation.
   - **Overlay Mode**: Blend the two documents with an interactive 0–100% opacity slider to catch subtle text shifts and layout movements.
   - **Difference Heatmap Mode**: View pixel-variance heatmaps with changed regions highlighted in magenta/crimson and exact variance percentage pills.
   - **Text Diff Tab**: Review word-level additions (green `+`), deletions (red `-`), and modified text blocks.
6. Click **Export Audit Report** in the header or inspector to open and save a self-contained local HTML audit report containing complete comparative metrics.

