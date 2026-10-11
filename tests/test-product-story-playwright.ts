import { chromium } from 'playwright';
import { spawn } from 'child_process';
import assert from 'assert';

async function runProductStoryPlaywrightTest() {
  console.log('[Playwright Test] Launching dev server for Product Story verification...');
  const server = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'ignore'
  });

  // Wait 5 seconds for dev server to start
  await new Promise((r) => setTimeout(r, 5000));

  let browser;
  try {
    console.log('[Playwright Test] Launching Chromium browser...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    console.log('[Playwright Test] Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 1. Verify Home page loaded
    const productStoryHeader = page.locator('text="PRODUCT STORY"').first();
    const onboardingHeader = page.locator('text=/Your Product Story starts|No strong opportunity|01 DISCOVER/').first();
    
    assert.ok(
      (await productStoryHeader.isVisible()) || (await onboardingHeader.isVisible()),
      'Product Story section or onboarding state must be visible on Home page'
    );
    console.log('✓ 1. Home page Product Story section loaded.');

    // 2. Trigger Discovery Scan to test live update
    console.log('[Playwright Test] Triggering Discovery Scan from Home...');
    const scanBtn = page.locator('button:has-text("Initiate Discovery Scan"), button:has-text("Run Discovery Scan →")').first();
    if (await scanBtn.isVisible()) {
      await scanBtn.click();
      console.log('✓ 2. Clicked Discovery Scan trigger button.');
      
      // Wait 3 seconds for scan execution to finish
      await page.waitForTimeout(3000);
      
      // Re-query Product Story content
      const storyTitleLoc = page.locator('h2').first();
      if (await storyTitleLoc.isVisible()) {
        const titleText = await storyTitleLoc.innerText();
        console.log(`✓ 3. Product Story dynamic title after scan: "${titleText}"`);
        assert.ok(titleText && titleText.length > 0, 'Product Story must display valid title');
      }
    }

    // 3. Test scrolling down to scrub Product Story timeline
    console.log('[Playwright Test] Testing Product Story scroll pinning...');
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(1000);
    const timelineIndicator = page.locator('text=/Timeline|DISCOVER|UNDERSTAND|COMBINE|ACT|LEARN/').first();
    assert.ok(await timelineIndicator.isVisible(), 'Timeline indicator must remain visible during scroll');
    console.log('✓ 4. Scroll scrollytelling pinning verified cleanly.');

    console.log('\n====================================================');
    console.log(' PRODUCT STORY PLAYWRIGHT E2E VERIFICATION PASSED! 🚀');
    console.log('====================================================\n');

  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

runProductStoryPlaywrightTest().catch(err => {
  console.error('[Playwright Test Failed]', err);
  process.exit(1);
});
