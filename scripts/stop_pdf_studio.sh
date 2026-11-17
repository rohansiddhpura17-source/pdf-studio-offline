#!/usr/bin/env bash
# ==============================================================================
# PDF Studio — Stop Production Application
# Tagline: Your documents. Your control. Always offline.
# ==============================================================================
set -euo pipefail

# Determine repository root directory dynamically
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
RUN_DIR="${PROJECT_DIR}/.run"

BACKEND_PID_FILE="${RUN_DIR}/backend.pid"
FRONTEND_PID_FILE="${RUN_DIR}/frontend.pid"

echo "================================================================="
echo " Stopping PDF Studio..."
echo "================================================================="

# Helper function to gracefully kill a process
stop_pid() {
    local NAME="$1"
    local PID_FILE="$2"

    if [[ -f "${PID_FILE}" ]]; then
        local PID
        PID=$(cat "${PID_FILE}" 2>/dev/null || true)
        if [[ -n "${PID}" ]] && kill -0 "${PID}" 2>/dev/null; then
            echo "[*] Terminating ${NAME} (PID: ${PID})..."
            kill "${PID}" 2>/dev/null || true
            
            # Wait up to 5 seconds for termination
            for i in {1..10}; do
                if ! kill -0 "${PID}" 2>/dev/null; then
                    break
                fi
                sleep 0.5
            done

            # Force kill if still alive
            if kill -0 "${PID}" 2>/dev/null; then
                echo "[!] Forcefully terminating ${NAME} (PID: ${PID})..."
                kill -9 "${PID}" 2>/dev/null || true
            fi
            echo "[+] ${NAME} stopped."
        else
            echo "[*] ${NAME} was not running."
        fi
        rm -f "${PID_FILE}"
    fi
}

stop_pid "Frontend Server" "${FRONTEND_PID_FILE}"
stop_pid "Backend Service" "${BACKEND_PID_FILE}"

# Secondary check: kill any rogue processes bound specifically to 8001 or 5173
if command -v lsof >/dev/null 2>&1; then
    PORT_8001_PIDS=$(lsof -ti :8001 2>/dev/null || true)
    if [[ -n "${PORT_8001_PIDS}" ]]; then
        echo "[*] Releasing port 8001 listener(s): ${PORT_8001_PIDS}"
        echo "${PORT_8001_PIDS}" | xargs kill -9 2>/dev/null || true
    fi

    PORT_5173_PIDS=$(lsof -ti :5173 2>/dev/null || true)
    if [[ -n "${PORT_5173_PIDS}" ]]; then
        echo "[*] Releasing port 5173 listener(s): ${PORT_5173_PIDS}"
        echo "${PORT_5173_PIDS}" | xargs kill -9 2>/dev/null || true
    fi
fi

echo "================================================================="
echo " [OK] PDF Studio has been cleanly stopped."
echo "================================================================="
