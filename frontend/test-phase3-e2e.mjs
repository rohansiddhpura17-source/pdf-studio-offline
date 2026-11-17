import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const p3Dir = path.resolve(__dirname, '../screenshots/phase-3');

async function run() {
  console.log('=== PHASE 3 E2E VERIFICATION & SCREENSHOT CAPTURE ===\n');

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // 1. Visit Home & Open Document
  console.log('1. Loading PDF Studio Home...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  // 2. Open via "Edit & Redact" quick card on home
  console.log('2. Opening sample document in Edit Workspace...');
  const editCard = await page.waitForSelector('xpath///div[contains(@class, "cursor-pointer") and contains(., "Edit & Redact")]');
  await editCard.click();
  await new Promise((r) => setTimeout(r, 2000));

  // 01: Edit Workspace Overview
  await page.screenshot({ path: path.join(p3Dir, '01_edit_workspace_overview.png') });
  console.log('✓ Captured 01_edit_workspace_overview.png');

  // Helper to click edit tool buttons on secondary toolbar
  const selectTool = async (label) => {
    const btn = await page.waitForSelector(`xpath///div[contains(@class, "h-11")]//button[contains(., "${label}")]`);
    await btn.click();
    await new Promise((r) => setTimeout(r, 600));
  };

  // Helper to drag across canvas
  const dragOnCanvas = async (startX, startY, endX, endY) => {
    const canvas = await page.$('canvas');
    const box = await canvas.boundingBox();
    if (!box) return;

    await page.mouse.move(box.x + startX, box.y + startY);
    await page.mouse.down();
    await page.mouse.move(box.x + endX, box.y + endY, { steps: 5 });
    await page.mouse.up();
    await new Promise((r) => setTimeout(r, 600));
  };

  // Helper to click on canvas
  const clickOnCanvas = async (relX, relY) => {
    const canvas = await page.$('canvas');
    const box = await canvas.boundingBox();
    if (!box) return;

    await page.mouse.click(box.x + relX, box.y + relY);
    await new Promise((r) => setTimeout(r, 600));
  };

  // 02: Tool 1 - Add Text
  console.log('3. Testing Tool 1 (Add Text)...');
  await selectTool('Text');
  await clickOnCanvas(150, 180);
  await page.screenshot({ path: path.join(p3Dir, '02_tool1_add_text.png') });
  console.log('✓ Captured 02_tool1_add_text.png');

  // 03: Tool 2 - Add Image
  console.log('4. Testing Tool 2 (Add Image)...');
  await selectTool('Image');
  // Inject sample image into store via page.evaluate
  await page.evaluate(() => {
    // Generate 120x80 blue sample image
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 100;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#2859D9';
    ctx.fillRect(0, 0, 160, 100);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Sample Graphic', 15, 55);
    const b64 = c.toDataURL('image/png');

    window.__editStore = window.useEditStore || window.__zustandEditStore;
    const store = window.useEditStore?.getState?.();
    if (store) {
      store.addImageItem({
        id: 'img-1',
        page_number: 1,
        image_base64: b64,
        x: 100,
        y: 400,
        width: 140,
        height: 80,
        opacity: 1.0,
      });
    }
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(p3Dir, '03_tool2_add_image.png') });
  console.log('✓ Captured 03_tool2_add_image.png');

  // 04: Tool 3 - Highlight
  console.log('5. Testing Tool 3 (Highlight)...');
  await selectTool('Highlight');
  await dragOnCanvas(80, 220, 300, 245);
  await page.screenshot({ path: path.join(p3Dir, '04_tool3_highlight.png') });
  console.log('✓ Captured 04_tool3_highlight.png');

  // 05: Tool 4 - Draw
  console.log('6. Testing Tool 4 (Draw)...');
  await selectTool('Draw');
  await dragOnCanvas(100, 320, 250, 360);
  await page.screenshot({ path: path.join(p3Dir, '05_tool4_draw.png') });
  console.log('✓ Captured 05_tool4_draw.png');

  // 06: Tool 5 - Shapes
  console.log('7. Testing Tool 5 (Shapes)...');
  await selectTool('Shapes');
  await dragOnCanvas(80, 420, 240, 500);
  await page.screenshot({ path: path.join(p3Dir, '06_tool5_shapes.png') });
  console.log('✓ Captured 06_tool5_shapes.png');

  // 07: Tool 6 - Whiteout
  console.log('8. Testing Tool 6 (Whiteout)...');
  await selectTool('Whiteout');
  await dragOnCanvas(80, 530, 260, 560);
  await page.screenshot({ path: path.join(p3Dir, '07_tool6_whiteout.png') });
  console.log('✓ Captured 07_tool6_whiteout.png');

  // 08: Tool 7 - Secure Redaction Warning Dialog
  console.log('9. Testing Tool 7 (Secure Redaction Dialog)...');
  await selectTool('Redact');
  await dragOnCanvas(80, 580, 280, 615);
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(p3Dir, '08_tool7_secure_redaction_dialog.png') });
  console.log('✓ Captured 08_tool7_secure_redaction_dialog.png');

  // Confirm Redaction
  const confirmRedactBtn = await page.waitForSelector('xpath///button[contains(., "Confirm & Redact")]');
  await confirmRedactBtn.click();
  await new Promise((r) => setTimeout(r, 600));

  // 09: Tool 7 - Redaction Applied
  await page.screenshot({ path: path.join(p3Dir, '09_tool7_secure_redaction_applied.png') });
  console.log('✓ Captured 09_tool7_secure_redaction_applied.png');

  // 10: Tool 8 - Digital Signature Modal
  console.log('10. Testing Tool 8 (Digital Signatures Modal)...');
  await selectTool('Sign');
  const openPadBtn = await page.waitForSelector('xpath///button[contains(., "Open Signature Pad")]');
  await openPadBtn.click();
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(p3Dir, '10_tool8_signature_pad_modal.png') });
  console.log('✓ Captured 10_tool8_signature_pad_modal.png');

  // Switch to Type tab in Signature Modal & Place Signature
  const typeTabBtn = await page.waitForSelector('xpath///div[contains(@class, "fixed")]//button[contains(., "Type")]');
  await typeTabBtn.click();
  await new Promise((r) => setTimeout(r, 400));
  const placeSigBtn = await page.waitForSelector('xpath///button[contains(., "Place on Document")]');
  await placeSigBtn.click();
  await new Promise((r) => setTimeout(r, 800));

  // 11: Tool 8 - Signature Placed on Canvas
  await page.screenshot({ path: path.join(p3Dir, '11_tool8_signature_placed.png') });
  console.log('✓ Captured 11_tool8_signature_placed.png');

  // 12: Tool 9 - Form Filling
  console.log('11. Testing Tool 9 (PDF Form Filling)...');
  await selectTool('Form Fill');
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(p3Dir, '12_tool9_form_filling.png') });
  console.log('✓ Captured 12_tool9_form_filling.png');

  // 13: Save & Apply Edits
  console.log('12. Testing Save Edits & Backend Processing...');
  const saveEditsBtn = await page.waitForSelector('xpath///button[contains(., "Save Edits")]');
  if (saveEditsBtn) {
    await saveEditsBtn.click();
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(p3Dir, '13_edits_applied_saved.png') });
    console.log('✓ Captured 13_edits_applied_saved.png');
  }

  await browser.close();
  console.log('\n=== ALL PHASE 3 E2E TESTS AND SCREENSHOTS COMPLETED! ===');
}

run().catch((err) => {
  console.error('Phase 3 E2E test failed:', err);
  process.exit(1);
});
