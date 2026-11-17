import os
import shutil
import uuid
from pathlib import Path
from typing import Optional, Tuple

STORAGE_DIR = Path(__file__).resolve().parent.parent / "temp_storage"

def init_storage():
    """Ensure the local temporary sandbox storage directory exists."""
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)

def sanitize_filename(filename: str) -> str:
    """Strip dangerous characters and path traversal segments."""
    clean = os.path.basename(filename)
    return clean.replace("..", "_").replace("/", "_").replace("\\", "_")

def save_uploaded_file(source_bytes: bytes, original_filename: str) -> Tuple[str, Path]:
    """
    Saves incoming bytes into an isolated session directory under a secure UUID.
    Returns (file_id, file_path).
    """
    init_storage()
    file_id = uuid.uuid4().hex
    safe_name = sanitize_filename(original_filename) or "document.pdf"
    valid_exts = (".pdf", ".zip", ".txt", ".png", ".jpg", ".jpeg")
    if not any(safe_name.lower().endswith(ext) for ext in valid_exts):
        safe_name += ".pdf"
    
    session_dir = STORAGE_DIR / file_id
    session_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = session_dir / safe_name
    with open(file_path, "wb") as f:
        f.write(source_bytes)
    
    # Also record the original name
    with open(session_dir / "meta.txt", "w", encoding="utf-8") as meta_f:
        meta_f.write(safe_name)
        
    return file_id, file_path

def get_file_path(file_id: str) -> Optional[Path]:
    """Resolves a file_id to its local path, validating against path traversal."""
    if not file_id or not file_id.isalnum() or len(file_id) != 32:
        return None
    session_dir = STORAGE_DIR / file_id
    if not session_dir.exists():
        return None
    
    meta_file = session_dir / "meta.txt"
    if meta_file.exists():
        filename = meta_file.read_text(encoding="utf-8").strip()
        target = session_dir / filename
        if target.exists():
            return target
            
    # Fallback: find any .pdf file in session directory
    for f in session_dir.iterdir():
        if f.suffix.lower() == ".pdf":
            return f
    return None

def store_new_version(file_id: str, new_bytes: bytes, suffix_label: str = "edited") -> Path:
    """
    Stores a new non-destructive version of a document.
    """
    path = get_file_path(file_id)
    if not path:
        raise FileNotFoundError(f"File session {file_id} not found")
        
    session_dir = path.parent
    base_name = path.stem
    new_filename = f"{base_name}_{suffix_label}.pdf"
    new_path = session_dir / new_filename
    
    with open(new_path, "wb") as f:
        f.write(new_bytes)
        
    # Update active document pointer in session
    with open(session_dir / "meta.txt", "w", encoding="utf-8") as meta_f:
        meta_f.write(new_filename)
        
    return new_path

def purge_all_temp_storage() -> int:
    """Removes all stored session files and returns the count of purged directories."""
    count = 0
    if STORAGE_DIR.exists():
        for item in STORAGE_DIR.iterdir():
            if item.is_dir():
                shutil.rmtree(item, ignore_errors=True)
                count += 1
            elif item.is_file():
                item.unlink(missing_ok=True)
                count += 1
    return count
