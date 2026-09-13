import { initDatabase, dbAll, dbGet } from '../db/sqlite.js';
import { discoveryEngine } from '../services/discovery/discoveryEngine.js';

async function audit() {
  console.log('====================================================');
  console.log(' [Phase 3.3 Database Audit & Regression Validator] ');
  console.log('====================================================\n');

  await initDatabase();

  const countRowBefore = await dbGet('SELECT COUNT(*) as cnt FROM discoveries;');
  const totalDbBefore = countRowBefore ? countRowBefore.cnt : 0;
  console.log(`Database Record Count BEFORE Re-Evaluation: ${totalDbBefore}`);

  // 1. Re-evaluate existing DB using production verifier
  console.log('\nRunning re-evaluation on all existing records...');
  const evalRes = await discoveryEngine.reevaluateExistingDatabase();
  console.log('Re-evaluation Metrics:', evalRes);

  // 2. Query total DB records after re-evaluation
  const countRowAfter = await dbGet('SELECT COUNT(*) as cnt FROM discoveries;');
  const totalDbAfter = countRowAfter ? countRowAfter.cnt : 0;
  console.log(`\nTotal Database Records AFTER Re-Evaluation: ${totalDbAfter}`);

  // Source breakdown
  const ghCount = (await dbGet("SELECT COUNT(*) as cnt FROM discoveries WHERE source = 'github';")).cnt;
  const hfCount = (await dbGet("SELECT COUNT(*) as cnt FROM discoveries WHERE source = 'huggingface';")).cnt;
  const rssCount = (await dbGet("SELECT COUNT(*) as cnt FROM discoveries WHERE source = 'rss';")).cnt;

  console.log(`\nSource Breakdown:`);
  console.log(`  - GitHub: ${ghCount}`);
  console.log(`  - Hugging Face: ${hfCount}`);
  console.log(`  - RSS / Web Feeds: ${rssCount}`);

  // Verification status breakdown
  const verifiedCount = (await dbGet("SELECT COUNT(*) as cnt FROM discoveries WHERE verification_status = 'verified';")).cnt;
  const partiallyVerifiedCount = (await dbGet("SELECT COUNT(*) as cnt FROM discoveries WHERE verification_status = 'partially_verified';")).cnt;
  const unverifiedCount = (await dbGet("SELECT COUNT(*) as cnt FROM discoveries WHERE verification_status = 'unverified';")).cnt;

  console.log(`\nVerification Status Breakdown:`);
  console.log(`  - Verified: ${verifiedCount}`);
  console.log(`  - Partially Verified: ${partiallyVerifiedCount}`);
  console.log(`  - Unverified: ${unverifiedCount}`);

  // Boolean flags count
  const osCount = (await dbGet("SELECT COUNT(*) as cnt FROM discoveries WHERE open_source = 1;")).cnt;
  const owCount = (await dbGet("SELECT COUNT(*) as cnt FROM discoveries WHERE open_weight = 1;")).cnt;
  const localCount = (await dbGet("SELECT COUNT(*) as cnt FROM discoveries WHERE local_available = 1;")).cnt;
  const selfHostCount = (await dbGet("SELECT COUNT(*) as cnt FROM discoveries WHERE self_hostable = 1;")).cnt;
  const apiCount = (await dbGet("SELECT COUNT(*) as cnt FROM discoveries WHERE api_available = 1;")).cnt;
  const freeTierCount = (await dbGet("SELECT COUNT(*) as cnt FROM discoveries WHERE free_tier = 1;")).cnt;

  console.log(`\nBoolean Flag Counts:`);
  console.log(`  - openSource = true: ${osCount}`);
  console.log(`  - openWeight = true: ${owCount}`);
  console.log(`  - localAvailable = true: ${localCount}`);
  console.log(`  - selfHostable = true: ${selfHostCount}`);
  console.log(`  - apiAvailable = true: ${apiCount}`);
  console.log(`  - freeTier = true: ${freeTierCount}`);

  // Section 18 Item 12 Check: Positive claims lacking matching evidence
  const allRows = await discoveryEngine.getDiscoveries();
  let unevidencedClaimsCount = 0;

  let regressionA = 0; // MIT + localAvailable=true but no local execution evidence
  let regressionB = 0; // MIT + selfHostable=true but no self-host evidence
  let regressionC = 0; // "pricing" in desc + free_tier but no explicit free-tier evidence
  let regressionD = 0; // HF recognized license + openWeight=true but no weight evidence
  let regressionE = 0; // HF recognized license + localAvailable=true but no local runtime evidence
  let regressionF = 0; // apiAvailable=true but no API evidence

  for (const item of allRows) {
    const claims = new Set((item.evidence || []).map(e => e.claim));

    if (item.openSource && !claims.has('License Verified')) unevidencedClaimsCount++;
    if (item.openWeight && !claims.has('Open Weights Verified')) unevidencedClaimsCount++;
    if (item.localAvailable && !claims.has('Local Execution Evidence')) unevidencedClaimsCount++;
    if (item.selfHostable && !claims.has('Self-Hosting Evidence')) unevidencedClaimsCount++;
    if (item.apiAvailable && !claims.has('API Availability Verified')) unevidencedClaimsCount++;
    if (item.freeTier && !claims.has('Free Tier Verified')) unevidencedClaimsCount++;

    // Regression checks
    if (item.source === 'github' && item.license.toLowerCase().includes('mit') && item.localAvailable && !claims.has('Local Execution Evidence')) {
      regressionA++;
    }
    if (item.source === 'github' && item.license.toLowerCase().includes('mit') && item.selfHostable && !claims.has('Self-Hosting Evidence')) {
      regressionB++;
    }
    if (item.description.toLowerCase().includes('pricing') && item.pricingStatus === 'free_tier' && !claims.has('Free Tier Verified')) {
      regressionC++;
    }
    if (item.source === 'huggingface' && item.openWeight && !claims.has('Open Weights Verified')) {
      regressionD++;
    }
    if (item.source === 'huggingface' && item.localAvailable && !claims.has('Local Execution Evidence')) {
      regressionE++;
    }
    if (item.apiAvailable && !claims.has('API Availability Verified')) {
      regressionF++;
    }
  }

  console.log(`\n====================================================`);
  console.log(` [Regression Audit Output] `);
  console.log(`====================================================`);
  console.log(`  - Positive claims without evidence count: ${unevidencedClaimsCount} (Must be 0)`);
  console.log(`  - Regression A (MIT -> localAvailable without evidence): ${regressionA} (Must be 0)`);
  console.log(`  - Regression B (MIT -> selfHostable without evidence): ${regressionB} (Must be 0)`);
  console.log(`  - Regression C ('pricing' -> free_tier without evidence): ${regressionC} (Must be 0)`);
  console.log(`  - Regression D (HF license -> openWeight without evidence): ${regressionD} (Must be 0)`);
  console.log(`  - Regression E (HF license -> localAvailable without evidence): ${regressionE} (Must be 0)`);
  console.log(`  - Regression F (apiAvailable without API evidence): ${regressionF} (Must be 0)`);
  console.log(`----------------------------------------------------\n`);

  if (
    unevidencedClaimsCount > 0 ||
    regressionA > 0 ||
    regressionB > 0 ||
    regressionC > 0 ||
    regressionD > 0 ||
    regressionE > 0 ||
    regressionF > 0
  ) {
    console.error('Audit failed: Regression queries returned non-zero counts!');
    process.exit(1);
  }

  // 3. Run fresh real live discovery scan
  console.log('Running fresh real discovery scan...');
  const scanSummary = await discoveryEngine.runScan();
  console.log('\nFresh Real Scan Summary:', JSON.stringify(scanSummary, null, 2));

  process.exit(0);
}

audit().catch(err => {
  console.error('Database audit failed:', err);
  process.exit(1);
});
