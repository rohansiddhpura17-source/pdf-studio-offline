import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const p2Dir = path.resolve(__dirname, '../screenshots/phase-2');

async function run() {
  console.log('=== PHASE 2 E2E VERIFICATION & SCREENSHOT CAPTURE ===\n');

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // 1. Visit Home & Open Document
  console.log('1. Loading Home and opening 50-page sample PDF...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0' });
  const sampleBtn = await page.waitForSelector('xpath///button[contains(., "Open 50-Page Sample PDF")]');
  await sampleBtn.click();

  // Wait for Organise workspace to render
  console.log('Waiting for Organise Workspace...');
  await page.waitForSelector('xpath///header//span[contains(., "pages")]', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 2000));

  // 1. Organise workspace overview
  await page.screenshot({ path: path.join(p2Dir, '01_organise_workspace_overview.png') });
  console.log('✓ Captured 01_organise_workspace_overview.png');

  // Helper to click left organise tool buttons
  const selectOrganiseTool = async (label) => {
    const btn = await page.waitForSelector(`xpath///aside//button[contains(., "${label}")]`);
    await btn.click();
    await new Promise((r) => setTimeout(r, 800));
  };

  // 2. Merge PDF interface
  console.log('2. Inspecting Merge PDF interface...');
  await selectOrganiseTool('Merge');
  await page.screenshot({ path: path.join(p2Dir, '02_merge_pdf_interface.png') });
  console.log('✓ Captured 02_merge_pdf_interface.png');

  // 3. Split PDF interface
  console.log('3. Inspecting Split PDF interface...');
  await selectOrganiseTool('Split');
  await page.screenshot({ path: path.join(p2Dir, '03_split_pdf_interface.png') });
  console.log('✓ Captured 03_split_pdf_interface.png');

  // 4. Page Reordering
  console.log('4. Testing Page Reordering...');
  await selectOrganiseTool('Reorder');
  const reverseBtn = await page.waitForSelector('xpath///button[contains(., "Invert Complete Sequence")]');
  await reverseBtn.click();
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(p2Dir, '04_page_reordering.png') });
  console.log('✓ Captured 04_page_reordering.png');

  // 5. Rotate Pages
  console.log('5. Testing Rotate Pages...');
  await selectOrganiseTool('Rotate');
  const rot90Btn = await page.waitForSelector('xpath///button[contains(., "Rotate 90° Clockwise")]');
  await rot90Btn.click();
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(p2Dir, '05_rotate_pages.png') });
  console.log('✓ Captured 05_rotate_pages.png');

  // 6. Delete Pages
  console.log('6. Testing Delete Pages...');
  await selectOrganiseTool('Delete');
  const delBtn = await page.waitForSelector('xpath///aside//button[contains(., "Delete Selected Pages")]');
  await delBtn.click();
  await new Promise((r) => setTimeout(r, 800)); // modal opens
  await page.screenshot({ path: path.join(p2Dir, '06_delete_pages.png') });
  console.log('✓ Captured 06_delete_pages.png');

  // Confirm delete modal
  const confirmDeleteBtn = await page.waitForSelector('xpath///div[contains(@class, "fixed")]//button[contains(., "Delete Pages")]');
  await confirmDeleteBtn.click();
  await new Promise((r) => setTimeout(r, 1200));

  // 7. Duplicate Pages
  console.log('7. Testing Duplicate Pages...');
  await selectOrganiseTool('Duplicate');
  const dupBtn = await page.waitForSelector('xpath///aside//button[contains(., "Duplicate")]');
  await dupBtn.click();
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(p2Dir, '07_duplicate_pages.png') });
  console.log('✓ Captured 07_duplicate_pages.png');

  // 8. Extract Pages
  console.log('8. Testing Extract Pages...');
  await selectOrganiseTool('Extract');
  await page.screenshot({ path: path.join(p2Dir, '08_extract_pages.png') });
  console.log('✓ Captured 08_extract_pages.png');

  // 9. Insert Blank Pages
  console.log('9. Testing Insert Blank Pages...');
  await selectOrganiseTool('Insert Blank');
  const insertBlankBtn = await page.waitForSelector('xpath///aside//button[contains(., "Insert Blank Canvas")]');
  await insertBlankBtn.click();
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(p2Dir, '09_insert_blank_pages.png') });
  console.log('✓ Captured 09_insert_blank_pages.png');

  // 10. Crop Editor
  console.log('10. Testing Crop Editor...');
  await selectOrganiseTool('Crop');
  const cropPresetBtn = await page.waitForSelector('xpath///aside//button[contains(., "20pt Margin")]');
  await cropPresetBtn.click();
  const applyCropBtn = await page.waitForSelector('xpath///aside//button[contains(., "Apply Crop Box")]');
  await applyCropBtn.click();
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(p2Dir, '10_crop_editor.png') });
  console.log('✓ Captured 10_crop_editor.png');

  // 11. Export PDF confirmation
  console.log('11. Testing Export PDF...');
  const exportBtn = await page.waitForSelector('xpath///header//button[contains(., "Export PDF")]');
  await exportBtn.click();
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(p2Dir, '11_export_confirmation.png') });
  console.log('✓ Captured 11_export_confirmation.png');

  // 12. Final Modified PDF Preview
  console.log('12. Returning to Document Canvas View...');
  const backToDocBtn = await page.waitForSelector('xpath///header//button[contains(., "Back to Document")]');
  await backToDocBtn.click();
  await page.waitForSelector('canvas', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(p2Dir, '12_final_modified_pdf_preview.png') });
  console.log('✓ Captured 12_final_modified_pdf_preview.png');

  await browser.close();
  console.log('\n=== ALL 12 PHASE 2 SCREENSHOTS CAPTURED SUCCESSFULLY ===');
}

run().catch((err) => {
  console.error('Phase 2 E2E run failed:', err);
  process.exit(1);
});
