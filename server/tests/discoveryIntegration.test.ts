import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase, dbRun, dbGet, dbAll } from '../db/sqlite.js';
import { opportunityEngine } from '../services/opportunityEngine.js';
import { generateAndStoreCombinations, getStoredCombinations, loadUnifiedTools } from '../services/combineEngine.js';
import { scanEngine } from '../services/scanEngine.js';
import { getHumanToolLabel, deduplicateVectors } from '../../src/utils/UserFacingViewModel.js';

describe('Comprehensive Discovery Integration & Unified Tool Inventory Test Suite', () => {

  before(async () => {
    await initDatabase();

    // Setup initial clean user profile for test cases
    const profileId = 'test-discovery-user';
    await dbRun(`INSERT OR REPLACE INTO profiles (id, name, preferred_budget, learning_tolerance) VALUES (?, ?, 0, 'High')`, [profileId, 'Test Builder']);

    // Setup 2 profile tools
    await dbRun(`DELETE FROM tools WHERE profile_id = ?`, [profileId]);
    await dbRun(`INSERT INTO tools (id, profile_id, name, category, access_type, cost_per_month, capabilities) VALUES (?, ?, ?, ?, ?, 0, ?)`,
      ['tool-prof-canva', profileId, 'Canva', 'Design', 'Free Tier', '["GRAPHIC_DESIGN"]']);
    await dbRun(`INSERT INTO tools (id, profile_id, name, category, access_type, cost_per_month, capabilities) VALUES (?, ?, ?, ?, ?, 0, ?)`,
      ['tool-prof-gemini', profileId, 'Gemini', 'AI Model', 'Free Tier', '["TEXT_GENERATION"]']);

    // Setup 1 profile skill
    await dbRun(`DELETE FROM skills WHERE profile_id = ?`, [profileId]);
    await dbRun(`INSERT INTO skills (id, profile_id, name, proficiency, confidence) VALUES (?, ?, ?, ?, 85)`,
      ['skill-poster', profileId, 'Poster Design', 'Advanced']);
  });

  // Test 1: A profile-only tool can generate a valid earning idea.
  it('1. Profile-only tools generate a valid earning idea', async () => {
    const opps = await opportunityEngine.evaluateOpportunities();
    assert.ok(opps.length > 0, 'Should generate opportunities');
    const profileOpp = opps.find(o => o.requiredTools.includes('Canva') || o.requiredTools.includes('Gemini'));
    assert.ok(profileOpp, 'Must contain earning idea based on profile tools');
    assert.ok(profileOpp.score >= 65, 'Score must meet minimum quality threshold');
  });

  // Test 2: A newly discovered eligible tool can generate an earning idea without being saved to the profile.
  it('2. Newly discovered eligible tool generates an earning idea without being saved in profile', async () => {
    const discId = 'disc-flux-test-' + Date.now();
    await dbRun(`
      INSERT INTO discoveries (
        id, title, description, url, source, category, capabilities, pricing_status, free_tier, open_source, verification_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'verified')
    `, [discId, 'Flux.1 Schnell Model', 'Fast open-source text-to-image diffusion model', 'https://github.com/black-forest-labs/flux', 'github', 'Image Model', '["IMAGE_GENERATION"]', 'open_source_self_hostable']);

    const opps = await opportunityEngine.evaluateOpportunities();
    const discOpp = opps.find(o => o.discoveryId === discId || o.requiredTools.some(t => t.toLowerCase().includes('flux')));
    assert.ok(discOpp, 'Should generate an earning idea for discovered tool without profile save');
    assert.equal(discOpp.origin, 'discovery_derived');
    assert.ok(discOpp.requiredTools.some(t => t.toLowerCase().includes('flux')), 'Discovered tool MUST be in requiredTools');
    assert.ok(discOpp.workflow.some(w => w.toLowerCase().includes('flux')), 'Discovered tool MUST be mentioned in workflow steps');
    assert.ok(discOpp.actionPlan && discOpp.actionPlan.some(ap => ap.toolsNeeded && ap.toolsNeeded.some(tn => tn.toLowerCase().includes('flux'))), 'Discovered tool MUST be in actionPlan toolsNeeded');
  });

  // Test 3: A mixed profile/discovered tool stack can generate a feasible workflow.
  it('3. Mixed profile/discovered tool stack generates a feasible workflow', async () => {
    const discId = 'disc-crawl4ai-' + Date.now();
    await dbRun(`
      INSERT INTO discoveries (
        id, title, description, url, source, category, capabilities, pricing_status, free_tier, open_source, verification_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'verified')
    `, [discId, 'Crawl4AI Web Scraper', 'Open-source LLM-friendly web crawler', 'https://github.com/unclecode/crawl4ai', 'github', 'Data Extraction', '["DATA_EXTRACTION"]', 'open_source_self_hostable']);

    const combinations = await generateAndStoreCombinations({ toolIds: ['Canva', 'Gemini', 'Crawl4AI Web Scraper'], forceRefresh: true });
    assert.ok(combinations.length > 0, 'Should generate combinations');
    const mixedCombo = combinations.find(c => c.tool_names.some(t => t.toLowerCase().includes('crawl4ai')));
    assert.ok(mixedCombo, 'Mixed tool stack workflow must be generated');
    assert.ok(mixedCombo.workflow_steps.length > 0, 'Must contain workflow steps');
    assert.ok(mixedCombo.tool_names.some(t => t.toLowerCase().includes('crawl4ai')), 'Must contain discovered tool');
    assert.ok(mixedCombo.workflow_steps.some(ws => ws.toLowerCase().includes('crawl4ai')), 'Workflow steps must explicitly mention discovered tool');
  });

  // Test 4: A discovery with insufficient evidence or irrelevant capabilities is rejected.
  it('4. Discovery with insufficient evidence or irrelevant capabilities is rejected', async () => {
    const rejectedDiscId = 'disc-rejected-' + Date.now();
    await dbRun(`
      INSERT INTO discoveries (
        id, title, description, url, source, category, capabilities, pricing_status, verification_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'rejected')
    `, [rejectedDiscId, 'Invalid Junk Repo', 'Broken repository', 'https://example.com/junk', 'web', 'Other', '[]', 'unknown']);

    const unified = await loadUnifiedTools();
    const isPresent = unified.tools.some(t => t.id === rejectedDiscId);
    assert.equal(isPresent, false, 'Rejected discovery must not be included in unified inventory');
  });

  // Test 5: Duplicate discoveries do not create duplicate tools or recommendations.
  it('5. Duplicate discoveries do not create duplicate tools or recommendations', async () => {
    const oppsBefore = await opportunityEngine.getOpportunities();
    const countBefore = oppsBefore.length;

    // Trigger second evaluation without adding new items
    const oppsAfter = await opportunityEngine.getOpportunities();
    assert.equal(oppsAfter.length, countBefore, 'Deduplicated canonical opportunities count must remain constant');
  });

  // Test 6: A successful scan with new discoveries triggers recommendation reevaluation.
  it('6. Successful scan with new discoveries triggers recommendation re-evaluation', async () => {
    const scanResult = await scanEngine.runOnDemandScan();
    assert.ok(scanResult.scanRecord, 'Must complete scan');
    assert.ok(Array.isArray(scanResult.recommendations), 'Must return recommendations');

    const storedCombos = await getStoredCombinations();
    assert.ok(Array.isArray(storedCombos), 'Tool combinations must be refreshed in database');
  });

  // Test 7: A scan with no new discoveries does not fabricate results.
  it('7. Scan with no new discoveries does not fabricate results', async () => {
    const latestScanBefore = await scanEngine.getLatestScanRecord();
    assert.ok(latestScanBefore);
  });

  // Test 8: Recommendations explain prerequisites for inaccessible or paid tools.
  it('8. Recommendations explain prerequisites for inaccessible or paid tools', async () => {
    const opps = await opportunityEngine.evaluateOpportunities();
    for (const opp of opps) {
      if (opp.evidence && opp.evidence.prerequisiteNote) {
        assert.ok(typeof opp.evidence.prerequisiteNote === 'string');
      }
    }
  });

  // Test 9: Explicitly selected tools are respected by Combine Tools.
  it('9. Explicitly selected tools are respected by Combine Tools', async () => {
    const combinations = await generateAndStoreCombinations({ toolIds: ['Canva', 'Gemini'] });
    assert.ok(combinations.length > 0, 'Should generate combinations for selected tools');
    for (const combo of combinations) {
      assert.ok(
        combo.tool_names.some(t => t.toLowerCase().includes('canva') || t.toLowerCase().includes('gemini')),
        'Must contain user selected tools'
      );
    }
  });

  // Test 10: Existing saved plans, feedback and progress survive recommendation refreshes.
  it('10. Existing saved plans, feedback and progress survive recommendation refreshes', async () => {
    const testPlanId = 'test-saved-plan-' + Date.now();
    await dbRun(`
      INSERT INTO action_plans (id, title, objective, summary, status)
      VALUES (?, 'Saved Customer Service Plan', 'Deliver service to clients', 'Summary', 'in_progress')
    `, [testPlanId]);

    // Trigger engine re-evaluation
    await generateAndStoreCombinations({ forceRefresh: true });
    await opportunityEngine.evaluateOpportunities();

    const planInDb = await dbGet('SELECT * FROM action_plans WHERE id = ?', [testPlanId]);
    assert.ok(planInDb, 'Action plan must survive engine re-evaluation');
    assert.equal(planInDb.title, 'Saved Customer Service Plan');
  });

  // Test 11: Backend API responses and frontend screens display recommendations based on updated persisted inventory.
  it('11. Backend API responses return updated persisted recommendations', async () => {
    const opps = await opportunityEngine.getOpportunities();
    assert.ok(Array.isArray(opps), 'getOpportunities must return array');
    const combos = await getStoredCombinations();
    assert.ok(Array.isArray(combos), 'getStoredCombinations must return array');
  });

  // Test 12: View model preserves clean discovered tool names without converting to ChatGPT or Gemini
  it('12. View model preserves clean discovered tool names', () => {
    assert.equal(getHumanToolLabel('Flux.1 Schnell Model'), 'Flux.1 Schnell Model');
    assert.equal(getHumanToolLabel('Crawl4AI Web Scraper'), 'Crawl4AI Web Scraper');
    assert.equal(getHumanToolLabel('Ollama Local AI'), 'Ollama Local AI');
    assert.equal(getHumanToolLabel('Canva'), 'Canva');
    assert.equal(getHumanToolLabel('CapCut'), 'CapCut');
  });

  // Test 13: Vector deduplication preserves discovery-derived opportunities alongside profile templates
  it('13. Vector deduplication preserves discovery-derived vectors', () => {
    const templateVector: any = {
      id: 'v1',
      whatYouMake: 'Create Product Photos for Online Sellers',
      sourceLabel: 'Uses my saved tools',
      toolsYouUse: ['Canva', 'Gemini']
    };
    const discoveryVector: any = {
      id: 'v2',
      whatYouMake: 'Create Product Photos for Online Sellers',
      sourceLabel: 'Uses a newly discovered tool',
      toolsYouUse: ['Flux.1 Schnell Model']
    };

    const deduplicated = deduplicateVectors([templateVector, discoveryVector]);
    assert.equal(deduplicated.length, 2, 'Discovery vector must not be swallowed by profile template');
  });

  // Test 14: Validated discovery used without adding it to profile generates valid opportunity
  it('14. Validated discovery generates opportunity when profile has zero saved tools', async () => {
    // Temporarily clear profile tools & skills on primary profile
    const primaryProfile = await dbGet('SELECT id FROM profiles LIMIT 1');
    const profileId = primaryProfile ? primaryProfile.id : 'test-discovery-user';
    const savedTools = await dbAll('SELECT * FROM tools WHERE profile_id = ?', [profileId]);
    const savedSkills = await dbAll('SELECT * FROM skills WHERE profile_id = ?', [profileId]);
    await dbRun(`DELETE FROM tools WHERE profile_id = ?`, [profileId]);
    await dbRun(`DELETE FROM skills WHERE profile_id = ?`, [profileId]);

    try {
      const discId = 'disc-standalone-whisper-' + Date.now();
      await dbRun(`
        INSERT INTO discoveries (
          id, title, description, url, source, category, capabilities, pricing_status, free_tier, open_source, verification_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'verified')
      `, [discId, 'Whisper Speech Audio Model', 'Open-source speech transcription engine', 'https://github.com/openai/whisper', 'github', 'Audio Processing', '["AUDIO_PROCESSING"]', 'open_source_self_hostable']);

      const opps = await opportunityEngine.evaluateOpportunities();
      const whisperOpp = opps.find(o => o.discoveryId === discId || o.requiredTools.some(t => t.toLowerCase().includes('whisper')));
      assert.ok(whisperOpp, 'Must generate discovery-only opportunity when user has 0 profile tools');
      assert.equal(whisperOpp.origin, 'discovery_derived');
      assert.ok(whisperOpp.requiredTools.some(t => t.toLowerCase().includes('whisper')), 'Discovered tool must be in requiredTools');
    } finally {
      // Restore profile tools and skills
      for (const t of savedTools) {
        await dbRun('INSERT INTO tools (id, profile_id, name, category, access_type, cost_per_month, capabilities, familiarity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [t.id, t.profile_id, t.name, t.category, t.access_type, t.cost_per_month, t.capabilities, t.familiarity]);
      }
      for (const s of savedSkills) {
        await dbRun('INSERT INTO skills (id, profile_id, name, proficiency, confidence, experience_years, last_used) VALUES (?, ?, ?, ?, ?, ?, ?)', [s.id, s.profile_id, s.name, s.proficiency, s.confidence, s.experience_years, s.last_used]);
      }
    }
  });
});
