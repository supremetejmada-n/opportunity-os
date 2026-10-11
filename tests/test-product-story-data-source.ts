import { dbRun, dbGet, dbAll, initDatabase } from '../server/db/sqlite.js';
import { opportunityEngine } from '../server/services/opportunityEngine.js';
import { scanEngine } from '../server/services/scanEngine.js';
import assert from 'assert';

async function runProductStoryDataSourceTests() {
  console.log('====================================================');
  console.log(' Running Product Story Data Source Verification Tests');
  console.log('====================================================');

  await initDatabase();
  await dbRun('DELETE FROM opportunities WHERE id LIKE "opp-test-%" OR id LIKE "seed-opp-%";');
  await dbRun('DELETE FROM scan_records WHERE id LIKE "scan-test-%";');

  // Test 1: Querying latest scan when no scans have been run yet
  console.log('\n[Test 4] Testing no-scan state...');
  await dbRun('DELETE FROM scan_records;');
  const noScanResult = await opportunityEngine.getBestOpportunityFromLatestCompletedScan();
  assert.strictEqual(noScanResult.hasCompletedScan, false, 'hasCompletedScan must be false when no scan records exist');
  assert.strictEqual(noScanResult.bestOpportunity, null, 'bestOpportunity must be null when no scan records exist');
  console.log('✓ Passed - No-scan state correctly returned hasCompletedScan: false, bestOpportunity: null');

  // Test 2: Simulating a completed scan with opportunities
  console.log('\n[Test 1] Testing existing latest scan resolution...');
  const scanId1 = 'scan-test-001';
  const startedAt1 = '2026-10-06T10:00:00.000Z';
  const completedAt1 = '2026-10-06T10:01:00.000Z';

  await dbRun(
    `INSERT INTO scan_records (id, started_at, completed_at, status, sources_attempted, items_collected, opportunities_generated, created_at)
     VALUES (?, ?, ?, 'completed', 5, 10, 2, ?);`,
    [scanId1, startedAt1, completedAt1, startedAt1]
  );

  const oppId1 = 'opp-test-scan-001';
  await dbRun(
    `INSERT INTO opportunities (id, scan_id, title, summary, score, created_at, is_demo_data, origin, required_tools, time_to_demo, startup_cost)
     VALUES (?, ?, 'Custom AI Search Service', 'Build search micro-SaaS for local clients.', 88, ?, 0, 'discovery_derived', '["Python", "SQLite"]', '1 day', 0);`,
    [oppId1, scanId1, completedAt1]
  );

  const scan1Result = await opportunityEngine.getBestOpportunityFromLatestCompletedScan();
  assert.strictEqual(scan1Result.hasCompletedScan, true, 'hasCompletedScan must be true');
  assert.ok(scan1Result.bestOpportunity, 'bestOpportunity must not be null');
  assert.strictEqual(scan1Result.bestOpportunity?.id, oppId1, `bestOpportunity ID must be ${oppId1}`);
  assert.strictEqual(scan1Result.bestOpportunity?.title, 'Custom AI Search Service');
  console.log(`✓ Passed - Resolved opportunity "${scan1Result.bestOpportunity?.title}" (Score: ${scan1Result.bestOpportunity?.score}) from scan ${scanId1}`);

  // Test 3: New scan replaces old story
  console.log('\n[Test 2] Testing new scan replacing old story...');
  const scanId2 = 'scan-test-002';
  const startedAt2 = '2026-10-06T12:00:00.000Z';
  const completedAt2 = '2026-10-06T12:01:00.000Z';

  await dbRun(
    `INSERT INTO scan_records (id, started_at, completed_at, status, sources_attempted, items_collected, opportunities_generated, created_at)
     VALUES (?, ?, ?, 'completed', 5, 12, 3, ?);`,
    [scanId2, startedAt2, completedAt2, startedAt2]
  );

  const oppId2 = 'opp-test-scan-002';
  await dbRun(
    `INSERT INTO opportunities (id, scan_id, title, summary, score, created_at, is_demo_data, origin, required_tools, time_to_demo, startup_cost)
     VALUES (?, ?, 'Automated Customer Support Agent', 'Deploy n8n + Gemini support bots.', 94, ?, 0, 'discovery_derived', '["n8n", "Gemini API"]', '1-2 days', 0);`,
    [oppId2, scanId2, completedAt2]
  );

  const scan2Result = await opportunityEngine.getBestOpportunityFromLatestCompletedScan();
  assert.strictEqual(scan2Result.hasCompletedScan, true);
  assert.strictEqual(scan2Result.bestOpportunity?.id, oppId2, `Product Story must resolve new scan opportunity ${oppId2}`);
  assert.strictEqual(scan2Result.bestOpportunity?.title, 'Automated Customer Support Agent');
  console.log(`✓ Passed - Product Story updated to newest scan result: "${scan2Result.bestOpportunity?.title}" (Score: ${scan2Result.bestOpportunity?.score})`);

  // Test 4: Seed opportunity cannot override real scan
  console.log('\n[Test 3] Testing seed opportunity exclusion...');
  await dbRun(
    `INSERT INTO opportunities (id, title, score, is_demo_data, origin, created_at)
     VALUES ('seed-opp-fake-99', 'Fake Seed Opportunity with 99 Score', 99, 1, 'template', '2026-10-06T13:00:00.000Z');`
  );
  const scan3Result = await opportunityEngine.getBestOpportunityFromLatestCompletedScan();
  assert.notStrictEqual(scan3Result.bestOpportunity?.id, 'seed-opp-fake-99', 'Seed opportunity with is_demo_data=1 must never be selected');
  assert.strictEqual(scan3Result.bestOpportunity?.id, oppId2, 'Real scan opportunity must take precedence over seed data');
  console.log('✓ Passed - Seed data with is_demo_data=1 correctly ignored.');

  // Test 5: Scan completed with 0 eligible opportunities
  console.log('\n[Test 5] Testing scan with zero eligible opportunities...');
  const scanId3 = 'scan-test-003-empty';
  const startedAt3 = '2026-10-06T14:00:00.000Z';
  const completedAt3 = '2026-10-06T14:01:00.000Z';

  await dbRun(
    `INSERT INTO scan_records (id, started_at, completed_at, status, sources_attempted, items_collected, opportunities_generated, created_at)
     VALUES (?, ?, ?, 'completed', 5, 0, 0, ?);`,
    [scanId3, startedAt3, completedAt3, startedAt3]
  );

  // Insert low scoring opportunity (below threshold 65) for scan 3
  await dbRun(
    `INSERT INTO opportunities (id, scan_id, title, score, is_demo_data, origin, created_at)
     VALUES ('opp-low-score', ?, 'Low Score Unfit Idea', 40, 0, 'discovery_derived', ?);`,
    [scanId3, completedAt3]
  );

  const scanEmptyResult = await opportunityEngine.getBestOpportunityFromLatestCompletedScan();
  assert.strictEqual(scanEmptyResult.hasCompletedScan, true, 'hasCompletedScan must be true');
  assert.strictEqual(scanEmptyResult.bestOpportunity, null, 'bestOpportunity must be null when no opportunity meets score threshold (>=65)');
  console.log('✓ Passed - Scan producing zero eligible opportunities returns bestOpportunity: null cleanly.');

  // Clean up test records
  await dbRun('DELETE FROM opportunities WHERE id IN (?, ?, ?, ?);', [oppId1, oppId2, 'seed-opp-fake-99', 'opp-low-score']);
  await dbRun('DELETE FROM scan_records WHERE id IN (?, ?, ?);', [scanId1, scanId2, scanId3]);

  console.log('\n====================================================');
  console.log(' ALL 7 PRODUCT STORY DATA SOURCE TESTS PASSED! 🚀');
  console.log('====================================================\n');
}

runProductStoryDataSourceTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
