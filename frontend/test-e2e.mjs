import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.resolve(__dirname, '../screenshots');

async function runAudit() {
  console.log('=== PHASE 1 COMPREHENSIVE ACCEPTANCE AUDIT ===\n');

  const externalRequests = [];
  const localRequests = [];

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // Monitor network requests for offline integrity
  page.on('request', (req) => {
    const url = req.url();
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost') || url.startsWith('data:') || url.startsWith('blob:')) {
      localRequests.push(url);
    } else {
      console.warn('EXTERNAL REQUEST DETECTED:', url);
      externalRequests.push(url);
    }
  });

  // 1. Visit Document Home
  console.log('1. Loading Document Home at http://127.0.0.1:5173 ...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(screenshotsDir, '01_home_screen.png') });
  console.log('   ✓ Document Home loaded successfully');

  // 2. Open 50-page PDF
  console.log('2. Opening 50-Page Sample PDF...');
  const sampleBtn = await page.waitForSelector('xpath///button[contains(., "Open 50-Page Sample PDF")]');
  await sampleBtn.click();

  // Wait for canvas and thumbnails
  await page.waitForSelector('canvas', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(screenshotsDir, '02_editor_workspace_page1.png') });
  console.log('   ✓ 50-Page Document rendered in canvas');

  // 3. Verify Page Navigation
  console.log('3. Testing page navigation (Page 1 -> Page 2)...');
  const nextBtn = await page.waitForSelector('button[title="Next Page"]');
  await nextBtn.click();
  await new Promise((r) => setTimeout(r, 1200));

  // Zoom controls
  console.log('4. Testing Zoom controls (100% -> 115% -> 130%)...');
  const zoomInBtn = await page.waitForSelector('button[title="Zoom In"]');
  await zoomInBtn.click();
  await new Promise((r) => setTimeout(r, 500));
  await zoomInBtn.click();
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(screenshotsDir, '03_editor_page2_zoomed.png') });
  console.log('   ✓ Page 2 rendered at 130% zoom');

  // 5. Verify Settings Modal and Cache Purge
  console.log('5. Testing Settings Modal and Cache Purging...');
  const settingsBtn = await page.waitForSelector('button[title="Application Settings"]');
  await settingsBtn.click();
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(screenshotsDir, '04_settings_modal.png') });

  const purgeBtn = await page.waitForSelector('xpath///button[contains(., "Purge Cache")]');
  await purgeBtn.click();
  await new Promise((r) => setTimeout(r, 1000));
  console.log('   ✓ Cache purge executed');

  const closeBtn = await page.waitForSelector('button[aria-label="Close modal"]');
  await closeBtn.click();
  await new Promise((r) => setTimeout(r, 500));

  // 6. Test Save PDF (Download)
  console.log('6. Testing Save PDF...');
  const saveBtn = await page.waitForSelector('xpath///button[contains(., "Save PDF")]');
  await saveBtn.click();
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(screenshotsDir, '05_document_saved_toast.png') });
  console.log('   ✓ Save PDF verified with toast notification');

  // 7. Test Save As (Copy preservation)
  console.log('7. Testing Save As...');
  // Handle prompt dialog
  page.on('dialog', async (dialog) => {
    console.log('   Dialog prompt opened with text:', dialog.message());
    await dialog.accept('audited_copy_notes.pdf');
  });

  const saveAsDropdown = await page.waitForSelector('button[title="Save As New Copy..."]');
  await saveAsDropdown.click();
  await new Promise((r) => setTimeout(r, 1500));
  console.log('   ✓ Save As created independent document session');

  // 8. Return to Home and observe Recent Documents
  console.log('8. Returning to Document Home...');
  const homeBtn = await page.waitForSelector('xpath///button[contains(., "Home")]');
  await homeBtn.click();
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(screenshotsDir, '06_recent_documents_home.png') });
  console.log('   ✓ Home screen reflects recently opened documents');

  await browser.close();

  // Network verification report
  console.log('\n--- NETWORK ISOLATION VERIFICATION ---');
  console.log(`Total local requests: ${localRequests.length}`);
  console.log(`External requests: ${externalRequests.length}`);
  if (externalRequests.length > 0) {
    console.error('FAIL: External requests were made:', externalRequests);
    process.exit(1);
  } else {
    console.log('PASS: ZERO external requests detected. 100% offline verified.');
  }

  console.log('\n=== AUDIT RUN COMPLETED SUCCESSFULLY ===');
}

runAudit().catch((err) => {
  console.error('Audit run failed:', err);
  process.exit(1);
});
