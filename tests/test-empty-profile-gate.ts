import { dbRun, dbAll, dbGet } from '../server/db/sqlite.js';
import { opportunityEngine } from '../server/services/opportunityEngine.js';
import { getStoredCombinations, generateAndStoreCombinations } from '../server/services/combineEngine.js';
import assert from 'assert';

async function runTest() {
  console.log('=== TEST: EMPTY PROFILE GATE & STATE SYNCHRONIZATION ===\n');

  // Helper to purge profile items
  async function clearProfile() {
    await dbRun('DELETE FROM tools;');
    await dbRun('DELETE FROM skills;');
    await dbRun('DELETE FROM goals;');
    await dbRun('DELETE FROM interests;');
    await dbRun('DELETE FROM projects;');
    await dbRun('DELETE FROM opportunities;');
    await dbRun('DELETE FROM tool_combinations;');
    await dbRun('DELETE FROM profiles;');
    await dbRun("INSERT INTO profiles (id, name, preferred_budget, available_hours_per_week, preferred_work_type, learning_tolerance) VALUES ('default-profile', 'Test User', 0, 20, 'Freelance', 'High');");
  }

  try {
    // -------------------------------------------------------------
    // Test Case A: Fresh Profile (0 Tools, 0 Skills)
    // -------------------------------------------------------------
    console.log('Test Case A: Fresh profile (0 tools, 0 skills)');
    await clearProfile();

    const oppsA = await opportunityEngine.getOpportunities();
    assert.strictEqual(oppsA.length, 0, 'Case A: getOpportunities must return 0 items for empty profile');

    const combosA = await getStoredCombinations();
    assert.strictEqual(combosA.length, 0, 'Case A: getStoredCombinations must return 0 items for empty profile');

    const genCombosA = await generateAndStoreCombinations();
    assert.strictEqual(genCombosA.length, 0, 'Case A: generateAndStoreCombinations must return 0 items for empty profile');

    console.log('✓ Case A Passed: Backend returns 0 opportunities & combinations for empty profile.\n');

    // -------------------------------------------------------------
    // Test Case B: 1 Tool, 0 Skills
    // -------------------------------------------------------------
    console.log('Test Case B: Profile with 1 tool ("Gemini"), 0 skills');
    await clearProfile();
    await dbRun("INSERT INTO tools (id, profile_id, name, category, familiarity, access_type, cost_per_month) VALUES ('t1', 'default-profile', 'Gemini', 'AI Model', 'Expert', 'Free', 0);");

    const oppsB = await opportunityEngine.getOpportunities();
    assert.ok(oppsB.length > 0, 'Case B: getOpportunities should evaluate tool-matched opportunities');

    const genCombosB = await generateAndStoreCombinations();
    assert.ok(genCombosB.length > 0, 'Case B: generateAndStoreCombinations should generate standalone/tool combinations');

    console.log(`✓ Case B Passed: Generated ${oppsB.length} opportunities and ${genCombosB.length} tool service combinations.\n`);

    // -------------------------------------------------------------
    // Test Case C: 0 Tools, 1 Skill
    // -------------------------------------------------------------
    console.log('Test Case C: Profile with 0 tools, 1 skill ("Poster Design")');
    await clearProfile();
    await dbRun("INSERT INTO skills (id, profile_id, name, proficiency) VALUES ('s1', 'default-profile', 'Poster Design', 'Intermediate');");

    const oppsC = await opportunityEngine.getOpportunities();
    assert.ok(oppsC.length > 0, 'Case C: getOpportunities should evaluate skill-matched opportunities');

    const combosC = await getStoredCombinations();
    assert.strictEqual(combosC.length, 0, 'Case C: Combiner must return 0 combinations when tools count is 0');

    console.log(`✓ Case C Passed: Generated ${oppsC.length} skill opportunities while Combiner correctly stayed 0.\n`);

    // -------------------------------------------------------------
    // Test Case D: Delete Last Tool
    // -------------------------------------------------------------
    console.log('Test Case D: Delete last tool from profile');
    await clearProfile();
    await dbRun("INSERT INTO tools (id, profile_id, name, category, familiarity, access_type, cost_per_month) VALUES ('t1', 'default-profile', 'Canva', 'Design', 'Expert', 'Free', 0);");
    
    let combosD = await generateAndStoreCombinations();
    assert.ok(combosD.length > 0, 'Should have combinations before deletion');

    // Now delete tool
    await dbRun("DELETE FROM tools WHERE id = 't1';");
    combosD = await getStoredCombinations();
    assert.strictEqual(combosD.length, 0, 'Case D: Combiner must return 0 items after last tool deleted');

    console.log('✓ Case D Passed: Combiner gated immediately after deleting last tool.\n');

    // -------------------------------------------------------------
    // Test Case E: Delete Last Tool & Skill
    // -------------------------------------------------------------
    console.log('Test Case E: Delete last tool & skill (return to 0 state)');
    await clearProfile();
    await dbRun("INSERT INTO tools (id, profile_id, name, category, familiarity, access_type, cost_per_month) VALUES ('t1', 'default-profile', 'Ollama', 'Local AI', 'Intermediate', 'Free', 0);");
    await dbRun("INSERT INTO skills (id, profile_id, name, proficiency) VALUES ('s1', 'default-profile', 'Local AI', 'Intermediate');");

    let oppsE = await opportunityEngine.getOpportunities();
    assert.ok(oppsE.length > 0, 'Should have opportunities before deletion');

    // Delete both
    await clearProfile();
    oppsE = await opportunityEngine.getOpportunities();
    assert.strictEqual(oppsE.length, 0, 'Case E: Opportunities must return 0 items when profile restored to 0 tools & skills');

    console.log('✓ Case E Passed: Opportunities gated immediately when profile is back to 0.\n');

    console.log('=== ALL EMPTY PROFILE GATE TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  }
}

runTest();
