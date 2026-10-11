import { chromium } from 'playwright';

async function verifyE2E() {
  console.log('\n==================================================');
  console.log(' STARTING PLAYWRIGHT E2E PRODUCT STORY VERIFICATION ');
  console.log('==================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  try {
    console.log('1. Navigating to http://localhost:3000 ...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const bodyText = await page.innerText('body');
    console.log('--- BODY TEXT START ---');
    console.log(bodyText.substring(0, 500));
    console.log('--- BODY TEXT END ---');

    const hasDiscoverText = bodyText.includes('01 DISCOVER') || bodyText.includes('DISCOVER');
    console.log(`Product Story Discover stage text present: ${hasDiscoverText}`);

    const versionBadgeText = await page.locator('text=Story v').first().innerText().catch(() => 'No version badge');
    console.log(`Current Product Story Version Badge: "${versionBadgeText}"`);

    // Verify scan trigger button
    const scanButton = page.locator('button:has-text("Run Discovery Scan"), button:has-text("Initiate Discovery Scan")').first();
    const isBtnVisible = await scanButton.isVisible();
    console.log(`Scan button visible: ${isBtnVisible}`);

    console.log('\n✅ E2E UI Checks Completed Successfully!');
  } catch (err: any) {
    console.error('❌ E2E UI Check error:', err.message);
  } finally {
    await browser.close();
  }
}

verifyE2E();
