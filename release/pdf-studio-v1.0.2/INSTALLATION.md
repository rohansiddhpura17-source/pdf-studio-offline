# PDF Studio — Installation & Quickstart Guide
**Product Identity:** *Your documents. Your control. Always offline.*  
**Version:** 1.0.0 (Production Release)

This guide covers installing and launching PDF Studio on **macOS**, **Linux**, and **Windows**.

---

## 1. Prerequisites

PDF Studio requires:
- **Python 3.10+** (Python 3.11, 3.12, or 3.13 tested and verified)
- **Poppler Utilities (`pdftoppm`)** for fast PDF page rasterization
- **Node.js 18+ and npm** (Optional: only needed if building or developing the frontend)

### Installing Prerequisites by Platform

#### macOS (via Homebrew)
```bash
brew install python poppler
# Optional (for frontend development)
brew install node
```

#### Ubuntu / Debian Linux
```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv poppler-utils
# Optional (for frontend development)
sudo apt install -y nodejs npm
```

#### Windows (WSL2 recommended)
```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv poppler-utils
```
*Note for Native Windows PowerShell:* Install Python from python.org and Poppler for Windows, adding `pdftoppm` to your PATH.

---

## 2. Quickstart Launch (One-Command)

If you are using the repository or release archive, simply run:

```bash
# 1. Start PDF Studio (launches backend and serves application)
bash scripts/start_pdf_studio.sh
```

The script will automatically detect Python, verify service health, and display:
```text
=================================================================
 [OK] PDF Studio is READY and OPERATIONAL!
=================================================================
 Standalone Production App:  http://127.0.0.1:8001/
 Interactive Dev Interface:  http://127.0.0.1:5173/
 Local API Documentation:   http://127.0.0.1:8001/docs
 Security Guarantee:        100% Offline · Localhost Loopback Only
 Stop Application:          bash scripts/stop_pdf_studio.sh
=================================================================
```

Open your browser to:
**`http://127.0.0.1:8001/`** (Standalone Production) or **`http://127.0.0.1:5173/`** (Development).

---

## 3. Stopping the Application

To cleanly terminate all running background processes and release port bindings:

```bash
bash scripts/stop_pdf_studio.sh
```

---

## 4. Manual Setup & Development Workflow

If you prefer to configure virtual environments and services manually:

### Step A: Configure Backend
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt

# Start backend server
PYTHONPATH=. uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

### Step B: Configure Frontend (Optional)
```bash
cd frontend

# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```

### Step C: Build Production Frontend
```bash
cd frontend
npm run build
```
Once built into `frontend/dist`, the FastAPI backend automatically serves the frontend at `http://127.0.0.1:8001/`.

---

## 5. Running Automated Verification Suites

To verify your installation against the 100% acceptance criteria:

```bash
# 1. Run all 51 backend unit and integration tests
cd backend
PYTHONPATH=. ./venv/bin/python3 -m pytest tests/

# 2. Run master 29-tool verification script (generates physical artifacts)
python3 scripts/verify_all_29_tools.py

# 3. Run security, privacy, and air-gap verification
python3 scripts/verify_security_and_privacy.py

# 4. Run performance benchmark suite (1p, 10p, 50p, 100p)
python3 scripts/benchmark_performance.py
```

---

## 6. Offline Verification (Air-Gap Test)

To prove PDF Studio runs without internet connectivity:
1. Disconnect your computer from Wi-Fi and Ethernet.
2. Launch `bash scripts/start_pdf_studio.sh`.
3. Open `http://127.0.0.1:8001/` in your browser.
4. Upload, edit, redact, stamp, convert, compress, and export PDFs.
All operations complete with zero network requests outside `127.0.0.1`.
