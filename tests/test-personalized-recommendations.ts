import assert from 'assert';
import { evaluateProfileRelevance, UserProfileContext } from '../server/services/discovery/relevanceGate.js';
import { deduplicateDiscoveries } from '../server/services/discovery/deduplicator.js';
import { NormalizedDiscovery } from '../server/services/discovery/types.js';

console.log('===========================================================');
console.log(' Running Test Suite: Strictly Personalized AI Recommendations ');
console.log('===========================================================');

async function runTests() {
  // Mock Profile 1: Audio/Podcast Creator with zero budget
  const audioProfile: UserProfileContext = {
    id: 'test_audio_user',
    name: 'Audio Creator',
    preferredBudget: 0,
    availableHoursPerWeek: 15,
    preferredWorkType: 'Freelance',
    dislikedWork: ['cold calling', 'sales outreach'],
    learningTolerance: 'Medium',
    skills: [{ id: 's1', name: 'Podcast Editing', proficiency: 'Advanced', confidence: 90 }],
    tools: [{ id: 't1', name: 'Audacity', category: 'Audio', accessType: 'Free', costPerMonth: 0, capabilities: ['Audio Noise Removal'] }],
    goals: [{ id: 'g1', goal: 'Automate Podcast Noise Cleaning', priority: 'High', description: 'Clean background noise from audio clips' }],
    interests: [{ id: 'i1', category: 'Audio Engineering', topic: 'Noise Reduction', industry: 'Podcasting' }],
    projects: [{ id: 'p1', name: 'Weekly Tech Podcast', description: 'Automating noise reduction workflow', technologies: ['Audacity'], status: 'active' }],
    skillNames: new Set(['podcast editing']),
    existingToolNames: new Set(['audacity']),
    interestTopics: new Set(['noise reduction audio engineering podcasting']),
    goalKeywords: new Set(['automate podcast noise cleaning clean background noise from audio clips']),
    projectTechs: new Set(['audacity', 'weekly tech podcast']),
    isZeroBudget: true,
    isIncompleteProfile: false
  };

  // Mock Discovery Candidates
  const matchingAudioTool: NormalizedDiscovery = {
    id: 'disc_audio_cleaner_1',
    title: 'Deep Noise Reduction Audio Model',
    description: 'Open source AI model for automatic noise reduction in podcast audio clips using Audacity plugin.',
    url: 'https://github.com/example/audio-noise-cleaner',
    source: 'github',
    sourceId: '1001',
    type: 'ai_model',
    category: 'Audio',
    capabilities: ['Noise Reduction', 'Podcast Cleaning', 'Audacity Plugin'],
    author: 'AudioLab',
    license: 'MIT',
    pricingStatus: 'open_source_self_hostable',
    freeTier: true,
    openSource: true,
    openWeight: true,
    selfHostable: true,
    apiAvailable: false,
    localAvailable: true,
    firstDiscoveredAt: new Date().toISOString(),
    lastVerifiedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    evidence: [],
    confidence: 'High',
    verificationStatus: 'verified',
    relevanceScore: 95, // High popularity score
    isDemoData: false
  };

  const trendingUnrelatedTool: NormalizedDiscovery = {
    id: 'disc_crypto_bot_2',
    title: 'Trending AI Crypto Arbitrage Scanner',
    description: 'Highly popular trending AI trading bot for high-frequency crypto markets.',
    url: 'https://github.com/example/crypto-arbitrage-ai',
    source: 'github',
    sourceId: '1002',
    type: 'ai_tool',
    category: 'Finance',
    capabilities: ['Crypto Trading', 'High Frequency Arbitrage'],
    author: 'CryptoDev',
    license: 'MIT',
    pricingStatus: 'open_source_self_hostable',
    freeTier: true,
    openSource: true,
    openWeight: false,
    selfHostable: true,
    apiAvailable: true,
    localAvailable: true,
    firstDiscoveredAt: new Date().toISOString(),
    lastVerifiedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    evidence: [],
    confidence: 'High',
    verificationStatus: 'verified',
    relevanceScore: 99, // Extremely high trending score
    isDemoData: false
  };

  const paidOnlyTool: NormalizedDiscovery = {
    id: 'disc_paid_audio_suite_3',
    title: 'Enterprise Studio Audio Master Pro',
    description: 'Professional paid audio studio software costing $499/mo for noise reduction.',
    url: 'https://example.com/paid-audio-suite',
    source: 'web',
    sourceId: '1003',
    type: 'ai_tool',
    category: 'Audio',
    capabilities: ['Noise Reduction'],
    author: 'PaidAudioCorp',
    license: 'Proprietary',
    pricingStatus: 'paid_only',
    freeTier: false,
    openSource: false,
    openWeight: false,
    selfHostable: false,
    apiAvailable: false,
    localAvailable: false,
    firstDiscoveredAt: new Date().toISOString(),
    lastVerifiedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    evidence: [],
    confidence: 'High',
    verificationStatus: 'verified',
    relevanceScore: 90,
    isDemoData: false
  };

  const dislikedWorkTool: NormalizedDiscovery = {
    id: 'disc_sales_dialer_4',
    title: 'AI Cold Calling & Sales Outreach Bot',
    description: 'Automate podcast sponsor outreach with automated cold calling phone bot.',
    url: 'https://example.com/cold-calling-bot',
    source: 'web',
    sourceId: '1004',
    type: 'ai_tool',
    category: 'Sales',
    capabilities: ['Cold Calling', 'Sales Outreach'],
    author: 'SalesBotInc',
    license: 'Proprietary',
    pricingStatus: 'free_tier',
    freeTier: true,
    openSource: false,
    openWeight: false,
    selfHostable: false,
    apiAvailable: true,
    localAvailable: false,
    firstDiscoveredAt: new Date().toISOString(),
    lastVerifiedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    evidence: [],
    confidence: 'High',
    verificationStatus: 'verified',
    relevanceScore: 85,
    isDemoData: false
  };

  // -------------------------------------------------------------
  // Test 1: Tool matching saved interests & goals qualifies
  // -------------------------------------------------------------
  const evalMatch = evaluateProfileRelevance(matchingAudioTool, audioProfile);
  assert.strictEqual(evalMatch.passed, true, 'Matching audio tool must pass the relevance gate');
  assert.ok(evalMatch.score > 50, 'Matching tool must receive a solid relevance score');
  const lowerMatchExplain = (evalMatch.whyItMatchesYou || '').toLowerCase();
  assert.ok(lowerMatchExplain.includes('audacity') || lowerMatchExplain.includes('noise'), 'Explanation must reference actual match');
  console.log('✔ Test 1 Passed: Matching tool qualified with score', evalMatch.score);

  // -------------------------------------------------------------
  // Test 2: Unrelated trending tool fails relevance gate
  // -------------------------------------------------------------
  const evalUnrelated = evaluateProfileRelevance(trendingUnrelatedTool, audioProfile);
  assert.strictEqual(evalUnrelated.passed, false, 'Unrelated crypto tool must fail relevance gate even if trending/popular');
  assert.strictEqual(evalUnrelated.score, 0, 'Rejected tool score must be 0');
  console.log('✔ Test 2 Passed: Trending unrelated tool rejected despite high popularity');

  // -------------------------------------------------------------
  // Test 3: Zero-budget constraint rejects paid-only tools
  // -------------------------------------------------------------
  const evalPaid = evaluateProfileRelevance(paidOnlyTool, audioProfile);
  assert.strictEqual(evalPaid.passed, false, 'Paid-only tool must fail relevance gate when user budget is ₹0');
  console.log('✔ Test 3 Passed: Zero-budget constraint rejected paid-only tool');

  // -------------------------------------------------------------
  // Test 4: Disliked work constraint rejects sales outreach bot
  // -------------------------------------------------------------
  const evalDisliked = evaluateProfileRelevance(dislikedWorkTool, audioProfile);
  assert.strictEqual(evalDisliked.passed, false, 'Tool matching user disliked work must be rejected');
  console.log('✔ Test 4 Passed: Disliked work filter rejected cold calling bot');

  // -------------------------------------------------------------
  // Test 5: Incomplete profile does not invent personalization
  // -------------------------------------------------------------
  const emptyProfile: UserProfileContext = {
    id: 'empty_user',
    name: 'New User',
    preferredBudget: 0,
    availableHoursPerWeek: 20,
    preferredWorkType: 'Freelance',
    dislikedWork: [],
    learningTolerance: 'High',
    skills: [],
    tools: [],
    goals: [],
    interests: [],
    projects: [],
    skillNames: new Set(),
    existingToolNames: new Set(),
    interestTopics: new Set(),
    goalKeywords: new Set(),
    projectTechs: new Set(),
    isZeroBudget: true,
    isIncompleteProfile: true
  };
  const evalEmpty = evaluateProfileRelevance(matchingAudioTool, emptyProfile);
  assert.strictEqual(evalEmpty.passed, false, 'Incomplete profile must not pass arbitrary tools without saved data');
  console.log('✔ Test 5 Passed: Incomplete profile cleanly rejects candidates without inventing preference');

  // -------------------------------------------------------------
  // Test 6: Canonical deduplication handles URL & title duplicates
  // -------------------------------------------------------------
  const dup1: NormalizedDiscovery = { ...matchingAudioTool, id: 'dup1' };
  const dup2: NormalizedDiscovery = { ...matchingAudioTool, id: 'dup2', url: 'https://github.com/example/audio-noise-cleaner/' }; // trailing slash variant
  const dedupRes = await deduplicateDiscoveries([dup1, dup2]);
  assert.strictEqual(dedupRes.uniqueItems.length, 1, 'Duplicate URLs must be deduplicated into 1 canonical item');
  console.log('✔ Test 6 Passed: Canonical deduplication eliminated near-identical duplicate URLs');

  console.log('\n===========================================================');
  console.log(' ALL PERSONALIZED RECOMMENDATION TESTS PASSED SUCCESSFULLY! ');
  console.log('===========================================================');
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
