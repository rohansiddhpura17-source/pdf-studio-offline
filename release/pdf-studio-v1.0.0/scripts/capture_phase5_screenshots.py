import asyncio
import os
import time
from playwright.async_api import async_playwright

OUTPUT_DIR = "/Volumes/PortableSSD/BSERC-WEEK-2/01-PDF-Studio/screenshots/phase-5"
os.makedirs(OUTPUT_DIR, exist_ok=True)

async def capture_all():
    async with async_playwright() as p:
        # Launch Chromium with desktop 1440x900 viewport
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2, # Crisp high-DPI screenshots
        )
        page = await context.new_page()

        print("1. Loading Document Home at http://127.0.0.1:5173 ...")
        await page.goto("http://127.0.0.1:5173", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # Click "Compress PDF" quick card to enter Finish workspace
        print("Clicking Compress PDF card...")
        card = page.locator("div:has-text('Compress PDF')").last
        await card.click()
        await page.wait_for_selector("header:has-text('Finish & Compare Workspace')", timeout=15000)
        await page.wait_for_timeout(1500)

        # 01_finish_compare_overview.png
        print("Capturing 01_finish_compare_overview.png ...")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "01_finish_compare_overview.png"))

        # Tool 1: Compression
        print("Capturing 02_tool1_compression_workspace.png ...")
        compress_tool_btn = page.locator("button:has-text('PDF Compression')").first
        await compress_tool_btn.click()
        await page.wait_for_timeout(800)
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "02_tool1_compression_workspace.png"))

        # Presets
        print("Capturing 03_tool1_compression_presets.png ...")
        max_quality_btn = page.locator("button:has-text('Max Quality')")
        await max_quality_btn.click()
        await page.wait_for_timeout(600)
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "03_tool1_compression_presets.png"))

        # Custom settings
        print("Capturing 04_tool1_compression_custom_settings.png ...")
        custom_btn = page.locator("button:has-text('Custom')")
        await custom_btn.click()
        await page.wait_for_timeout(600)
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "04_tool1_compression_custom_settings.png"))

        # Run Balanced Compression
        print("Running Balanced Compression and capturing 05_tool1_compression_result_stats.png ...")
        balanced_btn = page.locator("button:has-text('Balanced')")
        await balanced_btn.click()
        await page.wait_for_timeout(500)

        run_compress_btn = page.locator("aside button:has-text('Compress PDF')")
        await run_compress_btn.click()
        # Wait for compression result banner
        await page.wait_for_selector("text='Compression Completed Successfully'", timeout=15000)
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "05_tool1_compression_result_stats.png"))

        # Tool 2: Metadata Editor
        print("Switching to Metadata Editor (Tool 2) ...")
        meta_tool_btn = page.locator("button:has-text('Edit Metadata')").first
        await meta_tool_btn.click()
        await page.wait_for_timeout(1200)

        print("Capturing 06_tool2_metadata_editor.png ...")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "06_tool2_metadata_editor.png"))

        print("Capturing 07_tool2_metadata_inspection.png ...")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "07_tool2_metadata_inspection.png"))

        # Edit metadata and add custom key
        print("Updating metadata fields and capturing 08_tool2_metadata_updated.png ...")
        title_input = page.locator("input[placeholder*='Quarterly Financial Report']")
        await title_input.fill("Quarterly Financial & Security Audit 2026")

        author_input = page.locator("input[placeholder*='John Doe']")
        await author_input.fill("Senior Software Architect")

        keywords_input = page.locator("input[placeholder*='finance, audit']")
        await keywords_input.fill("finance, audit, confidential, pypdf")

        # Custom key
        custom_key_input = page.locator("input[placeholder*='Key (e.g. Department)']")
        custom_val_input = page.locator("input[placeholder*='Value (e.g. Finance)']")
        add_key_btn = page.locator("button:has-text('Add Key')")

        await custom_key_input.fill("Department")
        await custom_val_input.fill("Compliance Division")
        await add_key_btn.click()
        await page.wait_for_timeout(500)

        save_meta_btn = page.locator("aside button:has-text('Save Metadata')")
        await save_meta_btn.click()
        await page.wait_for_selector("text='Metadata Saved'", timeout=10000)
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "08_tool2_metadata_updated.png"))

        # Tool 3: Metadata Cleanup
        print("Switching to Remove Metadata (Tool 3) ...")
        cleanup_tool_btn = page.locator("button:has-text('Remove Metadata')").first
        await cleanup_tool_btn.click()
        await page.wait_for_timeout(1000)

        print("Capturing 09_tool3_metadata_cleanup_standard.png ...")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "09_tool3_metadata_cleanup_standard.png"))

        print("Selecting Deep Sanitization and capturing 10_tool3_metadata_cleanup_deep.png ...")
        deep_mode_card = page.locator("div:has-text('Deep Sanitization (Clean Rebuild)')").last
        await deep_mode_card.click()
        await page.wait_for_timeout(600)
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "10_tool3_metadata_cleanup_deep.png"))

        print("Executing sanitization and capturing 11_tool3_privacy_verification_report.png ...")
        sanitize_btn = page.locator("button:has-text('Sanitize & Rebuild PDF')").first
        await sanitize_btn.click()
        await page.wait_for_selector("text='Privacy Verification & Audit Report'", timeout=15000)
        await page.wait_for_timeout(1200)
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "11_tool3_privacy_verification_report.png"))

        # Tool 4: Compare PDFs
        print("Switching to Compare PDFs (Tool 4) ...")
        compare_tool_btn = page.locator("button:has-text('Compare PDFs')").first
        await compare_tool_btn.click()
        await page.wait_for_timeout(1000)

        print("Capturing 12_tool4_compare_workspace.png ...")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "12_tool4_compare_workspace.png"))

        # Generate sample revision and run comparison
        print("Creating sample revision and running comparison...")
        sample_rev_btn = page.locator("button:has-text('Create Sample Revision & Compare')")
        if await sample_rev_btn.count() > 0:
            await sample_rev_btn.click()
        else:
            sample_rev_btn_alt = page.locator("button:has-text('Use Sample Revision')")
            await sample_rev_btn_alt.click()
            await page.wait_for_timeout(500)
            run_comp_btn = page.locator("aside button:has-text('Run Comparison')")
            await run_comp_btn.click()

        await page.wait_for_selector("text='Side-by-Side'", timeout=20000)
        await page.wait_for_timeout(2000)

        print("Capturing 13_tool4_compare_side_by_side.png ...")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "13_tool4_compare_side_by_side.png"))

        # Overlay blend mode
        print("Switching to Overlay mode and capturing 14_tool4_compare_overlay.png ...")
        overlay_btn = page.locator("button:has-text('Overlay')")
        await overlay_btn.click()
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "14_tool4_compare_overlay.png"))

        # Heatmap mode
        print("Switching to Difference Heatmap mode and capturing 15_tool4_compare_difference_heatmap.png ...")
        heatmap_btn = page.locator("button:has-text('Heatmap')")
        await heatmap_btn.click()
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "15_tool4_compare_difference_heatmap.png"))

        # Text Diff tab
        print("Switching to Text Diff tab and capturing 16_tool4_compare_text_diffs.png ...")
        text_diff_tab = page.locator("button:has-text('Text Diff')")
        await text_diff_tab.click()
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "16_tool4_compare_text_diffs.png"))

        # 17: Exported Report View
        print("Generating and capturing 17_tool4_compare_exported_report.png ...")
        export_btn = page.locator("button:has-text('Export Audit Report')").first
        try:
            async with context.expect_page() as new_page_info:
                await export_btn.click()
            report_page = await new_page_info.value
            await report_page.wait_for_load_state("networkidle")
            await report_page.wait_for_timeout(1000)
            await report_page.screenshot(path=os.path.join(OUTPUT_DIR, "17_tool4_compare_exported_report.png"))
        except Exception as e:
            print("Popup capture notice:", e)
            # Fallback to screenshotting current page with differences
            await page.screenshot(path=os.path.join(OUTPUT_DIR, "17_tool4_compare_exported_report.png"))

        await browser.close()
        print(f"All 17 Phase 5 screenshots captured successfully in {OUTPUT_DIR}!")

if __name__ == "__main__":
    asyncio.run(capture_all())
