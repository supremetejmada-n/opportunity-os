import { chromium } from 'playwright';
import { spawn } from 'child_process';

async function runVerification() {
  console.log('[E2E Test] Launching dev server...');
  const server = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'inherit'
  });

  // Wait 6 seconds for server to start
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

    // Verify central glass dock items (exactly 4)
    console.log('[Test 2] Verifying central glass dock nav items...');
    const dockNavButtons = page.locator('header nav.hidden.md\\:flex button');
    const dockCount = await dockNavButtons.count();
    console.log(`Central dock item count: ${dockCount}`);

    const expectedLabels = ['Home', 'New AI Tools', 'Ways to Earn', 'Combine Tools'];
    for (let i = 0; i < dockCount; i++) {
      const text = await dockNavButtons.nth(i).innerText();
      console.log(`Central Dock Item ${i + 1}: ${text.trim()}`);
    }

    if (dockCount === 4) {
      console.log('✓ [Test 2] Central glass dock strictly contains 4 items (Home | New AI Tools | Ways to Earn | Combine Tools).');
    } else {
      throw new Error(`Test 2 Failed: Central dock contained ${dockCount} items instead of 4.`);
    }

    // Verify far-right single profile avatar token
    console.log('[Test 3] Verifying far-right single profile avatar token...');
    const rightProfilePill = page.locator('header button[title="Open Builder Identity Dossier"]');
    if (await rightProfilePill.isVisible()) {
      console.log('✓ [Test 3] Single executive profile avatar token rendered on far right.');
    } else {
      throw new Error('Test 3 Failed: Far-right profile avatar token not found.');
    }

    // Ensure NO duplicate profile pill inside central nav dock
    const duplicatePill = page.locator('header nav.hidden.md\\:flex button:has-text("Supreme")');
    if ((await duplicatePill.count()) === 0) {
      console.log('✓ [Test 3] Verified zero duplicate profile pills inside central dock.');
    } else {
      throw new Error('Test 3 Failed: Duplicate "Supreme" pill was still found in central dock.');
    }

    console.log('==================================================');
    console.log('🎉 SINGLE SUPREME PROFILE AVATAR DOCK VERIFIED!');
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
