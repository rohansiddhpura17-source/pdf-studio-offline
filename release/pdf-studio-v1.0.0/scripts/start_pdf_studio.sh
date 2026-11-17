#!/usr/bin/env bash
# ==============================================================================
# PDF Studio — Start Production Application
# Tagline: Your documents. Your control. Always offline.
# ==============================================================================
set -euo pipefail

# Determine repository root directory dynamically
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${PROJECT_DIR}/backend"
FRONTEND_DIR="${PROJECT_DIR}/frontend"
RUN_DIR="${PROJECT_DIR}/.run"

mkdir -p "${RUN_DIR}"

BACKEND_PORT=8001
FRONTEND_PORT=5173
BACKEND_PID_FILE="${RUN_DIR}/backend.pid"
FRONTEND_PID_FILE="${RUN_DIR}/frontend.pid"

echo "================================================================="
echo " Starting PDF Studio v1.0.0..."
echo " Root directory: ${PROJECT_DIR}"
echo "================================================================="

# 1. Locate Python 3
if [[ -f "${BACKEND_DIR}/venv/bin/python3" ]]; then
    PYTHON_BIN="${BACKEND_DIR}/venv/bin/python3"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python3)"
else
    echo "[-] Error: Python 3 could not be found. Please install Python 3.10+." >&2
    exit 1
fi
echo "[+] Using Python: ${PYTHON_BIN}"

# 2. Check if backend is already running
BACKEND_RUNNING=0
if [[ -f "${BACKEND_PID_FILE}" ]]; then
    OLD_PID=$(cat "${BACKEND_PID_FILE}" 2>/dev/null || true)
    if [[ -n "${OLD_PID}" ]] && kill -0 "${OLD_PID}" 2>/dev/null; then
        echo "[*] Backend is already running (PID: ${OLD_PID}) on port ${BACKEND_PORT}."
        BACKEND_RUNNING=1
    fi
fi

if [[ ${BACKEND_RUNNING} -eq 0 ]]; then
    echo "[*] Starting PDF Studio Backend on 127.0.0.1:${BACKEND_PORT}..."
    cd "${BACKEND_DIR}"
    nohup env PYTHONPATH=. "${PYTHON_BIN}" -m uvicorn main:app \
        --host 127.0.0.1 \
        --port "${BACKEND_PORT}" \
        --log-level warning \
        > "${RUN_DIR}/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo "${BACKEND_PID}" > "${BACKEND_PID_FILE}"
    echo "[+] Backend started (PID: ${BACKEND_PID})."
fi

# 3. Handle Frontend UI
FRONTEND_RUNNING=0
if [[ -f "${FRONTEND_PID_FILE}" ]]; then
    OLD_PID=$(cat "${FRONTEND_PID_FILE}" 2>/dev/null || true)
    if [[ -n "${OLD_PID}" ]] && kill -0 "${OLD_PID}" 2>/dev/null; then
        echo "[*] Frontend is already running (PID: ${OLD_PID}) on port ${FRONTEND_PORT}."
        FRONTEND_RUNNING=1
    fi
fi

# If frontend dist exists, backend serves it directly at http://127.0.0.1:8001/
HAS_DIST=0
if [[ -f "${FRONTEND_DIR}/dist/index.html" ]]; then
    HAS_DIST=1
    echo "[+] Production frontend build detected at frontend/dist/."
fi

# If node_modules exists, we can also launch the Vite dev server for live development
if [[ ${FRONTEND_RUNNING} -eq 0 ]] && [[ -d "${FRONTEND_DIR}/node_modules" ]] && command -v npm >/dev/null 2>&1; then
    echo "[*] Starting Frontend development server on 127.0.0.1:${FRONTEND_PORT}..."
    cd "${FRONTEND_DIR}"
    nohup npm run dev -- --host 127.0.0.1 --port "${FRONTEND_PORT}" > "${RUN_DIR}/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo "${FRONTEND_PID}" > "${FRONTEND_PID_FILE}"
    echo "[+] Frontend server started (PID: ${FRONTEND_PID})."
fi

# 4. Wait for backend to be healthy
echo "[*] Verifying service health..."
MAX_RETRIES=15
COUNTER=0
HEALTHY=0
while [[ ${COUNTER} -lt ${MAX_RETRIES} ]]; do
    if curl -s "http://127.0.0.1:${BACKEND_PORT}/api/document/system/health" | grep -q '"status":"healthy"'; then
        HEALTHY=1
        break
    fi
    sleep 0.5
    COUNTER=$((COUNTER + 1))
done

if [[ ${HEALTHY} -eq 1 ]]; then
    echo "================================================================="
    echo " [OK] PDF Studio is READY and OPERATIONAL!"
    echo "================================================================="
    if [[ ${HAS_DIST} -eq 1 ]]; then
        echo " Standalone Production App:  http://127.0.0.1:${BACKEND_PORT}/"
    fi
    if [[ -f "${FRONTEND_PID_FILE}" ]]; then
        echo " Interactive Dev Interface:  http://127.0.0.1:${FRONTEND_PORT}/"
    fi
    echo " Local API Documentation:   http://127.0.0.1:${BACKEND_PORT}/docs"
    echo " Security Guarantee:        100% Offline · Localhost Loopback Only"
    echo " Stop Application:          bash scripts/stop_pdf_studio.sh"
    echo "================================================================="
else
    echo "[-] Warning: Backend did not respond with healthy status within 8 seconds."
    echo "[-] Check logs at: ${RUN_DIR}/backend.log"
    exit 1
fi
