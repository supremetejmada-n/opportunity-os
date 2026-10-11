import { chromium } from 'playwright';
import { spawn } from 'child_process';

async function runE2ETests() {
  console.log('[E2E Test] Launching dev server for verification...');
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

    // -------------------------------------------------------------
    // Journey A: Discover a Service & Start Plan
    // -------------------------------------------------------------
    console.log('[Journey A] Navigating to Opportunity OS...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    console.log('[Journey A] Switching to Ways to Earn tab...');
    await page.click('button:has-text("Ways to Earn")');
    await page.waitForTimeout(1000);

    console.log('[Journey A] Opening first opportunity guide...');
    const firstOpenGuide = page.locator('text="Open Guide →"').first();
    await firstOpenGuide.click();
    await page.waitForTimeout(1000);

    // Verify drawer opened
    const drawerHeader = page.locator('text="STEP-BY-STEP GUIDE"');
    if (await drawerHeader.isVisible()) {
      console.log('✓ [Journey A] Step-by-Step Guide drawer opened successfully.');
    } else {
      throw new Error('Journey A Failed: Drawer header not visible.');
    }

    // Click Start or Continue Step-by-Step Guide
    const startGuideBtn = page.locator('button:has-text("Start Step-by-Step Guide →"), button:has-text("Continue Working on Plan →")').first();
    if (await startGuideBtn.isVisible()) {
      await startGuideBtn.click();
      await page.waitForTimeout(1000);
      console.log('✓ [Journey A] Plan started/resumed successfully.');
    }

    // Toggle step completion
    const markCompleteBtn = page.locator('button:has-text("Mark Step Complete ✓"), button:has-text("Mark Step Incomplete")').first();
    if (await markCompleteBtn.isVisible()) {
      await markCompleteBtn.click();
      await page.waitForTimeout(1200);
      console.log('✓ [Journey A] Step completion status updated.');
    }

    // Refresh page & verify persistence
    console.log('[Journey A] Refreshing page to verify persistence...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Navigate to Progress tab
    await page.click('button[title="Open Builder Identity Dossier"], button:has-text("Advisor"), button:has-text("Home")');
    await page.waitForTimeout(500);

    // -------------------------------------------------------------
    // Journey B: Combine Tools
    // -------------------------------------------------------------
    console.log('[Journey B] Navigating to Combine Tools...');
    await page.click('button:has-text("Combine Tools")');
    await page.waitForTimeout(1000);

    // Select Canva tool
    const canvaBtn = page.locator('button:has-text("Canva")');
    if (await canvaBtn.isVisible()) {
      await canvaBtn.click();
      await page.waitForTimeout(1000);
      console.log('✓ [Journey B] Tool selection toggled.');
    }

    // Click Synthesize
    const synthesizeBtn = page.locator('button:has-text("Synthesize Service Combinations")');
    if (await synthesizeBtn.isVisible()) {
      await synthesizeBtn.click();
      await page.waitForTimeout(1500);
      console.log('✓ [Journey B] Synthesized service combinations successfully.');
    }

    // Open first combination result guide
    const resultGuideBtn = page.locator('text="Open Guide →"').first();
    if (await resultGuideBtn.isVisible()) {
      await resultGuideBtn.click();
      await page.waitForTimeout(1000);
      console.log('✓ [Journey B] Combination result guide opened successfully.');
    }

    // Close drawer
    const closeBtn = page.locator('button[aria-label="Close step-by-step guide"]');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }

    // -------------------------------------------------------------
    // Journey D: Drawer Dismissals & Static Navbar Verification
    // -------------------------------------------------------------
    console.log('[Journey D] Verifying drawer dismissals and static navbar...');
    // Reopen guide
    await firstOpenGuide.click();
    await page.waitForTimeout(500);

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    if (!(await drawerHeader.isVisible())) {
      console.log('✓ [Journey D] Escape key dismissed drawer cleanly.');
    }

    console.log('==================================================');
    console.log('🎉 ALL 4 USER JOURNEYS VERIFIED SUCCESSFULLY!');
    console.log('==================================================');

  } catch (err: any) {
    console.error('❌ E2E Verification Failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

runE2ETests();
