"""
Builds and packages PDF Studio v1.0.2 Release.
Generates:
  release/pdf-studio-v1.0.2/
  release/pdf-studio-v1.0.2.zip
  release/SHA256SUMS_v1.0.2.txt
"""

import os
import shutil
import zipfile
import hashlib
from pathlib import Path

ROOT_DIR = Path("/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio")
RELEASE_DIR = ROOT_DIR / "release"
PKG_DIR = RELEASE_DIR / "pdf-studio-v1.0.2"
ZIP_PATH = RELEASE_DIR / "pdf-studio-v1.0.2.zip"
SUMS_FILE = RELEASE_DIR / "SHA256SUMS_v1.0.2.txt"

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
    print(" PACKAGING PDF STUDIO v1.0.2 RELEASE")
    print("==================================================================")
    
    if PKG_DIR.exists():
        shutil.rmtree(PKG_DIR)
    PKG_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Copy backend
    clean_copy(ROOT_DIR / "backend", PKG_DIR / "backend")
    (PKG_DIR / "backend" / "temp_storage").mkdir(exist_ok=True)

    # 2. Copy frontend production dist and essentials (exclude node_modules)
    (PKG_DIR / "frontend").mkdir(exist_ok=True)
    clean_copy(ROOT_DIR / "frontend" / "dist", PKG_DIR / "frontend" / "dist")
    clean_copy(ROOT_DIR / "frontend" / "package.json", PKG_DIR / "frontend" / "package.json")

    # 3. Copy launcher scripts
    clean_copy(ROOT_DIR / "scripts", PKG_DIR / "scripts")

    # 4. Copy documentation
    clean_copy(ROOT_DIR / "docs", PKG_DIR / "docs")

    # 5. Copy top-level metadata
    for doc in ["README.md", "CHANGELOG.md", "RELEASE_NOTES.md", "INSTALLATION.md", "LICENSE"]:
        src = ROOT_DIR / doc
        if src.exists():
            clean_copy(src, PKG_DIR / doc)

    # Ensure launcher scripts have executable bits
    for sh in PKG_DIR.glob("**/*.sh"):
        sh.chmod(0o755)

    print(f"[+] Release tree assembled at: {PKG_DIR}")

    # Build ZIP archive
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()

    print("[*] Creating compressed archive...")
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(PKG_DIR):
            for file in files:
                if file.startswith("._") or file == ".DS_Store":
                    continue
                file_path = Path(root) / file
                archive_name = file_path.relative_to(RELEASE_DIR)
                zipf.write(file_path, archive_name)

    zip_size = ZIP_PATH.stat().st_size
    print(f"[+] ZIP created: {ZIP_PATH} ({zip_size:,} bytes)")

    # Compute Checksum
    chk = sha256_of_file(ZIP_PATH)
    with open(SUMS_FILE, "w") as f:
        f.write(f"{chk}  {ZIP_PATH.name}\n")

    print(f"[+] Checksum generated: {chk}")
    print("==================================================================")
    print(" [OK] v1.0.2 RELEASE PACKAGED SUCCESSFULLY")
    print("==================================================================")

if __name__ == "__main__":
    build_package()
