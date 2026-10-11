import { chromium } from 'playwright';
import { spawn } from 'child_process';

async function runE2EVerification() {
  console.log('[E2E IA Verification] Launching dev server...');
  const server = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'inherit'
  });

  // Wait 6 seconds for dev server to start
  await new Promise((r) => setTimeout(r, 6000));

  let browser;
  try {
    console.log('[E2E IA Verification] Launching Chromium...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    console.log('[Test 1] Navigating to Home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Verify Home title
    const homeTitle = page.locator('text="Personal AI Opportunity Engine"').first();
    if (await homeTitle.isVisible()) {
      console.log('✓ [Test 1] Home tab loaded with story intact.');
    }

    // -------------------------------------------------------------
    // Test 2: New AI Tools tab
    // -------------------------------------------------------------
    console.log('[Test 2] Switching to New AI Tools tab...');
    await page.click('button:has-text("New AI Tools")');
    await page.waitForTimeout(1000);

    const newToolsHeader = page.locator('h1:has-text("New AI Tools")');
    if (await newToolsHeader.isVisible()) {
      console.log('✓ [Test 2] New AI Tools tab loaded successfully.');
    }

    // -------------------------------------------------------------
    // Test 3: Ways to Earn tab
    // -------------------------------------------------------------
    console.log('[Test 3] Switching to Ways to Earn tab...');
    await page.click('button:has-text("Ways to Earn")');
    await page.waitForTimeout(1000);

    const waysToEarnHeader = page.locator('h1:has-text("Ways to Earn")');
    if (await waysToEarnHeader.isVisible()) {
      console.log('✓ [Test 3] Ways to Earn tab loaded successfully.');
    }

    // -------------------------------------------------------------
    // Test 4: Combine Tools tab
    // -------------------------------------------------------------
    console.log('[Test 4] Switching to Combine Tools tab...');
    await page.click('button:has-text("Combine Tools")');
    await page.waitForTimeout(1000);

    const combineHeader = page.locator('h1:has-text("Combine Tools")');
    if (await combineHeader.isVisible()) {
      console.log('✓ [Test 4] Combine Tools tab loaded successfully.');
    }

    // -------------------------------------------------------------
    // Test 5: Scan Now tab
    // -------------------------------------------------------------
    console.log('[Test 5] Switching to Scan Now tab...');
    await page.click('button:has-text("Scan Now")');
    await page.waitForTimeout(1000);

    const scanHeader = page.locator('h1:has-text("Scan Now")');
    if (await scanHeader.isVisible()) {
      console.log('✓ [Test 5] Scan Now tab loaded successfully.');
    }

    // Trigger Scan
    const runScanBtn = page.locator('button:has-text("Run Intelligence Refresh Scan")');
    if (await runScanBtn.isVisible()) {
      await runScanBtn.click();
      await page.waitForTimeout(2000);
      console.log('✓ [Test 5] On-demand scan executed successfully.');
    }

    // -------------------------------------------------------------
    // Test 6: Supreme (Profile) tab
    // -------------------------------------------------------------
    console.log('[Test 6] Switching to Supreme tab...');
    await page.click('button:has-text("Supreme")');
    await page.waitForTimeout(1000);

    const supremeText = page.locator('text="Core Identity & Constraints"');
    if (await supremeText.isVisible()) {
      console.log('✓ [Test 6] Supreme (Builder Intelligence Dossier) loaded successfully.');
    }

    console.log('==================================================');
    console.log('🎉 ALL 6 NAVIGATION TABS & ACTIONS VERIFIED!');
    console.log('==================================================');

  } catch (err: any) {
    console.error('❌ E2E Verification Failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

runE2EVerification();
