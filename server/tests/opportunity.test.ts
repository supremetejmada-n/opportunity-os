import { opportunityEngine, OpportunityRecord, FullUserProfileData } from '../services/opportunityEngine.js';
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
  console.log(' Phase 4 — Opportunity Engine Test Suite');
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
  assert(opportunities.length > 0, `Evaluated at least 1 opportunity (got ${opportunities.length})`);
  assert(opportunities[0].score >= opportunities[opportunities.length - 1].score, 'Opportunities correctly sorted by score descending');

  // Verify multi-tool combination in evaluated records
  const multiToolOpp = opportunities.find(o => o.requiredTools && o.requiredTools.length >= 2);
  assert(Boolean(multiToolOpp), 'Generated multi-tool (2+ tools) opportunity combinations');

  // Test 5: SQLite Database Persistence & Save Toggle
  console.log('\n--- Test 5: Database Persistence & Save State Toggle ---');
  const testOpp = opportunities[0];
  const fetchedOpp = await opportunityEngine.getOpportunityById(testOpp.id);
  assert(Boolean(fetchedOpp), `Opportunity record '${testOpp.id}' successfully retrieved from SQLite`);
  assert(fetchedOpp?.title === testOpp.title, 'Retrieved opportunity title matches');

  const updatedOpp = await opportunityEngine.toggleSaveOpportunity(testOpp.id);
  assert(Boolean(updatedOpp), 'Save toggle operation returned updated record');
  assert(updatedOpp?.saved === true, 'Opportunity saved state toggled to true');

  const reToggledOpp = await opportunityEngine.toggleSaveOpportunity(testOpp.id);
  assert(reToggledOpp?.saved === false, 'Opportunity saved state toggled back to false');

  console.log('\n====================================================');
  console.log(` Phase 4 Test Suite Results: ${passedAssertions} / ${totalAssertions} Passed`);
  console.log('====================================================');
}

runOpportunityEngineTests().catch(err => {
  console.error('\n[FATAL] Test Suite Execution Error:', err);
  process.exit(1);
});
