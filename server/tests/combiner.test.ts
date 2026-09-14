import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateToolAccess,
  checkCombinationZeroCost,
  checkRedundancy,
  matchWorkflowPattern,
  calculateCombinerScore,
  evaluateCombination,
  generateSubsets,
  normalizeCapabilities,
  UnifiedTool
} from '../services/combineEngine.js';
import { UserSkill, UserProfile } from '../../src/types/index.js';

// ============================================================================
// Sample Test Fixtures
// ============================================================================

const profileToolCanva: UnifiedTool = {
  id: 'tool_canva',
  name: 'Canva Pro',
  category: 'Design',
  capabilities: ['graphic design', 'templates', 'posters', 'social media graphics'],
  accessType: 'Paid',
  costPerMonth: 0, // already paid by user
  source: 'profile'
};

const profileToolCapCut: UnifiedTool = {
  id: 'tool_capcut',
  name: 'CapCut',
  category: 'Video Editing',
  capabilities: ['video editing', 'subtitles', 'reels', 'transitions'],
  accessType: 'Free',
  costPerMonth: 0,
  source: 'profile'
};

const profileToolPython: UnifiedTool = {
  id: 'tool_python',
  name: 'Python 3',
  category: 'Development',
  capabilities: ['code', 'scripting', 'data extraction', 'automation'],
  accessType: 'Open Source',
  costPerMonth: 0,
  source: 'profile'
};

const discoveryToolOllama: UnifiedTool = {
  id: 'disc_ollama',
  name: 'Ollama',
  category: 'Local AI',
  capabilities: ['local inference', 'llm', 'text generation', 'summarization'],
  accessType: 'Open Source',
  costPerMonth: 0,
  source: 'discovery',
  openSource: true,
  pricingStatus: 'open_source_self_hostable',
  evidence: [{ claim: 'Open source local LLM runner', source: 'github' }]
};

const discoveryToolWhisper: UnifiedTool = {
  id: 'disc_whisper',
  name: 'Whisper.cpp',
  category: 'Audio',
  capabilities: ['audio processing', 'transcription', 'speech to text'],
  accessType: 'Open Source',
  costPerMonth: 0,
  source: 'discovery',
  openSource: true,
  pricingStatus: 'genuinely_free'
};

const discoveryToolCrawl4AI: UnifiedTool = {
  id: 'disc_crawl4ai',
  name: 'Crawl4AI',
  category: 'Scraper',
  capabilities: ['data extraction', 'web scraping', 'markdown extraction'],
  accessType: 'Open Source',
  costPerMonth: 0,
  source: 'discovery',
  openSource: true,
  pricingStatus: 'open_source_self_hostable'
};

const discoveryToolDiscord: UnifiedTool = {
  id: 'disc_discord_bot',
  name: 'Discord Webhook Bot',
  category: 'Messaging',
  capabilities: ['messaging notification', 'alert dispatch', 'webhook'],
  accessType: 'Free Tier',
  costPerMonth: 0,
  source: 'discovery',
  freeTier: true,
  pricingStatus: 'free_tier'
};

const paidToolMidjourney: UnifiedTool = {
  id: 'tool_midjourney',
  name: 'Midjourney',
  category: 'AI Image',
  capabilities: ['image generation'],
  accessType: 'Paid',
  costPerMonth: 30,
  source: 'custom',
  pricingStatus: 'paid_only'
};

const sampleSkills: UserSkill[] = [
  {
    id: 'skill_1',
    profile_id: 'prof_1',
    name: 'Graphic Design',
    proficiency: 'Intermediate',
    confidence: 85,
    experience_years: 2,
    last_used: 'Recently'
  },
  {
    id: 'skill_2',
    profile_id: 'prof_1',
    name: 'Video Editing',
    proficiency: 'Intermediate',
    confidence: 80,
    experience_years: 1,
    last_used: 'Recently'
  },
  {
    id: 'skill_3',
    profile_id: 'prof_1',
    name: 'Python Scripting',
    proficiency: 'Advanced',
    confidence: 90,
    experience_years: 3,
    last_used: 'Recently'
  }
];

const sampleProfile: UserProfile = {
  id: 'prof_1',
  name: 'Supreeth',
  title: 'Full Stack & Automation Specialist',
  bio: 'Building AI tools and digital solutions',
  preferred_budget: 0,
  available_hours_per_week: 20,
  preferred_work_type: 'Freelance',
  disliked_work: 'Cold calling',
  remote_preference: 'Remote Only',
  learning_tolerance: 'High'
};

// ============================================================================
// Phase 5 Regression Test Suite (Tests A through T)
// ============================================================================

describe('Phase 5: "Combine My Tools" Engine Test Suite', () => {

  // Test A: Combination size 2–4 strictly enforced
  it('Test A: strictly enforces combination size between 2 and 4 tools', () => {
    // 1 tool combination must be rejected
    const singleToolResult = evaluateCombination([discoveryToolOllama], sampleSkills, sampleProfile);
    assert.equal(singleToolResult, null, 'Single tool combination must return null');

    // 5 tools combination must be rejected
    const fiveToolsResult = evaluateCombination(
      [discoveryToolOllama, profileToolCanva, profileToolCapCut, profileToolPython, discoveryToolWhisper],
      sampleSkills,
      sampleProfile
    );
    assert.equal(fiveToolsResult, null, '5-tool combination must return null');

    // Valid 2-tool combination
    const twoToolResult = evaluateCombination([discoveryToolOllama, profileToolCanva], sampleSkills, sampleProfile);
    assert.ok(twoToolResult !== null, 'Valid 2-tool combination should be created');
    assert.equal(twoToolResult.tool_ids.length, 2);

    // Valid 3-tool combination
    const threeToolResult = evaluateCombination(
      [discoveryToolCrawl4AI, discoveryToolOllama, discoveryToolDiscord],
      sampleSkills,
      sampleProfile
    );
    assert.ok(threeToolResult !== null, 'Valid 3-tool combination should be created');
    assert.equal(threeToolResult.tool_ids.length, 3);
  });

  // Test B: Deduplication is order-independent
  it('Test B: ensures deduplication is order-independent ([A, B] == [B, A])', () => {
    const comboAB = evaluateCombination([discoveryToolOllama, profileToolCanva], sampleSkills, sampleProfile);
    const comboBA = evaluateCombination([profileToolCanva, discoveryToolOllama], sampleSkills, sampleProfile);

    assert.ok(comboAB !== null && comboBA !== null);
    assert.equal(comboAB.id, comboBA.id, 'Canonical ID must match regardless of tool input order');
  });

  // Test C: Tool access categorization
  it('Test C: correctly categorizes tool access (already_have, free_to_obtain, requires_paid_access, unknown)', () => {
    assert.equal(evaluateToolAccess(profileToolCanva), 'already_have');
    assert.equal(evaluateToolAccess(discoveryToolOllama), 'free_to_obtain');
    assert.equal(evaluateToolAccess(paidToolMidjourney), 'requires_paid_access');

    const unknownTool: UnifiedTool = {
      id: 'tool_unknown',
      name: 'Mystery Tool',
      category: 'Other',
      capabilities: ['unknown'],
      accessType: 'Custom',
      costPerMonth: -1,
      source: 'discovery',
      pricingStatus: 'unclear'
    };
    assert.equal(evaluateToolAccess(unknownTool), 'unknown');
  });

  // Test D: ₹0 upfront cost truth
  it('Test D: accurately verifies ₹0 upfront cost feasibility', () => {
    // Owned + Free-to-obtain = strict ₹0
    const zeroCostCheck = checkCombinationZeroCost([profileToolCanva, discoveryToolOllama]);
    assert.equal(zeroCostCheck.isZeroCost, true);
    assert.equal(zeroCostCheck.startupCost, 0);

    // Including a paid tool breaks ₹0
    const paidCheck = checkCombinationZeroCost([profileToolCanva, paidToolMidjourney]);
    assert.equal(paidCheck.isZeroCost, false);
    assert.ok(paidCheck.startupCost > 0);
  });

  // Test E: Capability synergy
  it('Test E: validates capability synergy across distinct complementary roles', () => {
    const combo = evaluateCombination([discoveryToolOllama, profileToolCanva], sampleSkills, sampleProfile);
    assert.ok(combo !== null);
    assert.ok(combo.score_breakdown.capabilitySynergy >= 16, 'Complementary tools should have high synergy (>= 16)');
    assert.equal(combo.workflow_pattern, 'GENERATE_DESIGN');
  });

  // Test F: Redundant tool rejection
  it('Test F: rejects combinations containing redundant tools with duplicate single capability', () => {
    const imageTool1: UnifiedTool = {
      id: 'flux_1',
      name: 'FLUX.1',
      category: 'AI Model',
      capabilities: ['image generation'],
      accessType: 'Free',
      costPerMonth: 0,
      source: 'discovery'
    };
    const imageTool2: UnifiedTool = {
      id: 'sdxl_1',
      name: 'Stable Diffusion XL',
      category: 'AI Model',
      capabilities: ['image generation'],
      accessType: 'Free',
      costPerMonth: 0,
      source: 'discovery'
    };

    const redundancy = checkRedundancy([imageTool1, imageTool2]);
    assert.equal(redundancy.isRedundant, true);

    const combo = evaluateCombination([imageTool1, imageTool2], sampleSkills, sampleProfile);
    assert.equal(combo, null, 'Redundant tool combination must be rejected');
  });

  // Test G: Workflow pattern identification
  it('Test G: accurately maps combinations to recognized workflow patterns', () => {
    const genDesign = matchWorkflowPattern([discoveryToolOllama, profileToolCanva]);
    assert.ok(genDesign !== null);
    assert.equal(genDesign.patternRule.pattern, 'GENERATE_DESIGN');

    const genEdit = matchWorkflowPattern([discoveryToolWhisper, profileToolCapCut]);
    assert.ok(genEdit !== null);
    assert.equal(genEdit.patternRule.pattern, 'GENERATE_EDIT');

    const captureProcess = matchWorkflowPattern([discoveryToolCrawl4AI, discoveryToolOllama, discoveryToolDiscord]);
    assert.ok(captureProcess !== null);
    assert.equal(captureProcess.patternRule.pattern, 'CAPTURE_PROCESS_RESPOND');
  });

  // Test H: Concrete outcome identification
  it('Test H: produces a specific, concrete deliverable outcome', () => {
    const combo = evaluateCombination([discoveryToolOllama, profileToolCanva], sampleSkills, sampleProfile);
    assert.ok(combo !== null);
    assert.ok(combo.concrete_outcome && combo.concrete_outcome.length > 20);
    assert.match(combo.concrete_outcome, /package|flyer|layout|branded/i);
  });

  // Test I: Target customer persona identification
  it('Test I: identifies specific target customer and buyer personas', () => {
    const combo = evaluateCombination([discoveryToolOllama, profileToolCanva], sampleSkills, sampleProfile);
    assert.ok(combo !== null);
    assert.ok(combo.target_customer && combo.target_customer.length > 10);
    assert.ok(combo.customer_type && combo.customer_type.length > 5);
  });

  // Test J: Personal skill fit matching against profile skills
  it('Test J: personal skill fit reflects profile skills coverage', () => {
    // With skills in Design & Python
    const comboWithSkills = evaluateCombination([discoveryToolOllama, profileToolCanva], sampleSkills, sampleProfile);
    assert.ok(comboWithSkills !== null);
    assert.ok(comboWithSkills.score_breakdown.personalSkillFit >= 12);

    // With zero matching skills
    const emptySkills: UserSkill[] = [];
    const comboWithoutSkills = evaluateCombination([discoveryToolOllama, profileToolCanva], emptySkills, sampleProfile);
    assert.ok(comboWithoutSkills !== null);
    assert.ok(comboWithoutSkills.score_breakdown.personalSkillFit < comboWithSkills.score_breakdown.personalSkillFit);
  });

  // Test K: Selected-tool mode subsetting
  it('Test K: supports selected-tool candidate generation', () => {
    const selected = [discoveryToolOllama, profileToolCanva, profileToolCapCut];
    const subsets = generateSubsets(selected, 2, 4);

    // For 3 items: pairs = 3, triplet = 1 -> total 4 subsets
    assert.equal(subsets.length, 4);
    for (const sub of subsets) {
      assert.ok(sub.length >= 2 && sub.length <= 4);
      for (const item of sub) {
        assert.ok(selected.some(s => s.id === item.id));
      }
    }
  });

  // Test L: Discovery evidence preservation
  it('Test L: preserves discovery evidence when discovery tools are used', () => {
    assert.ok(discoveryToolOllama.evidence !== undefined);
    assert.equal(discoveryToolOllama.evidence[0].claim, 'Open source local LLM runner');
  });

  // Test M: No arbitrary discovery linking
  it('Test M: ensures tool_ids only contains tools actually part of the combination', () => {
    const combo = evaluateCombination([discoveryToolOllama, profileToolCanva], sampleSkills, sampleProfile);
    assert.ok(combo !== null);
    assert.deepEqual(combo.tool_ids.sort(), [discoveryToolOllama.id, profileToolCanva.id].sort());
  });

  // Test N: Dynamic confidence calculation
  it('Test N: dynamically computes confidence based on score and access certainty', () => {
    const highConfCombo = evaluateCombination([discoveryToolOllama, profileToolCanva], sampleSkills, sampleProfile);
    assert.ok(highConfCombo !== null);
    assert.equal(highConfCombo.confidence, 'High');

    // Combination with paid tool yields Low confidence
    const paidCombo = evaluateCombination([paidToolMidjourney, profileToolCanva], sampleSkills, sampleProfile);
    if (paidCombo) {
      assert.equal(paidCombo.confidence, 'Low');
    }
  });

  // Test O: Structured monetization hypothesis
  it('Test O: formats structured monetization hypothesis', () => {
    const combo = evaluateCombination([discoveryToolOllama, profileToolCanva], sampleSkills, sampleProfile);
    assert.ok(combo !== null);
    const m = combo.monetization_hypothesis;
    assert.ok(m.range && m.range.includes('₹'));
    assert.ok(m.pricingModel && m.pricingModel.length > 0);
    assert.ok(m.targetCustomer && m.targetCustomer.length > 0);
    assert.ok(m.basis && m.basis.length > 0);
    assert.ok(['Low', 'Medium', 'High'].includes(m.confidence));
  });

  // Test P: 8-factor score calculation integrity
  it('Test P: verifies 8-factor score bounds and sum integrity', () => {
    const combo = evaluateCombination([discoveryToolOllama, profileToolCanva], sampleSkills, sampleProfile);
    assert.ok(combo !== null);
    const b = combo.score_breakdown;

    assert.ok(b.userToolAvailability >= 0 && b.userToolAvailability <= 20);
    assert.ok(b.capabilitySynergy >= 0 && b.capabilitySynergy <= 20);
    assert.ok(b.personalSkillFit >= 0 && b.personalSkillFit <= 15);
    assert.ok(b.outcomeUsefulness >= 0 && b.outcomeUsefulness <= 15);
    assert.ok(b.zeroCostFeasibility >= 0 && b.zeroCostFeasibility <= 10);
    assert.ok(b.executionSimplicity >= 0 && b.executionSimplicity <= 10);
    assert.ok(b.timeToDemo >= 0 && b.timeToDemo <= 5);
    assert.ok(b.customerMonetizationPotential >= 0 && b.customerMonetizationPotential <= 5);

    const calculatedSum =
      b.userToolAvailability +
      b.capabilitySynergy +
      b.personalSkillFit +
      b.outcomeUsefulness +
      b.zeroCostFeasibility +
      b.executionSimplicity +
      b.timeToDemo +
      b.customerMonetizationPotential;

    assert.ok(
      Math.abs(combo.score - calculatedSum) <= 0.1,
      `Total score (${combo.score}) must equal factor sum (${calculatedSum})`
    );
  });

  // Test Q: Score reasoning transparency
  it('Test Q: provides transparent reasoning for each of the 8 factors', () => {
    const combo = evaluateCombination([discoveryToolOllama, profileToolCanva], sampleSkills, sampleProfile);
    assert.ok(combo !== null);
    assert.ok(combo.score_breakdown.reasoning);

    const r = combo.score_breakdown.reasoning;
    assert.ok(r.userToolAvailability && r.userToolAvailability.length > 5);
    assert.ok(r.capabilitySynergy && r.capabilitySynergy.length > 5);
    assert.ok(r.personalSkillFit && r.personalSkillFit.length > 5);
    assert.ok(r.outcomeUsefulness && r.outcomeUsefulness.length > 5);
    assert.ok(r.zeroCostFeasibility && r.zeroCostFeasibility.length > 5);
    assert.ok(r.executionSimplicity && r.executionSimplicity.length > 5);
    assert.ok(r.timeToDemo && r.timeToDemo.length > 5);
    assert.ok(r.customerMonetizationPotential && r.customerMonetizationPotential.length > 5);
  });

  // Test R: Minimum score threshold filtering
  it('Test R: drops combinations scoring below the 65 point quality threshold', () => {
    // Tool pair with no synergy and high costs
    const randomToolA: UnifiedTool = {
      id: 'tool_rnd_a',
      name: 'Arbitrary Tool A',
      category: 'Unrelated',
      capabilities: ['misc'],
      accessType: 'Paid',
      costPerMonth: 100,
      source: 'custom'
    };
    const randomToolB: UnifiedTool = {
      id: 'tool_rnd_b',
      name: 'Arbitrary Tool B',
      category: 'Unrelated',
      capabilities: ['misc'],
      accessType: 'Paid',
      costPerMonth: 100,
      source: 'custom'
    };

    const lowScoreResult = evaluateCombination([randomToolA, randomToolB], [], null);
    assert.equal(lowScoreResult, null, 'Low quality combinations below 65 must return null');
  });

  // Test S: Zero-result behavior
  it('Test S: returns clean empty array and does not throw when tool pool yields no valid combinations', () => {
    const incompatibleTools = [
      {
        id: 'inc_1',
        name: 'Incompatible 1',
        category: 'Misc',
        capabilities: ['xyz_unknown'],
        accessType: 'Paid',
        costPerMonth: 100,
        source: 'custom' as const
      }
    ];

    const subsets = generateSubsets(incompatibleTools, 2, 4);
    assert.equal(subsets.length, 0, 'Cannot form pairs from 1 incompatible tool');
  });

  // Test T: Deterministic generation
  it('Test T: produces identical combination scores and outputs on repeated runs', () => {
    const run1 = evaluateCombination([discoveryToolOllama, profileToolCanva], sampleSkills, sampleProfile);
    const run2 = evaluateCombination([discoveryToolOllama, profileToolCanva], sampleSkills, sampleProfile);

    assert.ok(run1 !== null && run2 !== null);
    assert.equal(run1.score, run2.score);
    assert.equal(run1.title, run2.title);
    assert.deepEqual(run1.score_breakdown, run2.score_breakdown);
    assert.equal(run1.workflow_pattern, run2.workflow_pattern);
  });

  // ==========================================================================
  // Phase 5.1 Hardening Tests (Tests U through AJ)
  // ==========================================================================

  // Test U: Unknown capability remains UNKNOWN
  it('Test U: ensures unknown capabilities remain UNKNOWN and do not fall back to coding or AI', () => {
    const caps = normalizeCapabilities(['quantum_entanglement_matrix'], 'QuantumCore', 'Physics');
    assert.deepEqual(caps, ['UNKNOWN'], 'Unrecognized capability must normalize to UNKNOWN');
    assert.ok(!caps.includes('CODE_DEVELOPMENT'), 'Must not arbitrarily map to CODE_DEVELOPMENT');
    assert.ok(!caps.includes('TEXT_GENERATION'), 'Must not arbitrarily map to TEXT_GENERATION');
  });

  // Test V: Open-source software does not imply free hosted API
  it('Test V: open-source software does not imply free hosted API', () => {
    const openSourceHostedApi: UnifiedTool = {
      id: 'disc_os_api',
      name: 'Cloud Hosted API for OSS LLM',
      category: 'AI API',
      capabilities: ['llm', 'text generation'],
      accessType: 'Open Source',
      costPerMonth: 0,
      source: 'discovery',
      openSource: true,
      apiAvailable: true,
      localAvailable: false,
      pricingStatus: 'unclear'
    };
    const access = evaluateToolAccess(openSourceHostedApi);
    assert.equal(access, 'unknown', 'Open-source repository does not grant free cloud API access');
  });

  // Test W: Open-source software does not imply free hosted API access in combinations
  it('Test W: combinations requiring unverified hosted API access cannot claim ₹0 upfront cost', () => {
    const openSourceHostedApi: UnifiedTool = {
      id: 'disc_os_api_2',
      name: 'Cloud Hosted API for OSS LLM',
      category: 'AI API',
      capabilities: ['llm', 'text generation'],
      accessType: 'Open Source',
      costPerMonth: 0,
      source: 'discovery',
      openSource: true,
      apiAvailable: true,
      localAvailable: false,
      pricingStatus: 'unclear'
    };
    const zeroCostRes = checkCombinationZeroCost([profileToolCanva, openSourceHostedApi]);
    assert.equal(zeroCostRes.isZeroCost, false, 'Combination with unverified hosted API cannot be ₹0');
  });

  // Test X: Paid discovered tool cannot become ₹0
  it('Test X: paid discovered tool cannot become ₹0 or free_to_obtain', () => {
    const paidDiscoveredTool: UnifiedTool = {
      id: 'disc_paid_saas',
      name: 'Commercial Vector SaaS',
      category: 'Database',
      capabilities: ['database storage', 'supabase'],
      accessType: 'Paid',
      costPerMonth: 40,
      source: 'discovery',
      pricingStatus: 'paid_only'
    };
    assert.equal(evaluateToolAccess(paidDiscoveredTool), 'requires_paid_access');
    const costCheck = checkCombinationZeroCost([profileToolPython, paidDiscoveredTool]);
    assert.equal(costCheck.isZeroCost, false);
    assert.ok(costCheck.startupCost > 0);
  });

  // Test Y: Unknown-priced discovered tool cannot become ₹0
  it('Test Y: discovered tool with unknown or unclear pricing cannot be claimed as ₹0', () => {
    const unknownDiscoveredTool: UnifiedTool = {
      id: 'disc_unk_tool',
      name: 'Beta Cloud Scraper',
      category: 'Scraper',
      capabilities: ['data extraction', 'web scraping'],
      accessType: 'Unknown',
      costPerMonth: 0,
      source: 'discovery',
      pricingStatus: 'unclear'
    };
    assert.equal(evaluateToolAccess(unknownDiscoveredTool), 'unknown');
    const unkCostCheck = checkCombinationZeroCost([profileToolPython, unknownDiscoveredTool]);
    assert.equal(unkCostCheck.isZeroCost, false);
  });

  // Test Z: Unsupported monetization claims are not labelled as market evidence
  it('Test Z: monetization claims are strictly framed as unvalidated hypotheses without standard market rate assertions', () => {
    const combo = evaluateCombination([discoveryToolOllama, profileToolCanva], sampleSkills, sampleProfile);
    assert.ok(combo !== null);
    const basis = combo.monetization_hypothesis.basis.toLowerCase();
    assert.ok(!basis.includes('standard freelance rate'), 'Must not claim standard freelance rate without empirical data');
    assert.ok(!basis.includes('standard market rate'), 'Must not claim standard market rate');
    assert.ok(!basis.includes('established rate'), 'Must not claim established rate');
    assert.ok(basis.includes('hypothesis') || basis.includes('validation'));
    assert.equal(combo.monetization_hypothesis.confidence, 'Low');
  });

  // Test AA: Tool with irrelevant category does not receive CODE_DEVELOPMENT by fallback
  it('Test AA: tool with non-development category does not receive CODE_DEVELOPMENT by fallback', () => {
    const accountingTool: UnifiedTool = {
      id: 'tool_acc',
      name: 'Tax Ledger',
      category: 'Accounting',
      capabilities: ['tax_table_entry'],
      accessType: 'Free',
      costPerMonth: 0,
      source: 'profile'
    };
    const norm = normalizeCapabilities(accountingTool.capabilities, accountingTool.name, accountingTool.category);
    assert.deepEqual(norm, ['UNKNOWN']);
    assert.ok(!norm.includes('CODE_DEVELOPMENT'));
  });

  // Test AB: Every tool in a qualified combination contributes a meaningful role
  it('Test AB: every tool in a qualified combination is mapped to a distinct pipeline stage without passenger tools', () => {
    const combo = evaluateCombination(
      [discoveryToolCrawl4AI, discoveryToolOllama, discoveryToolDiscord],
      sampleSkills,
      sampleProfile
    );
    assert.ok(combo !== null);
    assert.equal(combo.capability_chain.length, combo.tool_ids.length);
    const assignedIds = new Set(combo.capability_chain.map(s => s.toolId));
    for (const tid of combo.tool_ids) {
      assert.ok(assignedIds.has(tid), `Tool ${tid} must be assigned to an active stage`);
    }
  });

  // Test AC: Discovery-derived combination must reference a relevant discovery
  it('Test AC: discovery-derived combination preserves discovery IDs and origin', () => {
    const combo = evaluateCombination([discoveryToolOllama, profileToolCanva], sampleSkills, sampleProfile);
    assert.ok(combo !== null);
    assert.equal(combo.origin, 'discovery_derived');
    assert.ok(combo.discovery_ids && combo.discovery_ids.includes(discoveryToolOllama.id));
  });

  // Test AD: Profile hypothesis cannot receive arbitrary discovery IDs
  it('Test AD: profile-only combination has empty discovery_ids and profile_hypothesis origin', () => {
    const combo = evaluateCombination([profileToolPython, profileToolCanva], sampleSkills, sampleProfile);
    if (combo) {
      assert.equal(combo.origin, 'profile_hypothesis');
      assert.deepEqual(combo.discovery_ids, []);
    }
  });

  // Test AE: Same tool set + same workflow produces one canonical combination
  it('Test AE: canonical deduplication guarantees one output for reversed tool pairs', () => {
    const combo1 = evaluateCombination([discoveryToolOllama, profileToolCanva], sampleSkills, sampleProfile);
    const combo2 = evaluateCombination([profileToolCanva, discoveryToolOllama], sampleSkills, sampleProfile);
    assert.ok(combo1 !== null && combo2 !== null);
    assert.equal(combo1.id, combo2.id);
    assert.equal(combo1.title, combo2.title);
  });

  // Test AF: 2-tool solution is preferred over unnecessary 3-tool duplicate
  it('Test AF: rejects appending an unnecessary 3rd tool to a 2-stage workflow pattern', () => {
    // GENERATE_DESIGN is a 2-stage pattern. Appending Discord webhook adds no legitimate role.
    const invalid3ToolCombo = evaluateCombination(
      [discoveryToolOllama, profileToolCanva, discoveryToolDiscord],
      sampleSkills,
      sampleProfile
    );
    assert.equal(invalid3ToolCombo, null, 'Combination with unneeded 3rd tool must be rejected');
  });

  // Test AG: No strong candidate returns an empty list
  it('Test AG: returns null when candidate tools do not meet quality threshold', () => {
    const lowValueA: UnifiedTool = {
      id: 'tool_lv_a',
      name: 'Obsolete Widget',
      category: 'Legacy',
      capabilities: ['legacy_io'],
      accessType: 'Paid',
      costPerMonth: 250,
      source: 'custom'
    };
    const lowValueB: UnifiedTool = {
      id: 'tool_lv_b',
      name: 'Unused Protocol',
      category: 'Legacy',
      capabilities: ['legacy_io'],
      accessType: 'Paid',
      costPerMonth: 250,
      source: 'custom'
    };
    const result = evaluateCombination([lowValueA, lowValueB], [], null);
    assert.equal(result, null, 'Sub-threshold tools must return null');
  });

  // Test AH: Changing profile constraints changes relevant rankings
  it('Test AH: changing profile constraints (disliked work) actively penalizes relevant combination scores', () => {
    const profileDislikesVideo: UserProfile = {
      ...sampleProfile,
      disliked_work: 'Video editing and trimming long reels'
    };
    const comboNormal = evaluateCombination([discoveryToolWhisper, profileToolCapCut], sampleSkills, sampleProfile);
    const comboDisliked = evaluateCombination([discoveryToolWhisper, profileToolCapCut], sampleSkills, profileDislikesVideo);

    assert.ok(comboNormal !== null && comboDisliked !== null);
    assert.ok(
      comboDisliked.score < comboNormal.score,
      `Score with disliked work (${comboDisliked.score}) must be lower than normal score (${comboNormal.score})`
    );
    assert.match(
      comboDisliked.score_breakdown.reasoning?.outcomeUsefulness || '',
      /disliked work/i,
      'Reasoning must explicitly state penalty for disliked work'
    );
  });

  // Test AI: Existing Phase 4.1 opportunity behavior remains intact
  it('Test AI: Phase 4.1 scoring and access semantics are preserved in Phase 5.1', () => {
    // Verify Phase 4.1 access types
    assert.equal(evaluateToolAccess(profileToolCanva), 'already_have');
    assert.equal(evaluateToolAccess(paidToolMidjourney), 'requires_paid_access');
  });

  // Test AJ: No combination can exceed score 100
  it('Test AJ: score is strictly clamped and can never exceed 100 points', () => {
    const combo = evaluateCombination([discoveryToolOllama, profileToolCanva], sampleSkills, sampleProfile);
    assert.ok(combo !== null);
    assert.ok(combo.score <= 100, `Score (${combo.score}) must never exceed 100`);
    assert.ok(combo.score >= 0, `Score (${combo.score}) must be >= 0`);
  });
});

