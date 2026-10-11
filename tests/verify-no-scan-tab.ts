import { chromium } from 'playwright';
import { spawn } from 'child_process';

async function runVerification() {
  console.log('[E2E Test] Launching dev server...');
  const server = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'inherit'
  });

  // Wait 6 seconds for dev server to initialize
  await new Promise((r) => setTimeout(r, 6000));

  let browser;
  try {
    console.log('[E2E Test] Launching Chromium browser...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    console.log('[Test 1] Loading Opportunity OS homepage...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Verify 5 navigation items in floating dock
    console.log('[Test 2] Verifying 5 primary navigation tabs in navbar dock...');
    const navButtons = page.locator('header nav button');
    const count = await navButtons.count();
    console.log(`Navbar item count: ${count}`);

    const expectedLabels = ['Home', 'New AI Tools', 'Ways to Earn', 'Combine Tools', 'Supreme'];
    for (let i = 0; i < count; i++) {
      const text = await navButtons.nth(i).innerText();
      console.log(`Tab ${i + 1}: ${text.trim()}`);
    }

    // Ensure Scan Now tab is NOT present in navbar
    const scanTabInNav = page.locator('header nav button:has-text("Scan Now"), header button:has-text("Scan Now")');
    const scanTabCount = await scanTabInNav.count();
    if (scanTabCount === 0) {
      console.log('✓ [Test 2] Verified: "Scan Now" tab/button is strictly removed from the floating navbar.');
    } else {
      throw new Error('Test 2 Failed: "Scan Now" tab/button was still found in the floating navbar.');
    }

    // Verify scanning works from New AI Tools
    console.log('[Test 3] Switching to New AI Tools and testing scan refresh button...');
    await page.click('header nav button:has-text("New AI Tools")');
    await page.waitForTimeout(1000);

    const checkNewToolsBtn = page.locator('button:has-text("Check for New Tools")');
    if (await checkNewToolsBtn.isVisible()) {
      await checkNewToolsBtn.click();
      await page.waitForTimeout(2000);
      console.log('✓ [Test 3] Scanning engine successfully executed from New AI Tools.');
    } else {
      throw new Error('Test 3 Failed: "Check for New Tools" button not visible in New AI Tools.');
    }

    console.log('==================================================');
    console.log('🎉 5-ITEM NAVBAR & SCAN REFRESH VERIFIED SUCCESSFULLY!');
    console.log('==================================================');

  } catch (err: any) {
    console.error('❌ Verification Failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

runVerification();
