import { chromium } from 'playwright';
import path from 'path';

async function run() {
  console.log('=== VERIFYING FEATURE CARDS ACCENT LINES & VERTICAL CENTERING ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    console.log('1. Navigating to http://localhost:3000 ...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log('2. Capturing Section 2 ("Why this exists") ...');
    const whyHeader = page.locator('h2:has-text("Discovering new tools is easy")');
    await whyHeader.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const whyPath = path.join(process.cwd(), 'section_why_exists.png');
    await page.screenshot({ path: whyPath });

    console.log('3. Capturing Section 3 ("What you actually get") ...');
    const outcomesHeader = page.locator('h2:has-text("What you actually get.")');
    await outcomesHeader.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const outcomesPath = path.join(process.cwd(), 'section_product_outcomes.png');
    await page.screenshot({ path: outcomesPath });

    console.log('4. Capturing Section 7 ("Who it is for") ...');
    const personasHeader = page.locator('h2:has-text("Built for people who want to create")');
    await personasHeader.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const personasPath = path.join(process.cwd(), 'section_who_for.png');
    await page.screenshot({ path: personasPath });

    console.log('\n✅ FOCUSED SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
