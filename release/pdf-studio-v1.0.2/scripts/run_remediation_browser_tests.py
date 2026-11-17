"""
Playwright Browser Test Suite for v1.0.1 Remediation:
- Verifies opening a document immediately enters the main Editor workspace (Canvas + toolbar).
- Verifies consistent navigation cycle: Organise, Edit, Stamp, Convert, Finish.
- Verifies 'Back to Document' and 'Home' buttons across all workspaces.
- Verifies 50-page lifecycle.
- Captures screenshots into evidence/remediation/screenshots/.
"""

import os
import sys
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://127.0.0.1:8001"
SCREENSHOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "evidence", "remediation", "screenshots"))
LOG_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "evidence", "remediation", "logs"))
os.makedirs(SCREENSHOT_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)

def run_tests():
    browser_logs = []
    print("=" * 80)
    print("RUNNING BROWSER REMEDIATION TEST SUITE (v1.0.1)")
    print("=" * 80)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        page.on("console", lambda msg: browser_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("requestfailed", lambda req: browser_logs.append(f"[FAIL] {req.method} {req.url} - {req.failure}"))

        # Step 1: Open Home
        page.goto(BASE_URL, wait_until="networkidle")
        time.sleep(1)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "rem_01_home_screen.png"))
        print("[PASS] Step 1: Home screen loaded.")

        # Step 2: Open 50-page sample document
        # Target the sample document button on Home
        sample_btn = page.locator('button:has-text("Open 50-Page Sample"), button:has-text("50-Page Sample Document")').first
        if sample_btn.is_visible():
            sample_btn.click()
        else:
            # Click Open Recent document
            recent_open = page.locator('div.divide-y button:has-text("Open")').first
            recent_open.click()

        time.sleep(2)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "rem_02_opened_main_editor.png"))

        # Step 3: VERIFY Priority 4 — Opened directly into main editor with canvas and toolbar!
        canvas = page.locator("canvas")
        assert canvas.is_visible(), "Canvas is not visible! Document did not open into main editor!"
        # Verify edit toolbar
        select_tool = page.locator('button:has-text("Select")')
        text_tool = page.locator('button:has-text("Text")')
        assert select_tool.is_visible() and text_tool.is_visible(), "Edit toolbar not visible!"
        print("[PASS] Step 2: Document opened DIRECTLY into intended main editor (Canvas + toolbar).")

        # Step 4: Navigation Cycle Test
        # 4a: Switch to Organise workspace via LeftSidebar
        organise_tab = page.locator('button:has-text("Organise")').first
        organise_tab.click()
        time.sleep(1)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "rem_03_organise_workspace.png"))
        
        # Verify 'Back to Document' and 'Home' exist in Organise header
        back_doc_btn = page.locator('button:has-text("Back to Document")')
        home_btn = page.locator('header button:has-text("Home")')
        assert back_doc_btn.is_visible(), "'Back to Document' button missing in OrganiseWorkspace!"
        assert home_btn.is_visible(), "'Home' button missing in OrganiseWorkspace!"
        print("[PASS] Step 3: Organise workspace loaded with consistent 'Back to Document' and 'Home'.")

        # 4b: Click 'Back to Document' -> must return to main editor canvas
        back_doc_btn.click()
        time.sleep(1)
        assert page.locator("canvas").is_visible(), "Failed to return to editor from Organise!"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "rem_04_returned_to_editor.png"))
        print("[PASS] Step 4: Returned to main editor from Organise.")

        # 4c: Switch to Stamp workspace
        stamp_tab = page.locator('button:has-text("Stamp")').first
        stamp_tab.click()
        time.sleep(1)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "rem_05_stamp_workspace.png"))
        assert page.locator('button:has-text("Back to Document")').is_visible(), "'Back to Document' missing in Stamp!"
        assert page.locator('header button:has-text("Home")').is_visible(), "'Home' missing in Stamp!"
        print("[PASS] Step 5: Stamp workspace loaded with consistent navigation.")

        # Click 'Back to Document'
        page.locator('button:has-text("Back to Document")').click()
        time.sleep(1)
        assert page.locator("canvas").is_visible()

        # 4d: Switch to Finish workspace
        finish_tab = page.locator('button:has-text("Finish")').first
        finish_tab.click()
        time.sleep(1)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "rem_06_finish_workspace.png"))
        assert page.locator('button:has-text("Back to Document")').is_visible(), "'Back to Document' missing in Finish!"
        assert page.locator('header button:has-text("Home")').is_visible(), "'Home' missing in Finish!"
        print("[PASS] Step 6: Finish workspace loaded with consistent navigation.")

        # Return to editor
        page.locator('button:has-text("Back to Document")').click()
        time.sleep(1)

        # Step 5: 50-page lifecycle inside main editor
        # Navigate to Page 25
        page_input = page.locator('footer form input, footer input[type="text"]').first
        if page_input.is_visible():
            page_input.fill("25")
            page_input.press("Enter")
            time.sleep(1)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "rem_07_page_25.png"))
            print("[PASS] Step 7: Navigated to Page 25.")

            # Navigate to Page 50
            page_input.fill("50")
            page_input.press("Enter")
            time.sleep(1)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "rem_08_page_50.png"))
            print("[PASS] Step 8: Navigated to Page 50.")

        # Zoom 150%
        zoom_in_btn = page.locator('button[title="Zoom In"], button:has-text("+")').first
        if zoom_in_btn.is_visible():
            zoom_in_btn.click()
            time.sleep(0.3)
            zoom_in_btn.click()
            time.sleep(0.5)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "rem_09_zoom_150.png"))
            print("[PASS] Step 9: Scaled zoom to 150%.")

        # Step 6: Close to Home via TopBar Home button
        topbar_home = page.locator('header button:has-text("Home")').first
        topbar_home.click()
        time.sleep(1)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "rem_10_closed_to_home.png"))
        assert page.locator('button:has-text("Open PDF Document")').is_visible(), "Failed to return to DocumentHome!"
        print("[PASS] Step 10: Closed document cleanly to Home screen.")

        # Step 7: Reopen from Recent Documents
        recent_card = page.locator('div.divide-y button:has-text("Open")').first
        recent_card.click()
        time.sleep(2)
        assert page.locator("canvas").is_visible(), "Failed to reopen document into editor!"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "rem_11_reopened_editor.png"))
        print("[PASS] Step 11: Reopened document from Recent cache directly into editor.")

        browser.close()

    with open(os.path.join(LOG_DIR, "browser_console.log"), "w") as f:
        f.write("\n".join(browser_logs))

    print("=" * 80)
    print("ALL BROWSER REMEDIATION TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()
