import { chromium } from 'playwright';
import { spawn } from 'child_process';
import assert from 'assert';

async function runHeroBudgetPlaywrightTest() {
  console.log('[Playwright Test] Launching server for Hero Budget Limit verification...');
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

    // 1. Verify "Your Builder Vector" header exists
    const builderVectorHeader = page.locator('text="Your Builder Vector"').first();
    assert.ok(await builderVectorHeader.isVisible(), 'Your Builder Vector header must be visible in Hero');
    console.log('✓ 1. Hero "Your Builder Vector" card found.');

    // 2. Verify "Budget Limit" tile is present
    const budgetTileHeader = page.locator('text="Budget Limit"').first();
    assert.ok(await budgetTileHeader.isVisible(), 'Budget Limit tile header must be visible');
    console.log('✓ 2. "Budget Limit" tile header verified.');

    // 3. Verify tile container text
    const tileContainer = page.locator('div:has-text("Budget Limit")').first();
    const containerText = await tileContainer.innerText();
    console.log(`✓ 3. Rendered Budget Limit Container Text: "${containerText.replace(/\n/g, ' ')}"`);

    assert.ok(containerText.includes('BUDGET LIMIT'), 'Must contain BUDGET LIMIT title');
    assert.ok(containerText.includes('₹0 (Free Only)') || containerText.includes('₹'), 'Must contain formatted budget value');
    assert.ok(!containerText.includes('undefined'), 'Value must not contain "undefined"');
    assert.ok(!containerText.includes('null'), 'Value must not contain "null"');
    assert.ok(!containerText.includes('NaN'), 'Value must not contain "NaN"');

    console.log('\n====================================================');
    console.log(' HERO BUDGET LIMIT PLAYWRIGHT VERIFICATION PASSED! 🚀');
    console.log('====================================================\n');

  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

runHeroBudgetPlaywrightTest().catch(err => {
  console.error('[Playwright Test Failed]', err);
  process.exit(1);
});
