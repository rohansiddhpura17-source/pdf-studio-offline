#!/usr/bin/env python3
"""
Playwright automated screenshot capture for PDF Studio Phase 6 Delivery.
Captures all 12 required high-resolution desktop screenshots (1440x900 @ 2x DPI) into screenshots/phase-6/.
"""

import asyncio
import os
import sys
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path("/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/screenshots/phase-6")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

async def capture_all():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2, # High-DPI crisp capture
        )
        page = await context.new_page()

        # 1. Document Home
        print("\n--- 1. Capturing 01_document_home.png ---")
        await page.goto("http://127.0.0.1:5173", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=str(OUTPUT_DIR / "01_document_home.png"))
        print("[OK] 01_document_home.png saved")

        # 2. Main PDF Editor
        print("\n--- 2. Capturing 02_main_pdf_editor.png ---")
        edit_card = page.locator("div:has-text('Edit & Redact')").last
        await edit_card.click()
        await page.wait_for_selector("canvas", timeout=15000)
        await page.wait_for_timeout(2000)
        await page.screenshot(path=str(OUTPUT_DIR / "02_main_pdf_editor.png"))
        print("[OK] 02_main_pdf_editor.png saved")

        # 3. Organise Workspace
        print("\n--- 3. Capturing 03_organise_workspace.png ---")
        organise_tab = page.locator("aside button:has-text('Organise')").first
        await organise_tab.click()
        await page.wait_for_selector("button:has-text('Back to Document')", timeout=15000)
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(OUTPUT_DIR / "03_organise_workspace.png"))
        print("[OK] 03_organise_workspace.png saved")

        # Return to Document / Edit module
        back_btn = page.locator("header button:has-text('Back to Document')")
        await back_btn.click()
        await page.wait_for_selector("canvas", timeout=15000)
        await page.wait_for_timeout(1000)

        # 4. Edit Workspace with active annotation tool
        print("\n--- 4. Capturing 04_edit_workspace.png ---")
        text_tool = page.locator("aside button:has-text('Text')").first
        try:
            await text_tool.click()
        except Exception:
            pass
        await page.wait_for_timeout(1000)
        await page.screenshot(path=str(OUTPUT_DIR / "04_edit_workspace.png"))
        print("[OK] 04_edit_workspace.png saved")

        # 5. Stamp Workspace
        print("\n--- 5. Capturing 05_stamp_workspace.png ---")
        stamp_tab = page.locator("aside button:has-text('Stamp')").first
        await stamp_tab.click()
        await page.wait_for_selector("button:has-text('Back to Editor')", timeout=15000)
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(OUTPUT_DIR / "05_stamp_workspace.png"))
        print("[OK] 05_stamp_workspace.png saved")

        # 6. Convert Workspace
        print("\n--- 6. Capturing 06_convert_workspace.png ---")
        convert_btn = page.locator("button:has-text('Images to PDF'), button:has-text('PDF to Images')").first
        try:
            await convert_btn.click()
        except Exception:
            pass
        await page.wait_for_timeout(1200)
        await page.screenshot(path=str(OUTPUT_DIR / "06_convert_workspace.png"))
        print("[OK] 06_convert_workspace.png saved")

        # Return to document
        back_btn = page.locator("header button:has-text('Back to Editor')").first
        await back_btn.click()
        await page.wait_for_selector("canvas", timeout=15000)
        await page.wait_for_timeout(1000)

        # 7. Finish Workspace
        print("\n--- 7. Capturing 07_finish_workspace.png ---")
        finish_tab = page.locator("aside button:has-text('Finish')").first
        await finish_tab.click()
        await page.wait_for_selector("button:has-text('Back to Editor')", timeout=15000)
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(OUTPUT_DIR / "07_finish_workspace.png"))
        print("[OK] 07_finish_workspace.png saved")

        # 8. Compression Results
        print("\n--- 8. Capturing 08_compression_result.png ---")
        compress_btn = page.locator("aside button:has-text('Compress PDF')")
        await compress_btn.click()
        await page.wait_for_selector("text=/Compression Completed/i", timeout=20000)
        await page.wait_for_timeout(1200)
        await page.screenshot(path=str(OUTPUT_DIR / "08_compression_result.png"))
        print("[OK] 08_compression_result.png saved")

        # 9. Metadata Cleanup Report
        print("\n--- 9. Capturing 09_metadata_cleanup_report.png ---")
        remove_meta_btn = page.locator("aside button:has-text('Remove Metadata')").first
        await remove_meta_btn.click()
        await page.wait_for_timeout(1000)
        action_btn = page.locator("button:has-text('Sanitize & Rebuild PDF')").first
        await action_btn.click()
        await page.wait_for_selector("button:has-text('Download Sanitized PDF')", timeout=15000)
        await page.wait_for_timeout(1200)
        await page.screenshot(path=str(OUTPUT_DIR / "09_metadata_cleanup_report.png"))
        print("[OK] 09_metadata_cleanup_report.png saved")

        # 10. PDF Comparison Result
        print("\n--- 10. Capturing 10_pdf_comparison_result.png ---")
        compare_btn = page.locator("aside button:has-text('Compare PDFs')").first
        await compare_btn.click()
        await page.wait_for_timeout(1000)
        sample_rev_btn = page.locator("button:has-text('Create Sample Revision & Compare'), button:has-text('Use Sample Revision')").first
        await sample_rev_btn.click()
        await page.wait_for_timeout(3000)
        await page.screenshot(path=str(OUTPUT_DIR / "10_pdf_comparison_result.png"))
        print("[OK] 10_pdf_comparison_result.png saved")

        # Return to Document
        back_btn = page.locator("header button:has-text('Back to Editor')").first
        await back_btn.click()
        await page.wait_for_selector("canvas", timeout=15000)
        await page.wait_for_timeout(1000)

        # 11. Final PDF Export
        print("\n--- 11. Capturing 11_final_pdf_export.png ---")
        save_btn = page.locator("header button:has-text('Save')").first
        await save_btn.click()
        await page.wait_for_timeout(800)
        await page.screenshot(path=str(OUTPUT_DIR / "11_final_pdf_export.png"))
        print("[OK] 11_final_pdf_export.png saved")

        # 12. Settings & Privacy Modal
        print("\n--- 12. Capturing 12_settings_and_privacy.png ---")
        settings_btn = page.locator("header button[title*='Settings'], button[title*='Settings']").first
        await settings_btn.click()
        await page.wait_for_selector("text=Privacy & Local Storage", timeout=10000)
        await page.wait_for_timeout(1000)
        await page.screenshot(path=str(OUTPUT_DIR / "12_settings_and_privacy.png"))
        print("[OK] 12_settings_and_privacy.png saved")

        await browser.close()
        print("\nAll 12 Phase 6 screenshots successfully captured in screenshots/phase-6/!")

if __name__ == "__main__":
    asyncio.run(capture_all())
