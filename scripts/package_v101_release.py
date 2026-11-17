"""
Builds and packages PDF Studio v1.0.1 Release.
Generates:
  release/pdf-studio-v1.0.1/
  release/pdf-studio-v1.0.1.zip
  release/SHA256SUMS_v1.0.1.txt
"""

import os
import shutil
import zipfile
import hashlib
from pathlib import Path

ROOT_DIR = Path("/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio")
RELEASE_DIR = ROOT_DIR / "release"
PKG_DIR = RELEASE_DIR / "pdf-studio-v1.0.1"
ZIP_PATH = RELEASE_DIR / "pdf-studio-v1.0.1.zip"
SUMS_FILE = RELEASE_DIR / "SHA256SUMS_v1.0.1.txt"

def sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def clean_copy(src: Path, dst: Path, ignore_patterns=None):
    if ignore_patterns is None:
        ignore_patterns = shutil.ignore_patterns(
            "__pycache__", "*.pyc", "*.pyo", ".pytest_cache", ".DS_Store", "._*",
            "node_modules", "venv", ".env*", ".git*", "temp_storage"
        )
    if src.is_dir():
        shutil.copytree(src, dst, ignore=ignore_patterns, dirs_exist_ok=True)
    else:
        shutil.copy2(src, dst)

def build_package():
    print("==================================================================")
    print(" PACKAGING PDF STUDIO v1.0.1 RELEASE")
    print("==================================================================")
    
    if PKG_DIR.exists():
        shutil.rmtree(PKG_DIR)
    PKG_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Copy backend
    clean_copy(ROOT_DIR / "backend", PKG_DIR / "backend")
    # Ensure temp_storage directory exists but is empty
    (PKG_DIR / "backend" / "temp_storage").mkdir(parents=True, exist_ok=True)

    # 2. Copy pre-built frontend distribution
    clean_copy(ROOT_DIR / "frontend" / "dist", PKG_DIR / "frontend" / "dist")

    # 3. Copy scripts
    clean_copy(ROOT_DIR / "scripts", PKG_DIR / "scripts")

    # 4. Copy documentation & root files
    clean_copy(ROOT_DIR / "docs", PKG_DIR / "docs")
    for f in ["README.md", "LICENSE", "CHANGELOG.md", "INSTALLATION.md", "RELEASE_NOTES.md"]:
        src_f = ROOT_DIR / f
        if src_f.exists():
            clean_copy(src_f, PKG_DIR / f)

    # Clean any accidental ._* files on macOS
    for root, dirs, files in os.walk(PKG_DIR):
        for f in files:
            if f.startswith("._") or f == ".DS_Store" or f.endswith(".pyc"):
                try:
                    os.remove(os.path.join(root, f))
                except Exception:
                    pass

    # 5. Create ZIP Archive
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()

    print(f"[*] Compressing {PKG_DIR} into {ZIP_PATH}...")
    with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(PKG_DIR):
            for file in files:
                file_path = Path(root) / file
                archive_name = file_path.relative_to(PKG_DIR.parent)
                zf.write(file_path, archive_name)

    # 6. Calculate Checksum
    chk = sha256_of_file(ZIP_PATH)
    sums_content = f"{chk}  pdf-studio-v1.0.1.zip\n"
    SUMS_FILE.write_text(sums_content)

    print(f"[+] Package created: {ZIP_PATH} ({ZIP_PATH.stat().st_size:,} bytes)")
    print(f"[+] SHA-256 Checksum: {chk}")
    print(f"[+] Written to {SUMS_FILE}")
    print("==================================================================")

if __name__ == "__main__":
    build_package()
