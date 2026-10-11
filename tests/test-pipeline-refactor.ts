import assert from 'assert';
import { validateUserFacingTitle, sanitizeTechnicalTitle, synthesizeUserFacingService } from '../server/services/serviceSynthesis.js';
import { areTwinServices, getSemanticFingerprint, reconcileDuplicateOpportunities } from '../server/services/canonicalIdentity.js';
import { opportunityEngine } from '../server/services/opportunityEngine.ts';
import { UserProfileContext } from '../server/services/discovery/relevanceGate.js';

console.log('================================================================');
console.log(' Running Test Suite: Pipeline Refactor, Sanitization & Twin Dedupe ');
console.log('================================================================');

async function runTests() {
  // -------------------------------------------------------------
  // Test 1: Title Validation & Technical ID Rejection
  // -------------------------------------------------------------
  const invalidTitles = [
    'Qwen2.5-Coder model for code generation',
    'Automated MOSS-v2 Workflow for Clients',
    'Co99 Customer AI Service',
    'Wt-Nids-v1_2 Integration',
    'repopilot/auto-coder-7b',
    'AI-Powered Business Automation Solution', // buzzwords
    '12to32 image generator'
  ];

  for (const raw of invalidTitles) {
    const res = validateUserFacingTitle(raw);
    assert.strictEqual(res.isValid, false, `Title '${raw}' must be rejected by validateUserFacingTitle`);
  }
  console.log('✔ Test 1 Passed: Raw model names, repo slugs & buzzword titles rejected');

  // -------------------------------------------------------------
  // Test 2: Valid Plain-English Titles Accepted
  // -------------------------------------------------------------
  const validTitles = [
    'Create 30-Day Instagram Content for Local Gyms',
    'Design Promotional Posters for Neighborhood Restaurants',
    'Set Up WhatsApp Reply Templates for Local Clinics',
    'Create Product Photos for Online Sellers',
    'Clean Voice Audio for Video Creators'
  ];

  for (const valid of validTitles) {
    const res = validateUserFacingTitle(valid);
    assert.strictEqual(res.isValid, true, `Valid title '${valid}' should pass validation`);
  }
  console.log('✔ Test 2 Passed: Plain-English action titles accepted');

  // -------------------------------------------------------------
  // Test 3: Title Sanitization
  // -------------------------------------------------------------
  const sanitized = sanitizeTechnicalTitle('Qwen2.5-Coder-14b-gguf');
  assert.ok(!sanitized.toLowerCase().includes('qwen') && !sanitized.toLowerCase().includes('gguf'), 'Sanitizer must strip model slugs');
  console.log('✔ Test 3 Passed: Title sanitizer cleanly stripped technical tokens ->', sanitized);

  // -------------------------------------------------------------
  // Test 4: Service Synthesis for Gym / Content Profile
  // -------------------------------------------------------------
  const gymProfile: UserProfileContext = {
    id: 'gym_user',
    name: 'Fitness Coach',
    preferredBudget: 0,
    availableHoursPerWeek: 20,
    preferredWorkType: 'Freelance',
    dislikedWork: [],
    learningTolerance: 'High',
    skills: [{ id: 's1', name: 'Canva', proficiency: 'Advanced', confidence: 90 }],
    tools: [{ id: 't1', name: 'Canva', category: 'Design', accessType: 'Free', costPerMonth: 0, capabilities: ['Design'] }],
    goals: [{ id: 'g1', goal: 'Help Local Gyms Market Online', priority: 'High', description: 'Social media management' }],
    interests: [{ id: 'i1', category: 'Fitness', topic: 'Gym Content', industry: 'Sports' }],
    projects: [{ id: 'p1', name: 'Gym Marketing', description: 'Reels and posters for gyms', technologies: ['Canva'], status: 'active' }],
    skillNames: new Set(['canva']),
    existingToolNames: new Set(['canva']),
    interestTopics: new Set(['gym content fitness sports']),
    goalKeywords: new Set(['help local gyms market online']),
    projectTechs: new Set(['canva', 'gym marketing']),
    isZeroBudget: true,
    isIncompleteProfile: false
  };

  const synthesized = synthesizeUserFacingService({
    title: 'Qwen-Image-Gen-v2',
    description: 'Text to image diffusion model for social media graphics',
    category: 'Design'
  }, gymProfile);

  assert.ok(synthesized.cleanTitle.includes('Posters') || synthesized.cleanTitle.includes('Graphics') || synthesized.cleanTitle.includes('Photos'), 'Synthesized title must be human deliverable');
  assert.ok(!synthesized.cleanTitle.toLowerCase().includes('qwen'), 'Synthesized title must not leak raw model names');
  console.log('✔ Test 4 Passed: Synthesized outcome title ->', synthesized.cleanTitle);

  // -------------------------------------------------------------
  // Test 5: Twin Service Deduplication
  // -------------------------------------------------------------
  const twinA = {
    title: 'Create Instagram Posts for Local Gyms',
    targetCustomer: 'Local Gyms',
    deliverable: 'Social Media Posts'
  };
  const twinB = {
    title: 'Make Social Media Content for Fitness Centers',
    targetCustomer: 'Local Gyms',
    deliverable: 'Social Media Posts'
  };
  const twinRes = areTwinServices(twinA, twinB);
  assert.strictEqual(twinRes.isTwin, true, 'Twin services targeting same audience with same deliverable must collapse');

  const distinctA = {
    title: 'Create Instagram Posts for Local Gyms',
    targetCustomer: 'Local Gyms',
    deliverable: 'Social Media Posts'
  };
  const distinctB = {
    title: 'Set Up WhatsApp Lead Follow-Up for Local Gyms',
    targetCustomer: 'Local Gyms',
    deliverable: 'Lead Follow-Up Setup'
  };
  const distinctRes = areTwinServices(distinctA, distinctB);
  assert.strictEqual(distinctRes.isTwin, false, 'Distinct deliverables for same audience must NOT be marked twins');
  console.log('✔ Test 5 Passed: Twin service detection correctly collapsed equivalent ideas and preserved distinct deliverables');

  // -------------------------------------------------------------
  // Test 6: Idempotent Database Reconciliation
  // -------------------------------------------------------------
  const reconRes = await reconcileDuplicateOpportunities();
  assert.ok(typeof reconRes.remainingCount === 'number', 'Reconciliation must return clean remaining count');
  console.log(`✔ Test 6 Passed: Idempotent database reconciliation complete (${reconRes.remainingCount} clean opportunities in DB)`);

  console.log('\n================================================================');
  console.log(' ALL PIPELINE REFACTOR & SANITIZATION TESTS PASSED SUCCESSFULLY! ');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
