import { chromium } from 'playwright';
import { spawn } from 'child_process';
import assert from 'assert';

async function runModalNavigationTest() {
  console.log('[Playwright Test] Launching server for verification...');
  const server = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'ignore'
  });

  // Wait 5 seconds for server to start
  await new Promise((r) => setTimeout(r, 5000));

  let browser;
  try {
    console.log('[Playwright Test] Launching Chromium browser...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    console.log('[Playwright Test] Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const initialUrl = page.url();

    console.log('[Playwright Test] Opening first opportunity guide modal...');
    await page.click('button:has-text("Ways to Earn")');
    await page.waitForTimeout(1000);

    const openGuideBtn = page.locator('text="Open Guide →"').first();
    await openGuideBtn.click();
    await page.waitForTimeout(1200);

    // 1. Confirm modal header visible
    const modalHeader = page.locator('text="STEP-BY-STEP GUIDE"');
    assert.ok(await modalHeader.isVisible(), 'Modal header must be visible');
    console.log('✓ 1. Guide modal opened successfully.');

    // 2. Confirm "Start Step-by-Step Guide →" button is REMOVED
    const redundantStartBtn = page.locator('button:has-text("Start Step-by-Step Guide →")');
    assert.strictEqual(await redundantStartBtn.count(), 0, 'Redundant "Start Step-by-Step Guide →" button must be removed');
    console.log('✓ 2. Redundant "Start Step-by-Step Guide →" button confirmed absent from DOM.');

    // 3. Step 1 state check
    const stepCounter1 = page.locator('text=/1 of \\d+/');
    assert.ok(await stepCounter1.isVisible(), 'Step 1 counter ("1 of N") must be visible');
    const prevStepBtn1 = page.locator('button:has-text("← Previous Step")');
    assert.strictEqual(await prevStepBtn1.count(), 0, 'Previous Step button must NOT be visible on Step 1');
    console.log('✓ 3. Step 1 of N verified. No Previous Step button on step 1.');

    // 4. Click Next Step ->
    const nextStepBtn = page.locator('button:has-text("Next Step →")').first();
    await nextStepBtn.click();
    await page.waitForTimeout(500);

    // Verify URL didn't change (no route navigation!)
    assert.strictEqual(page.url(), initialUrl, 'URL must not change when clicking Next Step');
    const stepCounter2 = page.locator('text=/2 of \\d+/');
    assert.ok(await stepCounter2.isVisible(), 'Modal must advance to Step 2 locally ("2 of N")');
    console.log('✓ 4. Clicked "Next Step →". Advanced to Step 2 locally without URL change.');

    // 5. Previous Step button check on step 2
    const prevStepBtn2 = page.locator('button:has-text("← Previous Step")');
    assert.ok(await prevStepBtn2.isVisible(), 'Previous Step button must be visible on Step 2');

    // 6. Click Previous Step ->
    await prevStepBtn2.click();
    await page.waitForTimeout(500);
    assert.ok(await stepCounter1.isVisible(), 'Clicking Previous Step returns to Step 1 locally');
    console.log('✓ 5. Clicked "← Previous Step". Returned to Step 1 locally.');

    // 7. Advance to final step
    let nextVisible = true;
    while (nextVisible) {
      const nextBtn = page.locator('button:has-text("Next Step →")').first();
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(300);
      } else {
        nextVisible = false;
      }
    }

    // 8. Confirm final step has "Complete Guide ✓"
    const completeGuideBtn = page.locator('button:has-text("Complete Guide ✓")');
    assert.ok(await completeGuideBtn.isVisible(), 'Final step must display "Complete Guide ✓"');
    console.log('✓ 6. Advanced to final step. "Complete Guide ✓" button verified.');

    // 9. Click Complete Guide ✓
    await completeGuideBtn.click();
    await page.waitForTimeout(1000);
    assert.strictEqual(page.url(), initialUrl, 'URL must remain unchanged after completion');
    console.log('✓ 7. Clicked "Complete Guide ✓". Guide completed and closed without routing.');

    console.log('\n====================================================');
    console.log(' ALL PLAYWRIGHT E2E NAVIGATION TESTS PASSED! 🚀');
    console.log('====================================================\n');

  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

runModalNavigationTest().catch(err => {
  console.error('[Playwright Test Failed]', err);
  process.exit(1);
});
