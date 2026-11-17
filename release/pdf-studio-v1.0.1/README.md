# PDF Studio

> **Your documents. Your control. Always offline.**  
> *BSERC GenAI Internship — Week 2: Project 1 (Production Release v1.0.0)*

PDF Studio is a desktop-grade, privacy-first PDF editing and document management suite that executes entirely on your local machine. All document processing occurs strictly offline on loopback (`127.0.0.1`), ensuring zero document data leakage, zero telemetry, and complete user sovereignty.

---

## Production Status: Phase 6 Completed (Production Release v1.0.0)

- **29 of 29 Tools Operational & Independently Verified (100% Pass Rate)**
- **51 of 51 Backend Pytest Tests Passing**
- **4 of 4 Security & Privacy Verification Gates Passing (Byte-Level Redaction, Deep Metadata Purge, Path Boundary, Air-Gap Integrity)**
- **Performance Benchmarked (1p, 10p, 50p, 100p Scalability Verified)**
- **Zero-Dependency Air-Gap Guarantee:** No external CDNs, analytical trackers, or third-party web fonts.
- **Production Package Assembled:** Standalone ZIP distribution and SHA-256 checksum manifest generated.

---

## Complete 29-Tool Suite Overview

| Module | # | Tool Name | Verification Artifact | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Module A: Organise** | 1 | Merge PDFs | `tool01_merged.pdf` | **PASS (100%)** |
| | 2 | Split PDF | `tool02_split_p1.pdf` | **PASS (100%)** |
| | 3 | Reorder Pages | `tool03_reordered.pdf` | **PASS (100%)** |
| | 4 | Rotate Pages | `tool04_rotated.pdf` | **PASS (100%)** |
| | 5 | Delete Pages | `tool05_deleted.pdf` | **PASS (100%)** |
| | 6 | Extract Pages | `tool06_extracted.pdf` | **PASS (100%)** |
| | 7 | Duplicate Pages | `tool07_duplicated.pdf` | **PASS (100%)** |
| | 8 | Insert Blank Pages | `tool08_inserted_blank.pdf` | **PASS (100%)** |
| | 9 | Crop Pages | `tool09_cropped.pdf` | **PASS (100%)** |
| **Module B: Edit** | 10 | Add Text | `tool10_add_text.pdf` | **PASS (100%)** |
| | 11 | Add Images | `tool11_add_image.pdf` | **PASS (100%)** |
| | 12 | Highlight | `tool12_highlight.pdf` | **PASS (100%)** |
| | 13 | Freehand Draw | `tool13_draw.pdf` | **PASS (100%)** |
| | 14 | Geometric Shapes | `tool14_shapes.pdf` | **PASS (100%)** |
| | 15 | Whiteout / Mask | `tool15_whiteout.pdf` | **PASS (100%)** |
| | 16 | Secure Redaction | `tool16_redacted.pdf` | **PASS (100%)** |
| | 17 | Digital Signatures | `tool17_signature.pdf` | **PASS (100%)** |
| | 18 | PDF Form Filling | `tool18_form_filled.pdf` | **PASS (100%)** |
| **Module C: Stamp** | 19 | Watermarks | `tool19_watermark.pdf` | **PASS (100%)** |
| | 20 | Page Numbers | `tool20_page_numbers.pdf` | **PASS (100%)** |
| | 21 | Headers & Footers | `tool21_header_footer.pdf` | **PASS (100%)** |
| | 22 | Date Stamps | `tool22_date_stamp.pdf` | **PASS (100%)** |
| **Module D: Convert** | 23 | Images to PDF | `tool23_images_to_pdf.pdf` | **PASS (100%)** |
| | 24 | PDF to Images | `tool24_pdf_to_images.zip` | **PASS (100%)** |
| | 25 | PDF to Text | `tool25_extracted_text.txt` | **PASS (100%)** |
| **Module E: Finish & Compare** | 26 | PDF Compression | `tool26_compressed.pdf` | **PASS (100%)** |
| | 27 | Edit Metadata | `tool27_edited_metadata.pdf` | **PASS (100%)** |
| | 28 | Remove Metadata | `tool28_cleansed_metadata.pdf` | **PASS (100%)** |
| | 29 | Compare PDFs | `tool29_comparison_report.html` | **PASS (100%)** |

---

## Quickstart Launch

### 1. Start PDF Studio (Single Command)
```bash
bash scripts/start_pdf_studio.sh
```
This script dynamically discovers paths, checks Python 3 and Node.js availability, launches backend services on loopback port `8001`, and hosts the application:
- **Standalone Production UI:** `http://127.0.0.1:8001/`
- **Development UI:** `http://127.0.0.1:5173/`
- **API Swagger Documentation:** `http://127.0.0.1:8001/docs`

### 2. Stop PDF Studio
```bash
bash scripts/stop_pdf_studio.sh
```
Cleanly terminates background processes and releases port listeners.

---

## Verification & Testing Commands

All verification commands are non-destructive and generate physical evidence:

```bash
# 1. Backend Pytest Suite (51 Unit & Integration Tests)
cd backend && PYTHONPATH=. ./venv/bin/python3 -m pytest tests/ -v

# 2. Master 29-Tool Matrix Verification
python3 scripts/verify_all_29_tools.py

# 3. Security, Privacy & Air-Gap Verification
python3 scripts/verify_security_and_privacy.py

# 4. Performance & Scalability Benchmarking
python3 scripts/benchmark_performance.py

# 5. Playwright Screenshot Capture (12 High-DPI Desktop Views)
python3 scripts/capture_phase6_screenshots.py
```

---

## Documentation Suite

Detailed architectural and audit reports are maintained in [`docs/`](file:///Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/docs):
- [`PHASE_6_FINAL_ACCEPTANCE_REPORT.md`](file:///Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/docs/PHASE_6_FINAL_ACCEPTANCE_REPORT.md): Comprehensive 10-Gate Final Acceptance Report.
- [`PHASE_6_TOOL_ACCEPTANCE_MATRIX.md`](file:///Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/docs/PHASE_6_TOOL_ACCEPTANCE_MATRIX.md): Detailed 29-tool verification matrix with input/output payloads.
- [`PERFORMANCE_REPORT.md`](file:///Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/docs/PERFORMANCE_REPORT.md): 1p to 100p latency, throughput, and memory footprint benchmarks.
- [`DEPENDENCY_AND_LICENSE_AUDIT.md`](file:///Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/docs/DEPENDENCY_AND_LICENSE_AUDIT.md): Dependency license compliance and air-gap verification.
- [`RELEASE_NOTES.md`](file:///Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/RELEASE_NOTES.md): Official v1.0.0 Release Notes.
- [`INSTALLATION.md`](file:///Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/INSTALLATION.md): Platform installation guide for macOS, Linux, and Windows.
- [`RELEASE_CHECKLIST.md`](file:///Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/RELEASE_CHECKLIST.md): Pre-flight release verification checklist.

---

## Production Release Artifacts

The standalone production release archive is packaged in [`release/`](file:///Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/release):
- `pdf-studio-v1.0.0.zip`: Full standalone distribution archive (26 MB).
- `SHA256SUMS.txt`: Cryptographic SHA-256 manifest verifying package integrity.
- `pdf-studio-v1.0.0/`: Exploded production tree ready for deployment.
