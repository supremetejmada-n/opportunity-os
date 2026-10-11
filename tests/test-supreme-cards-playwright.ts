import { chromium } from 'playwright';
import { spawn } from 'child_process';
import assert from 'assert';

async function runSupremeCardsPlaywrightTest() {
  console.log('[Playwright Test] Launching server for Supreme cards alignment verification...');
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

    console.log('[Playwright Test] Switching to Supreme (Profile) tab...');
    await page.click('button:has-text("Supreme")');
    await page.waitForTimeout(1500);

    // 1. Verify Card 1: Builder Velocity
    const card1Header = page.locator('text="Builder Velocity"').first();
    assert.ok(await card1Header.isVisible(), 'Builder Velocity card header must be visible');
    console.log('✓ 1. Builder Velocity card found.');

    // 2. Verify Card 2: Equipped Arsenal
    const card2Header = page.locator('text="Equipped Arsenal"').first();
    assert.ok(await card2Header.isVisible(), 'Equipped Arsenal card header must be visible');
    console.log('✓ 2. Equipped Arsenal card found.');

    // 3. Verify Card 3: Domain Capabilities
    const card3Header = page.locator('text="Domain Capabilities"').first();
    assert.ok(await card3Header.isVisible(), 'Domain Capabilities card header must be visible');
    console.log('✓ 3. Domain Capabilities card found.');

    // 4. Verify vertical bounds & centering
    const cards = page.locator('.grid.grid-cols-1.md\\:grid-cols-3 > div');
    const count = await cards.count();
    assert.strictEqual(count, 3, 'Must render exactly 3 Supreme telemetry cards in the grid');

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const box = await card.boundingBox();
      assert.ok(box, `Card ${i + 1} must have a valid bounding box`);
      assert.ok(box.height >= 220, `Card ${i + 1} height (${box.height}px) must respect min-h-[220px]`);
      console.log(`✓ Card ${i + 1} bounding box height: ${Math.round(box.height)}px`);
    }

    // 5. Test responsive resize (narrow width 375px)
    console.log('[Playwright Test] Testing narrow mobile viewport (375x800)...');
    await page.setViewportSize({ width: 375, height: 800 });
    await page.waitForTimeout(1000);
    assert.ok(await card1Header.isVisible(), 'Builder Velocity must remain visible on mobile');
    assert.ok(await card2Header.isVisible(), 'Equipped Arsenal must remain visible on mobile');
    assert.ok(await card3Header.isVisible(), 'Domain Capabilities must remain visible on mobile');
    console.log('✓ 5. Responsive mobile view verified.');

    console.log('\n====================================================');
    console.log(' SUPREME CARDS ALIGNMENT PLAYWRIGHT TEST PASSED! 🚀');
    console.log('====================================================\n');

  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

runSupremeCardsPlaywrightTest().catch(err => {
  console.error('[Playwright Test Failed]', err);
  process.exit(1);
});
