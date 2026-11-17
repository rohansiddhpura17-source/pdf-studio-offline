#!/usr/bin/env python3
"""
verify_release_package.py
Independently verifies the release artifact pdf-studio-v1.0.0.zip:
1. Checksum verification against SHA256SUMS.txt
2. Clean extraction in isolated directory /tmp/pdf_studio_clean_test
3. Cleanliness audit: zero forbidden artifacts (.git, node_modules, venv, __pycache__, .DS_Store, AppleDouble ._*)
4. File tree verification
5. Cleanup
"""

import os
import sys
import shutil
import zipfile
import hashlib
from pathlib import Path

RELEASE_ZIP = Path("/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/release/pdf-studio-v1.0.0.zip")
SUMS_FILE = Path("/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/release/SHA256SUMS.txt")
EXTRACT_DIR = Path("/tmp/pdf_studio_clean_test")
LOG_FILE = Path("/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/evidence/logs/release_package_verification.log")

def sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()

def verify_release():
    log_lines = []
    log_lines.append("=" * 80)
    log_lines.append("  PDF STUDIO v1.0.0 — RELEASE PACKAGE INDEPENDENT VERIFICATION")
    log_lines.append("=" * 80)
    log_lines.append("")

    # 1. SHA256 Checksum verification
    log_lines.append("[CHECK 1: SHA-256 Checksum Verification]")
    actual_hash = sha256_of_file(RELEASE_ZIP)
    log_lines.append(f"Target Zip: {RELEASE_ZIP}")
    log_lines.append(f"Actual SHA-256:   {actual_hash}")
    
    # Read expected hash from SHA256SUMS.txt
    expected_hash = None
    for line in SUMS_FILE.read_text().splitlines():
        if "pdf-studio-v1.0.0.zip" in line:
            expected_hash = line.split()[0].strip()
            break
    log_lines.append(f"Expected SHA-256: {expected_hash}")
    if actual_hash == expected_hash:
        log_lines.append("  [PASS] SHA-256 checksum perfectly matches SHA256SUMS.txt.")
    else:
        log_lines.append("  [FAIL] SHA-256 checksum MISMATCH!")
    log_lines.append("")

    # 2. Extraction in clean isolated directory
    log_lines.append("[CHECK 2: Extraction in Clean Isolated Environment]")
    if EXTRACT_DIR.exists():
        shutil.rmtree(EXTRACT_DIR)
    EXTRACT_DIR.mkdir(parents=True)
    
    log_lines.append(f"Extracting to isolated path: {EXTRACT_DIR}")
    with zipfile.ZipFile(RELEASE_ZIP, 'r') as zf:
        zf.extractall(EXTRACT_DIR)
    log_lines.append(f"  [PASS] Successfully extracted {len(zf.namelist())} files.")
    log_lines.append("")

    # 3. Cleanliness Audit (Forbidden Files)
    log_lines.append("[CHECK 3: Cleanliness & Hygiene Audit]")
    forbidden_rules = [
        (".git", lambda p: ".git" in p.parts),
        ("node_modules", lambda p: "node_modules" in p.parts),
        ("venv", lambda p: "venv" in p.parts or ".venv" in p.parts),
        ("__pycache__", lambda p: "__pycache__" in p.parts or p.name.endswith(".pyc")),
        (".DS_Store", lambda p: p.name == ".DS_Store"),
        ("AppleDouble (._*)", lambda p: p.name.startswith("._"))
    ]
    
    violations = {rule[0]: [] for rule in forbidden_rules}
    total_files = 0
    for root, dirs, files in os.walk(EXTRACT_DIR):
        for name in files + dirs:
            p = Path(root) / name
            total_files += 1
            for rule_name, rule_fn in forbidden_rules:
                if rule_fn(p):
                    violations[rule_name].append(str(p.relative_to(EXTRACT_DIR)))

    has_violations = False
    for rule_name, issues in violations.items():
        if issues:
            has_violations = True
            log_lines.append(f"  [FAIL] Found {len(issues)} violations of {rule_name}: {issues[:5]}")
        else:
            log_lines.append(f"  [PASS] 0 {rule_name} artifacts present.")

    if not has_violations:
        log_lines.append("  [PASS] Release package is 100% clean of all developmental & OS junk.")
    log_lines.append("")

    # 4. Critical Files Verification
    log_lines.append("[CHECK 4: Critical Component Verification]")
    required_paths = [
        "pdf-studio-v1.0.0/README.md",
        "pdf-studio-v1.0.0/INSTALLATION.md",
        "pdf-studio-v1.0.0/CHANGELOG.md",
        "pdf-studio-v1.0.0/LICENSE",
        "pdf-studio-v1.0.0/backend/main.py",
        "pdf-studio-v1.0.0/backend/requirements.txt",
        "pdf-studio-v1.0.0/frontend/dist/index.html",
        "pdf-studio-v1.0.0/scripts/start_pdf_studio.sh",
        "pdf-studio-v1.0.0/scripts/stop_pdf_studio.sh",
    ]
    all_required_present = True
    for req in required_paths:
        target = EXTRACT_DIR / req
        if target.exists():
            log_lines.append(f"  [PASS] Found critical component: {req}")
        else:
            all_required_present = False
            log_lines.append(f"  [FAIL] Missing critical component: {req}")
    log_lines.append("")

    # 5. Cleanup
    log_lines.append("[CHECK 5: Clean Teardown]")
    shutil.rmtree(EXTRACT_DIR)
    log_lines.append(f"  [PASS] Cleaned up temporary test directory: {EXTRACT_DIR}")
    log_lines.append("")

    log_lines.append("=" * 80)
    verdict = "PASS — PRODUCTION READY" if (actual_hash == expected_hash and not has_violations and all_required_present) else "FAIL"
    log_lines.append(f"  RELEASE PACKAGE AUDIT VERDICT: {verdict}")
    log_lines.append("=" * 80)

    report_text = "\n".join(log_lines)
    print(report_text)
    LOG_FILE.write_text(report_text)
    print(f"\n[OK] Release verification log written to: {LOG_FILE}")

if __name__ == "__main__":
    verify_release()
