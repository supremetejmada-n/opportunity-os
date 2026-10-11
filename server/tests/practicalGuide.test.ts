import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { actionPlanEngine } from '../services/actionPlanEngine.js';
import { initDatabase, dbRun, dbGet } from '../db/sqlite.js';
import { synthesizePracticalGuidance, detectOpportunityDomain } from '../../src/utils/practicalGuidance.js';
import { ActionStep } from '../../src/types/index.js';

describe('Practical Guidance & Full-Screen Workspace Engine Test Suite', () => {
  let oppId: string;
  let comboId: string;

  before(async () => {
    await initDatabase();

    // Setup test opportunity
    oppId = 'test-opp-practical-' + Date.now();
    await dbRun(`
      INSERT OR REPLACE INTO opportunities (
        id, title, summary, solution, service_type, target_customer, customer_type,
        workflow, required_tools, missing_skills, startup_cost, difficulty,
        time_to_demo, potential_monetization, risks, score, score_breakdown,
        confidence, saved, status
      ) VALUES (
        ?, 'Branded Instagram Carousel Service', 'Create 3-slide visual templates for local fitness studios',
        'Create carousel graphics with Canva and ChatGPT', 'Design', 'Boutique Gym Owners', 'Fitness Coaches',
        '["Draft copy", "Design visual", "Deliver PDF"]', '["Canva", "ChatGPT"]', '[]',
        0, 'Easy', '1 day', '₹15,000 / month', '[]', 88, '{}', 'High', 1, 'new'
      )
    `, [oppId]);

    // Setup test tool combination
    comboId = 'test-combo-practical-' + Date.now();
    await dbRun(`
      INSERT OR REPLACE INTO tool_combinations (
        id, title, summary, tool_ids, tool_names, workflow_pattern, workflow_steps,
        concrete_outcome, customer_type, target_customer, startup_cost, is_zero_cost,
        difficulty, score, score_breakdown, confidence, saved
      ) VALUES (
        ?, 'WhatsApp + Sheets Client Auto-Alert', 'Send automated booking notifications to customers',
        '["tool_1", "tool_2"]', '["WhatsApp", "Google Sheets"]', 'TRIGGER_AI_ACTION',
        '["Collect form", "Update sheet", "Notify on WhatsApp"]',
        'Automated real-time booking alert system',
        'Local Salons', 'Salon and Spa Owners', 0, 1,
        'Medium', 82, '{}', 'High', 1
      )
    `, [comboId]);
  });

  // 1. Correct Opportunity and Plan Identification
  it('1. correctly identifies and generates plan for an opportunity', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(oppId);
    assert.ok(plan);
    assert.equal(plan.opportunity_id, oppId);
    assert.equal(plan.combination_id, null);
    assert.ok(plan.id);
    assert.ok(plan.steps.length >= 5);
    assert.equal(plan.status, 'not_started');
    assert.equal(plan.progress_percentage, 0);
  });

  // 2. Correct Combination and Plan Identification
  it('2. correctly identifies and generates plan for a tool combination', async () => {
    const plan = await actionPlanEngine.generatePlanForCombination(comboId);
    assert.ok(plan);
    assert.equal(plan.combination_id, comboId);
    assert.equal(plan.opportunity_id, null);
    assert.ok(plan.steps.length >= 5);
    assert.equal(plan.status, 'not_started');
  });

  // 3. Reopening an existing plan without creating a duplicate
  it('3. reopening an existing plan reuses the exact same plan ID without duplicates', async () => {
    const firstPlan = await actionPlanEngine.generatePlanForOpportunity(oppId);
    const secondPlan = await actionPlanEngine.generatePlanForOpportunity(oppId);
    assert.equal(firstPlan.id, secondPlan.id, 'Must reuse identical plan ID');

    const firstCombo = await actionPlanEngine.generatePlanForCombination(comboId);
    const secondCombo = await actionPlanEngine.generatePlanForCombination(comboId);
    assert.equal(firstCombo.id, secondCombo.id, 'Must reuse identical combination plan ID');
  });

  // 4. Marking one step complete and calculating correct progress
  it('4. marks a step complete and calculates truthful progress percentage', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(oppId);
    const step1 = plan.steps[0];

    // Mark step 1 complete
    const updated = await actionPlanEngine.updateStep(step1.id, { status: 'completed' });
    assert.equal(updated.status, 'completed');

    const refreshed = await actionPlanEngine.getActionPlanById(plan.id);
    assert.ok(refreshed);
    assert.equal(refreshed.completed_steps_count, 1);
    const expectedPercent = Math.round((1 / refreshed.total_steps_count!) * 100);
    assert.equal(refreshed.progress_percentage, expectedPercent);
    assert.equal(refreshed.status, 'in_progress');
  });

  // 5. Completing step 1 does NOT automatically complete later steps
  it('5. completing step 1 activates step 2 to in_progress but does NOT mark later steps completed', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(oppId);
    const refreshed = await actionPlanEngine.getActionPlanById(plan.id);
    assert.ok(refreshed);

    const step1 = refreshed.steps[0];
    const step2 = refreshed.steps[1];
    const step3 = refreshed.steps[2];

    assert.equal(step1.status, 'completed');
    assert.equal(step2.status, 'in_progress', 'Step 2 should be in_progress');
    assert.equal(step3.status, 'not_started', 'Step 3 must remain not_started');
  });

  // 6. Blocked step handling and blocker notes persistence
  it('6. records blocked status and persists blocker notes without marking complete', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(oppId);
    const step2 = plan.steps[1];

    const blockerReason = 'Waiting for Canva free account confirmation link';
    const updated = await actionPlanEngine.updateStep(step2.id, {
      status: 'blocked',
      notes: blockerReason
    });

    assert.equal(updated.status, 'blocked');
    assert.equal(updated.notes, blockerReason);

    const refreshed = await actionPlanEngine.getActionPlanById(plan.id);
    assert.ok(refreshed);
    const refreshedStep2 = refreshed.steps.find(s => s.id === step2.id);
    assert.equal(refreshedStep2?.status, 'blocked');
    assert.equal(refreshedStep2?.notes, blockerReason);
    // Completed count should still be 1 (only step 1 was completed)
    assert.equal(refreshed.completed_steps_count, 1);
  });

  // 7. Leaving and resuming: progress and notes remain intact
  it('7. leaving and resuming preserves all progress, statuses, and notes', async () => {
    const plan = await actionPlanEngine.getActionPlanById(
      (await actionPlanEngine.generatePlanForOpportunity(oppId)).id
    );
    assert.ok(plan);
    assert.equal(plan.completed_steps_count, 1);
    assert.equal(plan.steps[0].status, 'completed');
    assert.equal(plan.steps[1].status, 'blocked');
    assert.ok(plan.steps[1].notes?.includes('Canva'));
  });

  // 8. Error handling for missing or invalid plan IDs
  it('8. handles missing or invalid plan IDs gracefully', async () => {
    const fakeId = 'non-existent-plan-id-99999';
    const plan = await actionPlanEngine.getActionPlanById(fakeId);
    assert.equal(plan, null);
  });

  // 9. Error handling for invalid step IDs
  it('9. handles updating non-existent step IDs with an error', async () => {
    await assert.rejects(
      async () => {
        await actionPlanEngine.updateStep('non-existent-step-12345', { status: 'completed' });
      },
      /Step not found/
    );
  });

  // 10. Guidance domain detection and task-grounded instructions
  it('10. detects opportunity domains and produces grounded 12-section guidance', () => {
    // Design domain
    assert.equal(detectOpportunityDomain(['Canva'], 'Social Banners', 'Visual banner ads'), 'design');
    // Automation domain
    assert.equal(detectOpportunityDomain(['Make', 'WhatsApp'], 'Booking Alert', 'Automated alerts'), 'automation');
    // Data leads domain
    assert.equal(detectOpportunityDomain(['Google Maps'], 'Lead Finder', 'Find 10 dental clinics'), 'data_leads');

    // Test synthesized guidance structure
    const sampleStep: ActionStep = {
      id: 'step-build-test',
      action_plan_id: 'plan-test',
      step_order: 2,
      phase: 'BUILD',
      title: 'Create Concrete Demo Sample',
      description: 'Design sample carousel graphics in Canva',
      estimated_time: '2h',
      status: 'not_started'
    };

    const guidance = synthesizePracticalGuidance(sampleStep, {
      title: 'Instagram Carousel Service',
      whatYouMake: 'Branded 3-slide visual carousel templates',
      targetCustomer: 'Boutique Gym Owners',
      tools: ['ChatGPT', 'Canva'],
      startupCost: 0
    });

    assert.ok(guidance);
    assert.equal(guidance.stepOrder, 2);
    assert.equal(guidance.phase, '2. BUILD');
    assert.ok(guidance.objective.length > 20);
    assert.ok(guidance.startingPoint.length >= 2);
    assert.ok(guidance.exactActions.length >= 3);
    assert.ok(guidance.specificTools.length >= 1);
    assert.ok(guidance.exactInputs && guidance.exactInputs.length >= 1);
    assert.ok(guidance.exactInputs[0].content.length > 30);
    assert.ok(guidance.concreteExample);
    assert.equal(guidance.concreteExample?.isIllustrative, true, 'Illustrative example must be clearly labeled');
    assert.ok(guidance.expectedOutput.length > 10);
    assert.ok(guidance.verificationChecklist.length >= 3);
    assert.ok(guidance.commonProblems.length >= 1);
    assert.ok(guidance.timeAndCost.financialCost.includes('₹0'));
    assert.ok(guidance.completionCondition.length > 10);
    assert.ok(guidance.nextStepConnection.length > 10);
  });
});
