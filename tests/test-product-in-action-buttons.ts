import { chromium } from 'playwright';
import path from 'path';

async function run() {
  console.log('=== VERIFYING DEFAULT ACTIVE TAB IN PRODUCT IN ACTION ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    console.log('1. Navigating to http://localhost:3000 ...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const piaHeader = page.locator('h2:has-text("See how Opportunity OS works")');
    await piaHeader.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    // Verify initial active tab is "New AI Tools"
    const activeTabButton = page.locator('button.bg-peach-500:has-text("New AI Tools")');
    const isNewAiToolsActive = await activeTabButton.isVisible();
    console.log(`2. Initial active tab is "New AI Tools": ${isNewAiToolsActive ? 'YES' : 'NO'}`);

    // Verify preview card headline for "New AI Tools"
    const headlineText = await page.locator('section:has(h2:has-text("See how Opportunity OS works")) h3').first().textContent();
    console.log(`3. Initial preview headline: "${headlineText?.trim()}"`);

    // Verify tab switching still works across all 4 tabs
    const tabBar = page.locator('div:has(> button > span:has-text("New AI Tools"))').first();
    const demoTabButtons = tabBar.locator('button');
    const count = await demoTabButtons.count();

    for (let i = 0; i < count; i++) {
      const btn = demoTabButtons.nth(i);
      const text = await btn.textContent();
      console.log(`4. Testing tab click ${i + 1}: "${text?.trim()}" ...`);
      await btn.click();
      await page.waitForTimeout(300);

      const activeText = await page.locator('button.bg-peach-500').first().textContent();
      console.log(`   - Currently active tab: "${activeText?.trim()}"`);
    }

    const screenshotPath = path.join(process.cwd(), 'product_in_action_default_new_ai_tools.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`\n5. Screenshot saved to ${screenshotPath}`);

    if (isNewAiToolsActive) {
      console.log('\n✅ VERIFICATION PASSED: "New AI Tools" is the default active tab on initial load!');
    } else {
      console.error('\n❌ Default active tab verification failed!');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
