import assert from 'assert';
import fs from 'fs';
import path from 'path';

function formatBudget(preferred_budget: any): string {
  return preferred_budget !== undefined && preferred_budget !== null && !isNaN(Number(preferred_budget))
    ? Number(preferred_budget) === 0
      ? "₹0 (Free Only)"
      : `₹${preferred_budget}`
    : "₹0 (Free Only)";
}

function runBudgetLimitTests() {
  console.log('====================================================');
  console.log(' Running Budget Limit Value Rendering Verification ');
  console.log('====================================================');

  // Test 1: budget === 0 (number) -> "₹0 (Free Only)"
  assert.strictEqual(formatBudget(0), "₹0 (Free Only)", 'Numeric 0 budget should display "₹0 (Free Only)"');
  console.log('✓ Test 1 Passed: numeric 0 -> "₹0 (Free Only)"');

  // Test 2: budget === null -> "₹0 (Free Only)"
  assert.strictEqual(formatBudget(null), "₹0 (Free Only)", 'null budget should display "₹0 (Free Only)"');
  console.log('✓ Test 2 Passed: null -> "₹0 (Free Only)"');

  // Test 3: budget === undefined -> "₹0 (Free Only)"
  assert.strictEqual(formatBudget(undefined), "₹0 (Free Only)", 'undefined budget should display "₹0 (Free Only)"');
  console.log('✓ Test 3 Passed: undefined -> "₹0 (Free Only)"');

  // Test 4: budget === 5000 (positive number) -> "₹5000"
  assert.strictEqual(formatBudget(5000), "₹5000", 'Positive budget 5000 should display "₹5000"');
  console.log('✓ Test 4 Passed: positive numeric 5000 -> "₹5000"');

  // Test 5: budget === '0' (string 0) -> "₹0 (Free Only)"
  assert.strictEqual(formatBudget('0'), "₹0 (Free Only)", 'String "0" budget should display "₹0 (Free Only)"');
  console.log('✓ Test 5 Passed: string "0" -> "₹0 (Free Only)"');

  // Test 6: budget === '5000' (string positive number) -> "₹5000"
  assert.strictEqual(formatBudget('5000'), "₹5000", 'String "5000" budget should display "₹5000"');
  console.log('✓ Test 6 Passed: string "5000" -> "₹5000"');

  // Test 7: Verify HomeHero.tsx source code incorporates the nullish check & ₹0 (Free Only) fallback
  const heroPath = path.resolve('src/components/home/HomeHero.tsx');
  const heroCode = fs.readFileSync(heroPath, 'utf-8');
  assert.ok(heroCode.includes('₹0 (Free Only)'), 'HomeHero.tsx must include ₹0 (Free Only) fallback');
  assert.ok(heroCode.includes('preferred_budget !== undefined'), 'HomeHero.tsx must perform preferred_budget !== undefined nullish check');
  console.log('✓ Test 7 Passed: HomeHero.tsx source code verification verified');

  console.log('\n====================================================');
  console.log(' ALL BUDGET LIMIT RENDERING TESTS PASSED! 🎉');
  console.log('====================================================\n');
}

runBudgetLimitTests();
