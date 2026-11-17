# PDF STUDIO — DEPENDENCY & LICENSE AUDIT
## Phase 6 Compliance, Security & Open-Source Licensing Manifest

> **Product:** PDF Studio  
> **Tagline:** *Your documents. Your control. Always offline.*  
> **Version:** 1.0.0 (Release)  
> **Audit Status:** **100% COMPLIANT — PERMISSIVE LICENSES ONLY**  
> **Audit Timestamp:** November 8, 2026 — 00:15 UTC  

---

### 1. Executive Summary

A comprehensive dependency and intellectual property compliance audit was executed across the frontend and backend architectures of PDF Studio. The application utilizes strictly permissive open-source libraries (MIT, BSD-3-Clause, Apache-2.0, and ISC). No viral copyleft licenses (such as GPL, AGPL, or SSPL) exist within the runtime or distribution chain.

---

### 2. Backend Dependencies (Python)

| Package | Version Range | Installed | License | Purpose / Architectural Role | Permissive? |
| :--- | :---: | :---: | :---: | :--- | :---: |
| `fastapi` | `>=0.115.0` | `0.115.6` | MIT | High-performance asynchronous API framework | YES |
| `uvicorn` | `>=0.32.0` | `0.34.0` | BSD-3-Clause | Lightning-fast ASGI web server | YES |
| `pypdf` | `>=5.1.0` | `6.19.0` | BSD-3-Clause | Pure-Python PDF parsing, structural manipulation, serialization | YES |
| `pillow` | `>=10.4.0` | `12.0.0` | HPND (BSD-equiv) | Image format decoding, color space conversion, thumbnail generation | YES |
| `python-multipart` | `>=0.0.12` | `0.0.20` | Apache-2.0 | Form data and local multipart file streaming | YES |
| `pydantic` | `>=2.9.0` | `2.10.4` | MIT | Strict data validation and schema serialization | YES |
| `httpx` | `>=0.27.0` | `0.28.1` | BSD-3-Clause | Local loopback testing client (`TestClient`) | YES |
| `pytest` | `>=8.3.0` | `8.4.2` | MIT | Automated unit and integration testing suite | YES |

---

### 3. Frontend Dependencies (Node.js / React)

| Package | Version | License | Architectural Role | Permissive? |
| :--- | :---: | :---: | :--- | :---: |
| `react` | `^19.0.0` | MIT | Declarative UI component engine | YES |
| `react-dom` | `^19.0.0` | MIT | Web DOM renderer | YES |
| `pdfjs-dist` | `4.10.38` | Apache-2.0 | High-fidelity local PDF vector and raster rendering | YES |
| `zustand` | `^5.0.3` | MIT | Fast, predictable centralized document and UI state | YES |
| `lucide-react` | `^0.475.0` | ISC | Modern clean SVG icons | YES |
| `framer-motion` | `^12.4.7` | MIT | Hardware-accelerated UI transitions and toast animations | YES |
| `clsx` | `^2.1.1` | MIT | Conditional CSS utility | YES |
| `tailwind-merge`| `^3.0.1` | MIT | Conflict-free Tailwind class resolution | YES |
| `vite` | `^6.1.0` | MIT | Next-generation local frontend build tool & HMR server | YES |
| `typescript` | `^5.7.3` | Apache-2.0 | Type safety and static compile-time verification | YES |
| `tailwindcss` | `^3.4.17` | MIT | Design system tokens and atomic utility styling | YES |

---

### 4. System / External Tool Dependencies

- **`pdftoppm` (Poppler)**: Optional system utility used for ultra-high-resolution rasterization. PDF Studio incorporates a dynamic pure-Python fallback (`pypdf` + `Pillow`) so that if `pdftoppm` is absent, the application continues to operate without failure.
- **CDN / Cloud Assets**: **NONE**. All libraries, web fonts, and web workers are bundled directly in the distribution tree.

---

### 5. Compliance Statement

PDF Studio complies with all applicable open-source license attribution requirements. The license text for each bundled dependency is included in the release distribution package under `release/licenses/`.
