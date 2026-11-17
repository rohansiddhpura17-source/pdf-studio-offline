# PDF Studio — Security & Privacy Architecture

## 1. Privacy First Principles

PDF Studio is built specifically for users handling sensitive legal contracts, medical reports, financial spreadsheets, and personal identity documents. In contrast to online PDF converters that transmit files to third-party cloud infrastructure, PDF Studio guarantees that **no document bytes ever leave the local machine**.

### Core Guarantees:
1. **Zero External API Calls**: PDF Studio makes 0 outgoing requests to third-party endpoints.
2. **Air-Gapped Operation**: Once dependencies are installed, the application runs without any internet connection.
3. **No Telemetry or Tracking**: No Google Analytics, Mixpanel, Sentry, or tracking beacons are present.
4. **No Mandatory Authentication**: Users do not need an account, password, or cloud subscription.
5. **No Long-Term Data Retention**: Temporary working files are kept in a local session folder and can be cleared instantly via Application Settings.

---

## 2. Secure Redaction vs. Superficial Whiteout

One of the most catastrophic security failures in document management is superficial redaction: drawing a black or white rectangle over text while leaving the raw text strings and vectors intact within the PDF's content streams. Adversaries can easily highlight, copy, pdftotext, or inspect the hidden text with standard tools.

### Comparison Table:

| Property | Tool 6: Whiteout | Tool 7: Secure Redaction |
| :--- | :--- | :--- |
| **Purpose** | Cosmetic presentation masking | Permanent confidential data destruction |
| **Underlying PDF Streams** | Preserved intact | Completely purged and rewritten |
| **Searchability (`Ctrl+F`)** | Text remains searchable | Text cannot be found or matched |
| **Automated Extraction** | `extract_text()` returns original content | `extract_text()` returns `""` (verified) |
| **Overlapping Annotations** | Retained | Automatically stripped and purged |
| **Reversibility** | Reversible (remove overlay rectangle) | **Irreversible** once saved |
| **UI Safety Guard** | Warning note in Inspector | **Modal Confirmation Dialog** with security warning |

### True Redaction Implementation in PDF Studio (`pdf_redact.py`):
1. **Target Stream Rewriting**: Parses and filters content streams. Literal operands in text showing operators (`Tj`, `TJ`, `'`, `"`) matching target text patterns or coordinate bounding boxes are deleted and substituted with empty tokens.
2. **Annotation Purging**: Inspects `/Annots` dictionaries on the page. Any hyperlinks, popup notes, comments, or form widgets whose `/Rect` intersects the redaction bounding box are permanently removed.
3. **Opaque Visual Block**: Burns a solid black (or user-customized color) vector rectangle into the rewritten stream (`q r g b rg x y w h re f Q`) with optional contrasting overlay text (`[REDACTED]`).
4. **Automated Verification**: Rigorously verified in `backend/tests/test_edit.py::test_tool7_secure_redaction_permanent_removal` with:
   ```python
   assert secret_text not in extracted, f"CRITICAL SECURITY FAILURE: {secret_text} was still extractable from PDF!"
   ```

---

## 3. Visual Signatures vs. Cryptographic PKI Signatures

PDF Studio provides an intuitive, privacy-conscious digital signature workflow:
- **Visual Signature Stamps (Module B - Tool 8)**:
  - Users can draw their signature with a mouse/stylus, type their name rendered in realistic cursive calligraphy, or upload a transparent PNG signature.
  - Visual signatures are embedded as vector-scaled image XObjects with optional timestamp and signer metadata.
  - **Security Notice**: PDF Studio explicitly clarifies in the UI that visual stamps provide visual approval markings and do not constitute X.509 PKI certificate cryptographic signatures. This avoids misleading users into assuming hardware token validation.

---

## 4. Localhost Endpoint Security & Sandboxing

Because the backend runs as an HTTP service on `127.0.0.1:8001`, browser-based cross-origin risks (such as malicious websites attempting to probe loopback ports) are mitigated by:
1. **Loopback IP Enforcement**: `LocalhostSecurityMiddleware` strictly verifies `request.client.host in ("127.0.0.1", "::1", "localhost")`, immediately returning HTTP 403 Forbidden to any external network interface.
2. **Strict CORS Policy**: Only requests originating from `http://localhost:5173` and `http://127.0.0.1:5173` are permitted.
3. **Cryptographic UUID File Handles**: Clients never specify absolute filesystem paths. All operations reference cryptographic 32-character hexadecimal UUID session tokens mapped inside an isolated local temporary sandbox.
4. **Path Traversal Guards**: Filenames are sanitized via `sanitize_filename()`, preventing `../` directory traversal attacks.

---

## 5. Module C & D Security, Watermarking & OCR Disclosures

### 5.1 Watermark & Date Stamp Visual Marking Notice
- Visual watermarks and date stamps (Module C — Tools 1 & 4) alter the presentation layers of PDF files (via foreground overlay or background underlay arrays).
- **Distinction from Cryptographic Verification**: The application UI explicitly highlights that date stamps and visual watermarks provide visual provenance only. They do not constitute certified cryptographic PKI timestamp tokens or non-repudiation digital signatures.

### 5.2 Scanned Document Detection & OCR Limitation Disclosures
- When extracting text (Module D — Tool 7), rasterized image-based PDFs (such as scanned physical receipts or photocopied contracts) lack a selectable vector text stream.
- **Intelligent Scan Detection**: PDF Studio automatically calculates character density per page ($<15$ characters with raster graphics present triggers a scan detection flag).
- **Clear User Notice**: Rather than silently returning empty text files or claiming OCR took place, PDF Studio immediately surfaces a prominent warning notice in both the API response and browser UI explaining that vector text extraction was performed and that OCR is not included in this phase.


---

## 6. Module E — Metadata Sanitization vs. Secure Redaction

PDF Studio enforces a critical security and privacy boundary between background document metadata sanitization and visual content redaction:

| Dimension | Metadata Sanitization (Module E - Tool 3) | Secure Redaction (Module B - Tool 7) |
| :--- | :--- | :--- |
| **Target Layer** | Document headers, `/Info` trailer, XML XMP stream, thumbnail caches | Visible page content streams, text glyphs, vector shapes, embedded raster images |
| **Purged Content** | Author names, creation software, modification dates, camera metadata, organization tags | Sensitive text strings (names, account numbers, SSNs, medical codes), visual signatures |
| **Effect on Page** | Zero visual changes to displayed document pages | Visual bounding box masked with opaque color (e.g. black) and optional label |
| **Underlying Stream** | `/Info` and `/Metadata` dictionary keys purged from catalog | Operands and glyph runs inside content stream deleted and substituted |
| **Verification Method** | `PrivacyVerificationReport` verifying empty `/Info` and missing `/Metadata` | Content stream parsing verifying zero occurrences of target text strings |

### UI Safety Disclosures:
- When using **Remove Metadata**, the interface displays a persistent warning banner stating:
  > *"Important distinction: Removing metadata purges hidden document headers, authorship tags, and creation dates. It does not erase text on the visual page. To securely redact visible page text or figures, use the Secure Redaction tool in the Edit workspace."*

---

## 7. Dual-Document Comparison Privacy & Truthful Metrics

1. **Local Pixel Comparison**: Poppler rasterization and `ImageChops` delta diffing run entirely in local memory. Rendered page images are encoded as ephemeral base64 buffers directly in API responses and are never transmitted to external cloud services.
2. **Deterministic Text Alignment**: Word diffs are derived using Python's native `difflib.SequenceMatcher`, operating entirely on local disk files.
3. **Audit Report Portability**: Generated HTML reports are self-contained with inline CSS and zero external script, font, or analytics dependencies.

---

## 8. Temporary File Management & Cleanup
- Working files are stored in `01-PDF-Studio/backend/temp_storage/`.
- Users can click **Purge Temporary Files** in the Settings screen at any time.
- On backend graceful shutdown, temporary session files are automatically cleared.
