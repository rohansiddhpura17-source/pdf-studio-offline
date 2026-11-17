# Third-Party Open Source License Notices

PDF Studio incorporates open-source libraries and components subject to their respective licenses. All dependencies utilize permissive, production-grade open source licenses (MIT, BSD-3-Clause, Apache-2.0, ISC, or Python Software Foundation License).

---

## 1. Backend Dependencies (Python)

| Package | Version | License | Primary Purpose |
| :--- | :--- | :--- | :--- |
| **FastAPI** | 0.115.8 | MIT | High-performance asynchronous REST API framework |
| **Uvicorn** | 0.34.0 | BSD-3-Clause | ASGI web server implementation |
| **pypdf** | 5.3.0 / 6.19.0 | BSD-3-Clause | Native PDF manipulation, merging, splitting, redaction |
| **Pillow (PIL)** | 11.1.0 / 12.0.0 | HPND / MIT-equivalent | High-performance image conversion and rasterization |
| **Pydantic** | 2.10.6 | MIT | Data parsing, validation, and serialization |
| **PyPDF2** | 3.0.1 | BSD-3-Clause | Supplementary PDF utility library |
| **python-multipart** | 0.0.20 | Apache-2.0 | Streaming multipart form file uploads |
| **pytest** | 8.4.2 | MIT | Automated testing framework |
| **httpx** | 0.28.1 | BSD-3-Clause | Fast HTTP client for API test assertions |
| **poppler-utils (system)** | 26.09.0 | GPL-2.0 / LGPL (CLI) | External subprocess CLI utility (`pdftoppm`) |

---

## 2. Frontend Dependencies (TypeScript / React)

| Package | Version | License | Primary Purpose |
| :--- | :--- | :--- | :--- |
| **React** | 19.0.0 | MIT | Declarative UI component library |
| **React DOM** | 19.0.0 | MIT | React DOM renderer |
| **pdfjs-dist** | 4.10.38 | Apache-2.0 | Canvas-based PDF client-side rendering |
| **Zustand** | 5.0.3 | MIT | Fast, unopinionated client state management |
| **Lucide React** | 0.475.0 | ISC | Vector iconography system |
| **Framer Motion** | 12.4.3 | MIT | Hardware-accelerated transitions and animations |
| **Tailwind CSS** | 3.4.17 | MIT | Utility-first CSS framework |
| **Vite** | 6.4.5 | MIT | Fast frontend build tool and dev server |
| **TypeScript** | 5.7.3 | Apache-2.0 | Static type system |

---

## 3. Compliance Summary

- No copyleft viral licenses (e.g., GPL, AGPL) are embedded in runtime application code or distributable client bundles.
- `pdftoppm` is invoked strictly via isolated external OS command-line subprocesses, maintaining modular separation.
- All bundled client assets in `frontend/dist` are 100% compliant with permissive redistribution rights.
