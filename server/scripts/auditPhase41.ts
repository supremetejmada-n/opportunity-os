import { opportunityEngine } from '../services/opportunityEngine.js';
import { initDatabase, dbAll } from '../db/sqlite.js';

async function auditPhase41() {
  await initDatabase();

  console.log('====================================================');
  console.log(' Phase 4.1 Opportunity Engine Live Audit');
  console.log('====================================================');

  const opps = await opportunityEngine.evaluateOpportunities();

  console.log(`\nTotal Recommended Opportunities: ${opps.length}`);

  let discoveryLinkedCount = 0;
  let templateCount = 0;
  let arbitraryLinkViolations = 0;
  let nonHypothesisEarningCount = 0;
  let marketDemandConservativeCount = 0;
  const confDist: Record<string, number> = { High: 0, Medium: 0, Low: 0 };

  for (const opp of opps) {
    confDist[opp.confidence] = (confDist[opp.confidence] || 0) + 1;

    if (opp.origin === 'discovery_derived') {
      discoveryLinkedCount++;
      if (!opp.discoveryId) arbitraryLinkViolations++;
    } else {
      templateCount++;
      if (opp.discoveryId || opp.discoveryIds.length > 0) {
        arbitraryLinkViolations++;
      }
    }

    if (!opp.earningPotential.includes('Hypothesis') || !opp.earningHypothesis?.basis) {
      nonHypothesisEarningCount++;
    }

    if (opp.scoreBreakdown.marketDemand <= 16) {
      marketDemandConservativeCount++;
    }

    console.log(`\n[Opportunity: ${opp.id}]`);
    console.log(`  - Title: ${opp.title}`);
    console.log(`  - Origin: ${opp.origin}`);
    console.log(`  - Score: ${opp.score}/100`);
    console.log(`  - Confidence: ${opp.confidence}`);
    console.log(`  - Earning Range: ${opp.earningHypothesis?.range}`);
    console.log(`  - Earning Basis: ${opp.earningHypothesis?.basis}`);
    console.log(`  - Market Demand Score: ${opp.scoreBreakdown.marketDemand}/20`);
    console.log(`  - Market Reasoning: ${opp.scoreBreakdown.reasoning?.marketDemand}`);
    console.log(`  - Discovery IDs: ${JSON.stringify(opp.discoveryIds)}`);
  }

  console.log('\n====================================================');
  console.log(' Audit Summary & Invariant Checks');
  console.log('====================================================');
  console.log(`  - Total Recommended: ${opps.length}`);
  console.log(`  - Discovery-Linked: ${discoveryLinkedCount}`);
  console.log(`  - Templates / Hypotheses: ${templateCount}`);
  console.log(`  - Arbitrary Link Violations (Must be 0): ${arbitraryLinkViolations}`);
  console.log(`  - Non-Hypothesis Earning Violations (Must be 0): ${nonHypothesisEarningCount}`);
  console.log(`  - Conservative Market Demand Records: ${marketDemandConservativeCount} / ${opps.length}`);
  console.log(`  - Confidence Distribution: High=${confDist.High || 0}, Medium=${confDist.Medium || 0}, Low=${confDist.Low || 0}`);
  console.log('====================================================');
}

auditPhase41().catch(console.error);
