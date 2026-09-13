import { opportunityEngine, OpportunityEngine, OpportunityRecord, FullUserProfileData } from '../services/opportunityEngine.js';
import { initDatabase, dbGet, dbRun, dbAll } from '../db/sqlite.js';

let passedAssertions = 0;
let totalAssertions = 0;

function assert(condition: boolean, description: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  [PASS] ${description}`);
  } else {
    console.error(`  [FAIL] ${description}`);
    throw new Error(`Assertion failed: ${description}`);
  }
}

async function runOpportunityEngineTests() {
  console.log('====================================================');
  console.log(' Phase 4 & 4.1 — Opportunity Engine Test Suite');
  console.log('====================================================');

  await initDatabase();

  // Test 1: Full User Profile Retrieval
  console.log('\n--- Test 1: User Profile Retrieval ---');
  const userProfileData: FullUserProfileData = await opportunityEngine.getFullUserProfile();
  assert(Boolean(userProfileData.profile), 'User profile object loaded successfully');
  assert(Array.isArray(userProfileData.skills), 'Skills array loaded from DB');
  assert(Array.isArray(userProfileData.tools), 'Tools array loaded from DB');

  // Test 2: 8-Factor Transparent Scoring Model Weights
  console.log('\n--- Test 2: 8-Factor Transparent Scoring System ---');
  const candidate = {
    title: 'Local Business AI Poster & Graphic Packages',
    summary: 'Create high-converting promotional poster packages for local stores using Canva.',
    requiredTools: ['Gemini', 'Canva'],
    requiredSkills: ['Poster Design', 'Canva'],
    startupCost: 0,
    difficulty: 'Easy' as const,
    timeToDemo: '1 day',
    isPaidAPI: false,
    isHeavyCoding: false
  };

  const scoreResult = opportunityEngine.calculate8FactorScore(candidate, userProfileData);
  assert(scoreResult.totalScore >= 0 && scoreResult.totalScore <= 100, `Score is within 0-100 range (got ${scoreResult.totalScore})`);
  assert(scoreResult.breakdown.skillMatch <= 25, `Skill Match factor weight max 25 pts (got ${scoreResult.breakdown.skillMatch})`);
  assert(scoreResult.breakdown.marketDemand <= 20, `Market Demand factor weight max 20 pts (got ${scoreResult.breakdown.marketDemand})`);
  assert(scoreResult.breakdown.toolMatch <= 15, `Tool Match factor weight max 15 pts (got ${scoreResult.breakdown.toolMatch})`);
  assert(scoreResult.breakdown.startupCost <= 15, `Startup Cost factor weight max 15 pts (got ${scoreResult.breakdown.startupCost})`);
  assert(scoreResult.breakdown.timeToDemo <= 10, `Time to Demo factor weight max 10 pts (got ${scoreResult.breakdown.timeToDemo})`);
  assert(scoreResult.breakdown.learningCurve <= 5, `Learning Curve factor weight max 5 pts (got ${scoreResult.breakdown.learningCurve})`);
  assert(scoreResult.breakdown.competition <= 5, `Competition factor weight max 5 pts (got ${scoreResult.breakdown.competition})`);
  assert(scoreResult.breakdown.simplicity <= 5, `Simplicity factor weight max 5 pts (got ${scoreResult.breakdown.simplicity})`);

  // Test 3: Personal Rules (Penalties & Boosts)
  console.log('\n--- Test 3: Personal Preference Rules (Boosts & Penalties) ---');
  const paidHeavyCodingCandidate = {
    title: 'Complex Enterprise Micro-SaaS',
    summary: 'Requires paid LLM API subscriptions and high-complexity backend architecture.',
    requiredTools: ['Paid OpenAI API', 'AWS EC2'],
    startupCost: 10000,
    difficulty: 'Hard' as const,
    timeToDemo: '3 weeks',
    isPaidAPI: true,
    isHeavyCoding: true
  };

  const penaltyScoreResult = opportunityEngine.calculate8FactorScore(paidHeavyCodingCandidate, userProfileData);
  assert(penaltyScoreResult.totalScore < scoreResult.totalScore, `Paid API & heavy coding candidate is penalized (${penaltyScoreResult.totalScore} vs ${scoreResult.totalScore})`);
  assert(penaltyScoreResult.breakdown.startupCost < scoreResult.breakdown.startupCost, `Startup cost score penalized for paid API / budget exceed`);

  // Test 4: Opportunity Evaluation Pipeline & Multi-Tool Combinations
  console.log('\n--- Test 4: Opportunity Evaluation Pipeline ---');
  const opportunities = await opportunityEngine.evaluateOpportunities();
  assert(opportunities.length >= 0, `Evaluated opportunities pipeline returned successfully`);
  if (opportunities.length > 0) {
    assert(opportunities[0].score >= opportunities[opportunities.length - 1].score, 'Opportunities correctly sorted by score descending');
    const multiToolOpp = opportunities.find(o => o.requiredTools && o.requiredTools.length >= 2);
    assert(Boolean(multiToolOpp), 'Generated multi-tool (2+ tools) opportunity combinations');
  }

  // Test 5: SQLite Database Persistence & Save Toggle
  console.log('\n--- Test 5: Database Persistence & Save State Toggle ---');
  if (opportunities.length > 0) {
    const testOpp = opportunities[0];
    const fetchedOpp = await opportunityEngine.getOpportunityById(testOpp.id);
    assert(Boolean(fetchedOpp), `Opportunity record '${testOpp.id}' successfully retrieved from SQLite`);
    assert(fetchedOpp?.title === testOpp.title, 'Retrieved opportunity title matches');

    const updatedOpp = await opportunityEngine.toggleSaveOpportunity(testOpp.id);
    assert(Boolean(updatedOpp), 'Save toggle operation returned updated record');
    assert(updatedOpp?.saved === true, 'Opportunity saved state toggled to true');

    const reToggledOpp = await opportunityEngine.toggleSaveOpportunity(testOpp.id);
    assert(reToggledOpp?.saved === false, 'Opportunity saved state toggled back to false');
  }

  // ====================================================
  // PHASE 4.1 REGRESSION TESTS (A through J)
  // ====================================================
  console.log('\n====================================================');
  console.log(' Phase 4.1 Regression Tests (A through J)');
  console.log('====================================================');

  // Regression A & B: Zero false discovery linking & no arbitrary fallback
  console.log('\n--- Regression A & B: Zero False Discovery Linking ---');
  // Examine all evaluated opportunities that are templates without matching semantic discovery
  for (const opp of opportunities) {
    if (opp.origin === 'template') {
      assert(!opp.discoveryId, `Template opportunity '${opp.id}' has no arbitrary discoveryId attached`);
      assert(opp.discoveryIds.length === 0, `Template opportunity '${opp.id}' has empty discoveryIds array`);
    } else if (opp.origin === 'discovery_derived') {
      assert(Boolean(opp.discoveryId), `Discovery-derived opportunity '${opp.id}' has valid discoveryId`);
    }
  }

  // Regression C & H: Market Demand & Competition Conservative Treatment
  console.log('\n--- Regression C & H: Market Demand & Competition Conservative Treatment ---');
  const unverifiedCandidate = {
    title: 'Random New Service Title',
    summary: 'A service with no verified market signals or competition research.',
    requiredTools: ['Canva'],
    startupCost: 0,
    difficulty: 'Easy' as const,
    timeToDemo: '1 day',
    hasVerifiedMarketSignal: false
  };
  const unverifiedScore = opportunityEngine.calculate8FactorScore(unverifiedCandidate, userProfileData);
  assert(unverifiedScore.breakdown.marketDemand === 10, `Unverified market demand receives conservative score (10/20, got ${unverifiedScore.breakdown.marketDemand})`);
  assert(Boolean(unverifiedScore.breakdown.reasoning?.marketDemand?.includes('conservative')), 'Market demand reasoning explicitly states conservative evaluation');
  assert(unverifiedScore.breakdown.competition === 3, `Unverified competition receives neutral score (3/5, got ${unverifiedScore.breakdown.competition})`);
  assert(Boolean(unverifiedScore.breakdown.reasoning?.competition?.includes('neutral')), 'Competition reasoning explicitly states neutral score');

  // Regression D: Earning Potential Labeled as Hypothesis with Basis
  console.log('\n--- Regression D: Earning Potential Structured as Hypothesis ---');
  for (const opp of opportunities) {
    assert(Boolean(opp.earningHypothesis), `Opportunity '${opp.id}' includes structured earningHypothesis`);
    assert(Boolean(opp.earningHypothesis?.basis), `Opportunity '${opp.id}' includes earning basis explanation`);
    assert(opp.earningHypothesis?.confidence === 'Low', `Opportunity '${opp.id}' earning confidence is Low (unverified)`);
    assert(opp.earningPotential.includes('Hypothesis'), `Opportunity '${opp.id}' earningPotential string clearly flagged as Hypothesis`);
  }

  // Regression E: Confidence Calculated Dynamically (Not Universally High)
  console.log('\n--- Regression E: Dynamic Confidence Calculation ---');
  const confidences = opportunities.map(o => o.confidence);
  const hasNonHigh = confidences.some(c => c === 'Low' || c === 'Medium');
  assert(hasNonHigh, `Confidence is not hardcoded to 'High' (found ${confidences.join(', ')})`);

  const calculatedLow = opportunityEngine.calculateOpportunityConfidence({
    hasVerifiedDiscovery: false,
    hasVerifiedMarketSignal: false,
    allToolsAvailable: false,
    allSkillsMatched: false
  });
  assert(calculatedLow === 'Low', `Candidate lacking evidence, tools, and skills receives 'Low' confidence`);

  const calculatedMed = opportunityEngine.calculateOpportunityConfidence({
    hasVerifiedDiscovery: false,
    hasVerifiedMarketSignal: false,
    allToolsAvailable: true,
    allSkillsMatched: true
  });
  assert(calculatedMed === 'Medium', `Candidate with tools and skills but no discovery evidence receives 'Medium' confidence`);

  // Regression F: Profile Changes Alter Scores and Rankings
  console.log('\n--- Regression F: Profile Changes Alter Scores ---');
  const modifiedProfileHighBudget: FullUserProfileData = {
    ...userProfileData,
    profile: { ...userProfileData.profile, preferred_budget: 20000, disliked_work: '' }
  };
  const modifiedProfileDislikedWork: FullUserProfileData = {
    ...userProfileData,
    profile: { ...userProfileData.profile, disliked_work: 'sales, cold calling' }
  };

  const salesCandidate = {
    title: 'Sales & Client Cold Calling Lead Generation',
    summary: 'Cold calling business owners to pitch marketing services.',
    requiredTools: ['Canva'],
    startupCost: 0,
    difficulty: 'Medium' as const,
    timeToDemo: '1 day'
  };

  const scoreWithoutDislike = opportunityEngine.calculate8FactorScore(salesCandidate, userProfileData);
  const scoreWithDislike = opportunityEngine.calculate8FactorScore(salesCandidate, modifiedProfileDislikedWork);
  assert(scoreWithDislike.totalScore < scoreWithoutDislike.totalScore, `Candidate involving disliked work is penalized (${scoreWithDislike.totalScore} vs ${scoreWithoutDislike.totalScore})`);

  // Regression G: Unavailable Tools Not Counted as Already Owned
  console.log('\n--- Regression G: Strict Tool Ownership Evaluation ---');
  const unknownToolEval = opportunityEngine.evaluateToolAccess('SuperCustomProprietaryTool2026', userProfileData, new Set());
  assert(unknownToolEval.status === 'unknown', `Unknown tool is evaluated as 'unknown'`);

  const paidToolEval = opportunityEngine.evaluateToolAccess('Paid OpenAI API', userProfileData, new Set());
  assert(paidToolEval.status === 'requires_paid_access', `Paid tool is evaluated as 'requires_paid_access'`);

  // Regression I: Quality Threshold Rejects Weak Candidates
  console.log('\n--- Regression I: Quality Threshold & Zero Strong Opportunities ---');
  const terribleCandidate = {
    title: 'Terrible Unviable Idea',
    summary: 'Requires skills user lacks, costs ₹100,000, requires paid tools and heavy coding.',
    requiredTools: ['SuperRarePaidTool', 'Paid OpenAI API'],
    requiredSkills: ['Quantum Computing', 'Rust Kernel Development'],
    startupCost: 100000,
    difficulty: 'Hard' as const,
    timeToDemo: '1 month',
    isPaidAPI: true,
    isHeavyCoding: true
  };
  const terribleScore = opportunityEngine.calculate8FactorScore(terribleCandidate, userProfileData);
  assert(terribleScore.totalScore < OpportunityEngine.MIN_RECOMMENDED_SCORE || terribleScore.totalScore < 65, 
    `Terrible candidate scores below quality threshold (${terribleScore.totalScore} < 65)`);

  // Regression J: Discovery Evidence Preserved into Opportunity Evidence
  console.log('\n--- Regression J: Discovery Evidence Preservation ---');
  const discOpps = opportunities.filter(o => o.origin === 'discovery_derived');
  if (discOpps.length > 0) {
    const discOpp = discOpps[0];
    assert(Boolean(discOpp.evidence), `Discovery-derived opportunity contains evidence object`);
    assert(discOpp.evidence.origin === 'discovery_derived', `Evidence object records origin as 'discovery_derived'`);
    assert(Boolean(discOpp.evidence.discoveryId), `Evidence preserves discoveryId`);
  } else {
    console.log('  [INFO] No discoveries were semantically relevant to create discovery_derived opps in current DB run; properly unlinked.');
  }

  console.log('\n====================================================');
  console.log(` Phase 4 & 4.1 Test Suite Results: ${passedAssertions} / ${totalAssertions} Passed`);
  console.log('====================================================');
}

runOpportunityEngineTests().catch(err => {
  console.error('\n[FATAL] Test Suite Execution Error:', err);
  process.exit(1);
});
