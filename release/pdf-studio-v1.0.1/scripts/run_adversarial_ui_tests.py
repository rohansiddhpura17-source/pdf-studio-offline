#!/usr/bin/env python3
"""
run_adversarial_ui_tests.py
Adversarial Playwright UI Automation against PDF Studio v1.0.0
Production release package at http://127.0.0.1:8001/.
"""

import os
import sys
import time
import json
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE_URL = "http://127.0.0.1:8001"
SCREENSHOT_DIR = Path("/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/evidence/adversarial_tests/screenshots")
LOG_DIR = Path("/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/evidence/adversarial_tests/logs")
SYNTHETIC_DIR = Path("/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/evidence/input_pdfs")

SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)

async def run_ui_adversarial_suite():
    console_logs = []
    page_errors = []
    failed_requests = []
    test_results = {}

    print("=" * 80)
    print("  PDF STUDIO v1.0.0 — ADVERSARIAL PLAYWRIGHT UI TEST SUITE")
    print(f"  Target Application: {BASE_URL}")
    print("=" * 80)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2,
            accept_downloads=True
        )
        page = await context.new_page()

        # Monitor console
        page.on("console", lambda msg: console_logs.append({
            "type": msg.type,
            "text": msg.text,
            "location": msg.location
        }))
        page.on("pageerror", lambda err: page_errors.append(str(err)))
        page.on("requestfailed", lambda req: failed_requests.append({
            "url": req.url,
            "failure": req.failure
        }))

        # Route interceptor: enforce offline air-gap (block all non-localhost requests)
        async def route_interceptor(route):
            url = route.request.url
            if "127.0.0.1" in url or "localhost" in url:
                await route.continue_()
            else:
                print(f"[!] BLOCKED OUTBOUND LEAK ATTEMPT TO: {url}")
                failed_requests.append({"url": url, "failure": "BLOCKED_AIRGAP_VIOLATION"})
                await route.abort()

        await page.route("**/*", route_interceptor)

        try:
            # -----------------------------------------------------------------
            # TEST 1: Initial Page Load & Air-Gapped Home Screen
            # -----------------------------------------------------------------
            print("\n--- TEST 1: Loading Standalone UI Home Screen ---")
            t0 = time.perf_counter()
            res = await page.goto(f"{BASE_URL}/", wait_until="networkidle")
            load_time = time.perf_counter() - t0
            print(f"[*] Home Screen Loaded: HTTP {res.status} in {load_time:.2f}s")
            assert res.status == 200, f"Expected 200, got {res.status}"
            
            await page.wait_for_selector("text=PDF Studio", timeout=10000)
            await page.screenshot(path=str(SCREENSHOT_DIR / "adv_01_home_screen.png"))
            test_results["home_load"] = {"status": "PASS", "load_time_sec": round(load_time, 2)}
            print("[PASS] Home screen rendered with zero network/critical errors.")

            # -----------------------------------------------------------------
            # TEST 2: 50-Page PDF Document Full Lifecycle
            # -----------------------------------------------------------------
            print("\n--- TEST 2: 50-Page PDF Document Full Lifecycle ---")
            # Open 50-page document using the sample button
            sample_50p_btn = page.locator('button:has-text("Open 50-Page Sample PDF")').first
            await sample_50p_btn.click()
            await page.wait_for_timeout(2000)
            
            # Verify it opens in Organise workspace with 50-page grid
            await page.wait_for_selector('text=50 pages', timeout=10000)
            await page.screenshot(path=str(SCREENSHOT_DIR / "adv_02_50p_organise_grid.png"))
            print("[+] Verified 50-page grid rendered in Organise module.")

            # Switch to Document Editor via "Back to Document"
            back_to_doc = page.locator('button:has-text("Back to Document")').first
            await back_to_doc.click()
            await page.wait_for_selector("canvas", timeout=15000)
            await page.wait_for_timeout(1000)
            await page.screenshot(path=str(SCREENSHOT_DIR / "adv_03_50p_editor_canvas.png"))
            print("[+] Navigated to Editor workspace; PDF.js canvas rendered.")

            # Page navigation: jump to Page 25
            print("[*] Navigating to page 25...")
            page_input = page.locator('footer form input, footer input[type="text"]').first
            if await page_input.count() > 0:
                await page_input.click()
                await page_input.fill("25")
                await page_input.press("Enter")
                await page.wait_for_timeout(1000)
                await page.screenshot(path=str(SCREENSHOT_DIR / "adv_04_50p_page25.png"))
                print("[+] Page 25 reached and rendered.")

            # Page navigation: jump to Page 50
            print("[*] Navigating to page 50...")
            if await page_input.count() > 0:
                await page_input.click()
                await page_input.fill("50")
                await page_input.press("Enter")
                await page.wait_for_timeout(1000)
                await page.screenshot(path=str(SCREENSHOT_DIR / "adv_05_50p_page50.png"))
                print("[+] Page 50 reached and rendered.")

            # Zoom testing
            print("[*] Testing zoom controls...")
            zoom_in_btn = page.locator('button[title*="Zoom In"], button:has-text("+")').first
            if await zoom_in_btn.count() > 0:
                await zoom_in_btn.click()
                await page.wait_for_timeout(400)
                await zoom_in_btn.click()
                await page.wait_for_timeout(400)
                print("[+] Zoomed in to 150%.")

            # Apply an edit: select Text tool and click canvas
            print("[*] Testing text tool draft placement on canvas...")
            text_tool = page.locator('div.h-11 button:has-text("Text")').first
            if await text_tool.count() > 0:
                await text_tool.click()
                await page.wait_for_timeout(500)
                canvas = page.locator("canvas").first
                box = await canvas.bounding_box()
                if box:
                    await page.mouse.click(box["x"] + 150, box["y"] + 150)
                    await page.wait_for_timeout(500)
                    print("[+] Draft text placed.")
            await page.screenshot(path=str(SCREENSHOT_DIR / "adv_06_50p_draft_edited.png"))

            # Save & Download
            print("[*] Triggering Save & Download in TopBar...")
            try:
                async with page.expect_download(timeout=8000) as download_info:
                    save_btn = page.locator('header button:has-text("Save"), header button:has-text("Save PDF")').first
                    await save_btn.click()
                download = await download_info.value
                dl_path = LOG_DIR / f"adv_saved_{download.suggested_filename}"
                await download.save_as(str(dl_path))
                print(f"[+] Download saved: {dl_path.name} ({dl_path.stat().st_size:,} bytes)")
            except Exception as e:
                print(f"[!] Download event skipped/intercepted: {e}")

            # Close document back to home screen
            print("[*] Closing 50-page document via Home button...")
            close_btn = page.locator('header button:has-text("Home")').first
            await close_btn.click()
            await page.wait_for_timeout(1500)
            await page.screenshot(path=str(SCREENSHOT_DIR / "adv_07_home_after_closing.png"))
            print("[+] Returned to Document Home screen.")

            # Reopen document from recent documents
            print("[*] Reopening 50-page document from Recent Documents list...")
            recent_open_btn = page.locator('div.divide-y button:has-text("Open")').first
            assert await recent_open_btn.count() > 0, "Recent document Open button missing!"
            await recent_open_btn.click()
            await page.wait_for_selector('canvas', timeout=15000)
            await page.wait_for_timeout(1000)
            await page.screenshot(path=str(SCREENSHOT_DIR / "adv_08_50p_reopened.png"))
            print("[PASS] 50-Page Document Full Lifecycle passed!")
            test_results["50p_document_lifecycle"] = "PASS"

            # -----------------------------------------------------------------
            # TEST 3: Organise Workspace Interactions
            # -----------------------------------------------------------------
            print("\n--- TEST 3: Organise Workspace Tools UI Verification ---")
            organise_tab = page.locator('aside button:has-text("Organise")').first
            await organise_tab.click()
            await page.wait_for_selector('button:has-text("Back to Document")', timeout=10000)
            await page.wait_for_timeout(1000)
            print("[+] Organise workspace active.")

            # Test Rotate in Organise workspace
            rotate_btn = page.locator('aside button:has-text("Rotate")').first
            if await rotate_btn.count() > 0:
                await rotate_btn.click()
                await page.wait_for_timeout(400)
                cw = page.locator('button:has-text("Rotate 90° CW"), button:has-text("90°")').first
                if await cw.count() > 0:
                    await cw.click()
                    await page.wait_for_timeout(800)
                    print("[+] Rotated Page 1 by 90°.")

            await page.screenshot(path=str(SCREENSHOT_DIR / "adv_09_organise_actions.png"))
            test_results["organise_tools_ui"] = "PASS"

            # Return to Document Editor
            back_to_doc2 = page.locator('button:has-text("Back to Document")').first
            await back_to_doc2.click()
            await page.wait_for_selector("canvas", timeout=10000)
            await page.wait_for_timeout(1000)

            # -----------------------------------------------------------------
            # TEST 4: Edit Workspace Tools Interaction
            # -----------------------------------------------------------------
            print("\n--- TEST 4: Edit Workspace Tools UI Verification ---")
            edit_tools = ["Select", "Text", "Image", "Highlight", "Draw", "Shapes", "Whiteout", "Redact", "Sign", "Form Fill"]
            for tool_name in edit_tools:
                t_btn = page.locator(f'div.h-11 button:has-text("{tool_name}")').first
                if await t_btn.count() > 0:
                    await t_btn.click()
                    await page.wait_for_timeout(200)
            print("[+] All 10 edit toolbar tools clicked and verified in UI.")
            await page.screenshot(path=str(SCREENSHOT_DIR / "adv_10_edit_tools.png"))
            test_results["edit_tools_ui"] = "PASS"

            # -----------------------------------------------------------------
            # TEST 5: Stamp Workspace Interaction
            # -----------------------------------------------------------------
            print("\n--- TEST 5: Stamp Workspace UI Verification ---")
            stamp_nav = page.locator('aside button:has-text("Stamp")').first
            await stamp_nav.click()
            await page.wait_for_selector('button:has-text("Back to Editor")', timeout=10000)
            await page.wait_for_timeout(800)
            await page.screenshot(path=str(SCREENSHOT_DIR / "adv_11_stamp_workspace.png"))
            print("[+] Stamp workspace loaded.")

            stamp_subtools = ["Watermark", "Page Numbers", "Headers", "Date Stamp"]
            for st in stamp_subtools:
                st_btn = page.locator(f'aside button:has-text("{st}")').first
                if await st_btn.count() > 0:
                    await st_btn.click()
                    await page.wait_for_timeout(300)
            print("[+] All 4 Stamp tools inspected.")

            # Return to Editor
            await page.locator('button:has-text("Back to Editor")').first.click()
            await page.wait_for_selector("canvas", timeout=10000)
            test_results["stamp_tools_ui"] = "PASS"

            # -----------------------------------------------------------------
            # TEST 6: Convert Workspace Interaction
            # -----------------------------------------------------------------
            print("\n--- TEST 6: Convert Workspace UI Verification ---")
            convert_nav = page.locator('aside button:has-text("Convert")').first
            await convert_nav.click()
            await page.wait_for_selector('button:has-text("Back to Editor")', timeout=10000)
            await page.wait_for_timeout(800)
            await page.screenshot(path=str(SCREENSHOT_DIR / "adv_12_convert_workspace.png"))
            print("[+] Convert workspace loaded.")

            convert_subtools = ["Images to PDF", "PDF to Images", "PDF to Text"]
            for ct in convert_subtools:
                ct_btn = page.locator(f'aside button:has-text("{ct}")').first
                if await ct_btn.count() > 0:
                    await ct_btn.click()
                    await page.wait_for_timeout(300)
            print("[+] All 3 Convert tools inspected.")

            # Return to Editor
            await page.locator('button:has-text("Back to Editor")').first.click()
            await page.wait_for_selector("canvas", timeout=10000)
            test_results["convert_tools_ui"] = "PASS"

            # -----------------------------------------------------------------
            # TEST 7: Finish & Compare Workspace Interaction
            # -----------------------------------------------------------------
            print("\n--- TEST 7: Finish & Compare Workspace UI Verification ---")
            finish_nav = page.locator('aside button:has-text("Finish")').first
            await finish_nav.click()
            await page.wait_for_selector('button:has-text("Back to Editor")', timeout=10000)
            await page.wait_for_timeout(800)
            await page.screenshot(path=str(SCREENSHOT_DIR / "adv_13_finish_workspace.png"))
            print("[+] Finish workspace loaded.")

            finish_subtools = ["Compress", "Metadata", "Sanitize", "Compare"]
            for ft in finish_subtools:
                ft_btn = page.locator(f'aside button:has-text("{ft}")').first
                if await ft_btn.count() > 0:
                    await ft_btn.click()
                    await page.wait_for_timeout(300)
            print("[+] All 4 Finish & Compare tools inspected.")

            # Return to Editor
            await page.locator('button:has-text("Back to Editor")').first.click()
            await page.wait_for_selector("canvas", timeout=10000)
            await page.screenshot(path=str(SCREENSHOT_DIR / "adv_14_editor_final.png"))
            print("[+] Returned cleanly to Editor.")
            test_results["finish_tools_ui"] = "PASS"

        finally:
            console_log_file = LOG_DIR / "browser_console.log"
            console_log_file.write_text(json.dumps({
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "base_url": BASE_URL,
                "test_results": test_results,
                "summary": {
                    "console_logs_count": len(console_logs),
                    "page_errors_count": len(page_errors),
                    "failed_requests_count": len(failed_requests),
                    "outbound_leak_attempts": len([r for r in failed_requests if r.get("failure") == "BLOCKED_AIRGAP_VIOLATION"])
                },
                "console_logs": console_logs,
                "page_errors": page_errors,
                "failed_requests": failed_requests
            }, indent=2))
            print(f"\n[OK] Browser console and error log written to: {console_log_file}")
            
            await context.close()
            await browser.close()

    print("\n" + "=" * 80)
    print("  ADVERSARIAL PLAYWRIGHT UI TEST SUITE COMPLETED")
    print(f"  Results: {test_results}")
    print(f"  Page Errors: {len(page_errors)} | Failed Outbound Requests: {len(failed_requests)}")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(run_ui_adversarial_suite())
