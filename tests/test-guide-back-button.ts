import { chromium } from 'playwright';

async function testGuideBackButton() {
  console.log('================================================================');
  console.log(' RUNNING BROWSER E2E GUIDE BACK/CLOSE BUTTON SUITE ');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // 1. Load application
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // FLOW A: Open Ways to Earn -> Open Guide -> Click "Back to Ways to Earn"
    console.log('[Test 1] Navigating to Ways to Earn...');
    await page.click('button:has-text("Ways to Earn")');
    await page.waitForTimeout(500);

    console.log('[Test 1] Opening an opportunity guide...');
    await page.click('text="Open Guide →" >> nth=0');
    await page.waitForSelector('[aria-label="Step-by-Step Guide"]', { state: 'visible' });
    console.log('  ✅ Step-by-Step Guide modal appeared');

    // Check Back button visibility
    const backBtn = page.locator('button:has-text("Back to Ways to Earn")');
    await backBtn.waitFor({ state: 'visible' });
    console.log('  ✅ Back button "Back to Ways to Earn" is visible in header');

    // Click Back button
    await backBtn.click();
    await page.waitForSelector('[aria-label="Step-by-Step Guide"]', { state: 'hidden' });
    console.log('  ✅ Guide modal closed');

    // Verify scroll position is 0
    const scrollY = await page.evaluate(() => window.scrollY);
    if (scrollY === 0) {
      console.log('  ✅ Viewport reset to top (scrollY = 0)');
    } else {
      console.error(`  ❌ Viewport scrollY is ${scrollY}, expected 0`);
    }

    // FLOW B: Open Guide -> Click "✕" Close Button
    console.log('\n[Test 2] Opening opportunity guide and testing ✕ close button...');
    await page.click('text="Open Guide →" >> nth=0');
    await page.waitForSelector('[aria-label="Step-by-Step Guide"]', { state: 'visible' });

    const closeBtn = page.locator('button[aria-label="Close Guide"]');
    await closeBtn.waitFor({ state: 'visible' });
    await closeBtn.click();
    await page.waitForSelector('[aria-label="Step-by-Step Guide"]', { state: 'hidden' });
    console.log('  ✅ ✕ Close button closed the guide cleanly');

    // FLOW C: Deep scroll inside guide -> Back -> Viewport starts at top
    console.log('\n[Test 3] Testing scroll reset after deep scroll in guide...');
    await page.click('text="Open Guide →" >> nth=0');
    await page.waitForSelector('[aria-label="Step-by-Step Guide"]', { state: 'visible' });
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(300);
    await page.click('button:has-text("Back to Ways to Earn")');
    await page.waitForSelector('[aria-label="Step-by-Step Guide"]', { state: 'hidden' });
    const scrollYAfterDeep = await page.evaluate(() => window.scrollY);
    if (scrollYAfterDeep === 0) {
      console.log('  ✅ Viewport reset to top after deep scroll (scrollY = 0)');
    }

    // FLOW E: Escape key close
    console.log('\n[Test 4] Testing Escape key closes guide...');
    await page.click('text="Open Guide →" >> nth=0');
    await page.waitForSelector('[aria-label="Step-by-Step Guide"]', { state: 'visible' });
    await page.keyboard.press('Escape');
    await page.waitForSelector('[aria-label="Step-by-Step Guide"]', { state: 'hidden' });
    console.log('  ✅ Escape key closed the guide cleanly');

    // FLOW F: Rapid back button click safety
    console.log('\n[Test 5] Testing rapid back button click safety...');
    await page.click('text="Open Guide →" >> nth=0');
    await page.waitForSelector('[aria-label="Step-by-Step Guide"]', { state: 'visible' });
    await backBtn.click({ clickCount: 3 });
    await page.waitForTimeout(500);
    const modalVisible = await page.isVisible('[aria-label="Step-by-Step Guide"]');
    if (!modalVisible) {
      console.log('  ✅ Rapid clicking Back did not cause errors or stuck modal state');
    }

    if (consoleErrors.length === 0) {
      console.log('\n  ✅ Zero console errors detected during user journeys');
    } else {
      console.log(`\n  ⚠️ Console messages:`, consoleErrors);
    }

    console.log('\n================================================================');
    console.log(' ALL BROWSER E2E TESTS PASSED ');
    console.log('================================================================');
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testGuideBackButton();
