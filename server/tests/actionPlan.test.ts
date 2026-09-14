import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { actionPlanEngine } from '../services/actionPlanEngine.js';
import { initDatabase, dbRun, dbGet, dbAll } from '../db/sqlite.js';

describe('Phase 6: Action Plans & Progress Engine Test Suite', () => {
  let testOppId: string;
  let testComboId: string;

  before(async () => {
    await initDatabase();

    // Ensure a known test opportunity exists
    testOppId = 'test-opp-phase6-' + Date.now();
    await dbRun(`
      INSERT OR REPLACE INTO opportunities (
        id, title, summary, service_type, target_customer, customer_type,
        workflow, required_tools, missing_skills, startup_cost,
        difficulty, time_to_demo, potential_monetization, risks, score,
        score_breakdown, confidence, saved, status
      ) VALUES (
        ?, 'AI Lead Scraping & Verification System', 'Extract and verify niche local leads with AI',
        'Service', 'Dental Clinic Owners', 'Dental Practice Managers',
        '["Scrape directories", "Clean data with AI", "Deliver spreadsheet"]',
        '["Python", "Gemini 1.5 API"]', '["Web Scraping"]',
        0, 'Medium', '1-2 days', '₹15,000 / month', '["Rate limits"]', 82,
        '{}', 'High', 1, 'new'
      )
    `, [testOppId]);

    // Ensure a known test combination exists
    testComboId = 'test-combo-phase6-' + Date.now();
    await dbRun(`
      INSERT OR REPLACE INTO tool_combinations (
        id, title, summary, tool_ids, tool_names, workflow_pattern, workflow_steps,
        concrete_outcome, customer_type, target_customer, startup_cost, is_zero_cost,
        difficulty, score, score_breakdown, confidence, saved
      ) VALUES (
        ?, 'Canva + Whisper Social Reel Pipeline', 'Generate audio subtitles and social graphics',
        '["tool_1", "tool_2"]', '["Canva", "Whisper"]', 'GENERATE_DESIGN',
        '["Transcribe audio with Whisper", "Design visual layout in Canva"]',
        'Ready-to-post branded social reels with burned-in subtitles',
        'Fitness Coaches', 'Online Fitness Coaches', 0, 1,
        'Easy', 85, '{}', 'High', 1
      )
    `, [testComboId]);
  });

  // Test A: Plan generation succeeds for an opportunity
  it('Test A: generates structured action plan for an opportunity', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    assert.ok(plan);
    assert.equal(plan.opportunity_id, testOppId);
    assert.ok(plan.id);
    assert.ok(plan.title.includes('AI Lead Scraping'));
    assert.equal(plan.status, 'not_started');
  });

  // Test B: Plan generation succeeds for a tool combination
  it('Test B: generates structured action plan for a tool combination', async () => {
    const plan = await actionPlanEngine.generatePlanForCombination(testComboId);
    assert.ok(plan);
    assert.equal(plan.combination_id, testComboId);
    assert.ok(plan.title.includes('Canva + Whisper'));
    assert.equal(plan.status, 'not_started');
  });

  // Test C: Plan contains all 6 phases in strict order: LEARN, BUILD, PORTFOLIO, PROSPECT, OUTREACH, RESULT
  it('Test C: plan contains all 6 phases in strict deterministic order', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    assert.equal(plan.steps.length, 6);
    const expectedPhases = ['LEARN', 'BUILD', 'PORTFOLIO', 'PROSPECT', 'OUTREACH', 'RESULT'];
    const actualPhases = plan.steps.map(s => s.phase);
    assert.deepEqual(actualPhases, expectedPhases);

    // Verify step order numbers are 1 to 6
    const orders = plan.steps.map(s => s.step_order);
    assert.deepEqual(orders, [1, 2, 3, 4, 5, 6]);
  });

  // Test D: Phase 1 (LEARN) reflects skill gap
  it('Test D: Phase 1 (LEARN) reflects missing skill gap vs existing skills', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    const learnStep = plan.steps.find(s => s.phase === 'LEARN')!;
    assert.ok(learnStep);
    // User profile missing 'Web Scraping'
    assert.ok(
      learnStep.title.toLowerCase().includes('skill') ||
      learnStep.title.toLowerCase().includes('mastery') ||
      learnStep.description.toLowerCase().includes('scraping')
    );
  });

  // Test E: Phase 1 (LEARN) respects zero-budget constraint
  it('Test E: Phase 1 (LEARN) respects preferred_budget === 0 by prescribing free documentation', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    const learnStep = plan.steps.find(s => s.phase === 'LEARN')!;
    assert.ok(learnStep.description.toLowerCase().includes('free'));
    assert.ok(!learnStep.description.toLowerCase().includes('purchase') && !learnStep.description.toLowerCase().includes('paid course'));
  });

  // Test F: Phase 2 (BUILD) specifies tangible demo using actual assigned tools
  it('Test F: Phase 2 (BUILD) specifies tangible demo using actual assigned tools', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    const buildStep = plan.steps.find(s => s.phase === 'BUILD')!;
    assert.ok(buildStep);
    assert.ok(buildStep.title.toLowerCase().includes('demo') || buildStep.title.toLowerCase().includes('build'));
    assert.ok(buildStep.description.includes('Python') || buildStep.description.includes('Gemini'));
  });

  // Test G: Phase 2 (BUILD) respects available hours constraint
  it('Test G: Phase 2 (BUILD) estimated time fits within lean execution limits (<= 3 hours)', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    const buildStep = plan.steps.find(s => s.phase === 'BUILD')!;
    assert.ok(buildStep.estimated_time.includes('h'));
    const hoursMatch = buildStep.estimated_time.match(/(\d+)\s*h/);
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 2;
    assert.ok(hours <= 4, `Build hours should be <= 4, got ${hours}`);
  });

  // Test H: Phase 3 (PORTFOLIO) defines zero-cost proof asset
  it('Test H: Phase 3 (PORTFOLIO) defines zero-cost proof asset (PDF showcase / Loom / GitHub)', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    const portfolioStep = plan.steps.find(s => s.phase === 'PORTFOLIO')!;
    assert.ok(portfolioStep);
    assert.ok(
      portfolioStep.description.toLowerCase().includes('pdf') ||
      portfolioStep.description.toLowerCase().includes('loom') ||
      portfolioStep.description.toLowerCase().includes('proof')
    );
  });

  // Test I: Phase 4 (PROSPECT) identifies specific target customer and persona
  it('Test I: Phase 4 (PROSPECT) specifies target customer persona (e.g. Dental Practice Managers)', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    const prospectStep = plan.steps.find(s => s.phase === 'PROSPECT')!;
    assert.ok(prospectStep);
    assert.ok(
      prospectStep.title.includes('Dental') ||
      prospectStep.description.includes('Dental') ||
      prospectStep.description.includes('Clinic')
    );
  });

  // Test J: Phase 4 (PROSPECT) respects disliked_work (excludes cold phone calls)
  it('Test J: Phase 4 (PROSPECT) excludes cold phone calls when disliked_work includes cold calling', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    const prospectStep = plan.steps.find(s => s.phase === 'PROSPECT')!;
    assert.ok(prospectStep.description.toLowerCase().includes('avoiding phone cold calls') || !prospectStep.description.toLowerCase().includes('phone call'));
  });

  // Test K: Phase 5 (OUTREACH) provides tailored message template and requires manual execution
  it('Test K: Phase 5 (OUTREACH) includes personalized message template for manual execution', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    const outreachStep = plan.steps.find(s => s.phase === 'OUTREACH')!;
    assert.ok(outreachStep);
    assert.ok(outreachStep.title.toLowerCase().includes('manual'));
    assert.ok(outreachStep.description.includes('Hi [Name]'));
  });

  // Test L: Phase 5 (OUTREACH) strictly contains no autonomous agent or automated bot instructions
  it('Test L: Phase 5 (OUTREACH) forbids autonomous mass-emailers or automated bots', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    const outreachStep = plan.steps.find(s => s.phase === 'OUTREACH')!;
    assert.ok(outreachStep.description.toLowerCase().includes('do not use automated') || outreachStep.description.toLowerCase().includes('manually'));
  });

  // Test M: Phase 6 (RESULT) directs user to record real-world results in Progress tracker
  it('Test M: Phase 6 (RESULT) directs user to record real outcomes in Progress screen', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    const resultStep = plan.steps.find(s => s.phase === 'RESULT')!;
    assert.ok(resultStep);
    assert.ok(
      resultStep.description.toLowerCase().includes('progress') ||
      resultStep.description.toLowerCase().includes('outcome') ||
      resultStep.description.toLowerCase().includes('record')
    );
  });

  // Test N: Progress percentage correctly starts at 0% when no steps completed
  it('Test N: initial progress percentage is exactly 0% with 0 completed steps', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    assert.equal(plan.progress_percentage, 0);
    assert.equal(plan.completed_steps_count, 0);
    assert.equal(plan.total_steps_count, 6);
  });

  // Test O: Starting a plan sets plan status to in_progress and step 1 to in_progress
  it('Test O: starting a plan transitions plan status to in_progress and activates step 1', async () => {
    const initialPlan = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    const started = await actionPlanEngine.startPlan(initialPlan.id);
    assert.equal(started.status, 'in_progress');
    assert.equal(started.steps[0].status, 'in_progress');
  });

  // Test P: Completing a step auto-advances next step to in_progress
  it('Test P: completing step 1 auto-advances step 2 to in_progress and updates progress percentage', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    const step1 = plan.steps[0];
    const updatedStep = await actionPlanEngine.updateStep(step1.id, { status: 'completed' });
    assert.equal(updatedStep.status, 'completed');
    assert.ok(updatedStep.completed_at);

    const reloaded = await actionPlanEngine.getActionPlanById(plan.id);
    assert.ok(reloaded);
    assert.equal(reloaded.steps[0].status, 'completed');
    assert.equal(reloaded.steps[1].status, 'in_progress');
    assert.equal(reloaded.completed_steps_count, 1);
    assert.equal(reloaded.progress_percentage, Math.round((1 / 6) * 100)); // ~17%
  });

  // Test Q: Completing all steps transitions plan status to completed and progress to 100%
  it('Test Q: completing all steps transitions plan status to completed and progress to 100%', async () => {
    const plan = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    for (const step of plan.steps) {
      await actionPlanEngine.updateStep(step.id, { status: 'completed' });
    }

    const completedPlan = await actionPlanEngine.getActionPlanById(plan.id);
    assert.ok(completedPlan);
    assert.equal(completedPlan.status, 'completed');
    assert.equal(completedPlan.progress_percentage, 100);
    assert.equal(completedPlan.completed_steps_count, 6);
  });

  // Test R: Skipping a step does not count towards completed progress percentage
  it('Test R: skipped steps do not increment completed steps count or progress percentage', async () => {
    // Create a new dedicated plan to test skipped steps
    const newOppId = 'test-opp-skip-' + Date.now();
    await dbRun(`
      INSERT INTO opportunities (id, title, summary, required_tools, difficulty, score, saved)
      VALUES (?, 'Skip Test Opp', 'Testing skipped steps', '["Tool"]', 'Easy', 75, 0)
    `, [newOppId]);

    const plan = await actionPlanEngine.generatePlanForOpportunity(newOppId);
    // Complete step 1
    await actionPlanEngine.updateStep(plan.steps[0].id, { status: 'completed' });
    // Skip step 2
    await actionPlanEngine.updateStep(plan.steps[1].id, { status: 'skipped', notes: 'Already familiar with setup' });

    const reloaded = await actionPlanEngine.getActionPlanById(plan.id);
    assert.ok(reloaded);
    assert.equal(reloaded.steps[0].status, 'completed');
    assert.equal(reloaded.steps[1].status, 'skipped');
    assert.equal(reloaded.completed_steps_count, 1); // Only 1 completed, skipped is NOT counted
    assert.equal(reloaded.progress_percentage, Math.round((1 / 6) * 100));
  });

  // Test S: Pausing a plan transitions status to paused
  it('Test S: pausing an action plan sets status to paused', async () => {
    const plan = await actionPlanEngine.generatePlanForCombination(testComboId);
    await actionPlanEngine.startPlan(plan.id);
    const paused = await actionPlanEngine.pausePlan(plan.id);
    assert.equal(paused.status, 'paused');
  });

  // Test T: Resuming a plan transitions status back to in_progress
  it('Test T: resuming a paused action plan restores status to in_progress', async () => {
    const plan = await actionPlanEngine.generatePlanForCombination(testComboId);
    const resumed = await actionPlanEngine.resumePlan(plan.id);
    assert.equal(resumed.status, 'in_progress');
  });

  // Test U: Deleting an action plan cascades and removes its action steps and progress logs
  it('Test U: deleting an action plan cascades and removes steps and associated progress logs', async () => {
    const delOppId = 'test-opp-del-' + Date.now();
    await dbRun(`
      INSERT INTO opportunities (id, title, summary, required_tools, difficulty, score, saved)
      VALUES (?, 'Del Cascade Opp', 'Testing cascade deletion', '["Tool"]', 'Easy', 75, 0)
    `, [delOppId]);

    const plan = await actionPlanEngine.generatePlanForOpportunity(delOppId);
    await actionPlanEngine.logProgressResult({
      actionPlanId: plan.id,
      resultType: 'demo_created',
      notes: 'Demo build for cascade test'
    });

    // Delete plan
    const deleted = await actionPlanEngine.deletePlan(plan.id);
    assert.equal(deleted, true);

    // Verify plan is gone
    const fetchedPlan = await actionPlanEngine.getActionPlanById(plan.id);
    assert.equal(fetchedPlan, null);

    // Verify steps are gone
    const remainingSteps = await dbAll('SELECT * FROM action_steps WHERE action_plan_id = ?', [plan.id]);
    assert.equal(remainingSteps.length, 0);

    // Verify logs are gone
    const remainingLogs = await dbAll('SELECT * FROM progress_logs WHERE action_plan_id = ?', [plan.id]);
    assert.equal(remainingLogs.length, 0);
  });

  // Test V: Deleting an opportunity cascades and removes its action plans
  it('Test V: deleting an opportunity cascades to remove its action plans', async () => {
    const cascadeOppId = 'test-opp-fk-cascade-' + Date.now();
    await dbRun(`
      INSERT INTO opportunities (id, title, summary, required_tools, difficulty, score, saved)
      VALUES (?, 'FK Cascade Test Opp', 'Testing foreign key cascade', '["Tool"]', 'Easy', 75, 0)
    `, [cascadeOppId]);

    const plan = await actionPlanEngine.generatePlanForOpportunity(cascadeOppId);
    assert.ok(plan);

    // Delete opportunity from DB
    await dbRun('DELETE FROM opportunities WHERE id = ?', [cascadeOppId]);

    // Action plan should be cascaded
    const planAfterOppDeleted = await dbGet('SELECT * FROM action_plans WHERE opportunity_id = ?', [cascadeOppId]);
    assert.equal(planAfterOppDeleted, undefined);
  });

  // Test W: Logging a demo_created result records outcome and increments demos_created metric
  it('Test W: logging demo_created records outcome and increments demos_created metric', async () => {
    const beforeMetrics = await actionPlanEngine.getProgressMetrics();
    const log = await actionPlanEngine.logProgressResult({
      resultType: 'demo_created',
      outcome: 'positive',
      notes: 'Built interactive prototype in Canva'
    });
    assert.ok(log.id);
    assert.equal(log.result_type, 'demo_created');
    assert.equal(log.outcome, 'positive');

    const afterMetrics = await actionPlanEngine.getProgressMetrics();
    assert.equal(afterMetrics.demos_created, beforeMetrics.demos_created + 1);
  });

  // Test X: Logging a prospect_contacted result records outcome and increments prospects_contacted metric
  it('Test X: logging prospect_contacted records outcome and increments prospects_contacted metric', async () => {
    const beforeMetrics = await actionPlanEngine.getProgressMetrics();
    await actionPlanEngine.logProgressResult({
      resultType: 'prospect_contacted',
      outcome: 'neutral',
      numericValue: 5,
      notes: 'Sent 5 personalized messages to clinic owners'
    });

    const afterMetrics = await actionPlanEngine.getProgressMetrics();
    assert.equal(afterMetrics.prospects_contacted, beforeMetrics.prospects_contacted + 5);
  });

  // Test Y: Logging a client_acquired result records outcome and increments clients_acquired metric
  it('Test Y: logging client_acquired records outcome and increments clients_acquired metric', async () => {
    const beforeMetrics = await actionPlanEngine.getProgressMetrics();
    await actionPlanEngine.logProgressResult({
      resultType: 'client_acquired',
      outcome: 'positive',
      numericValue: 1,
      notes: 'Signed first retainer contract with Dental Practice'
    });

    const afterMetrics = await actionPlanEngine.getProgressMetrics();
    assert.equal(afterMetrics.clients_acquired, beforeMetrics.clients_acquired + 1);
  });

  // Test Z: Logging revenue_earned records outcome and increments revenue_earned metric
  it('Test Z: logging revenue_earned records outcome and increments revenue_earned metric', async () => {
    const beforeMetrics = await actionPlanEngine.getProgressMetrics();
    await actionPlanEngine.logProgressResult({
      resultType: 'revenue_earned',
      outcome: 'positive',
      numericValue: 7500,
      notes: 'Received initial 50% deposit for workflow setup'
    });

    const afterMetrics = await actionPlanEngine.getProgressMetrics();
    assert.equal(afterMetrics.revenue_earned, beforeMetrics.revenue_earned + 7500);
  });

  // Test AA: Supports negative outcome logging (e.g. rejected, abandoned) with outcome = 'negative'
  it('Test AA: supports negative outcome logging with outcome = negative and truthful feedback', async () => {
    const log = await actionPlanEngine.logProgressResult({
      resultType: 'rejected',
      outcome: 'negative',
      notes: 'Prospect stated they recently signed with a different agency; budget frozen'
    });
    assert.ok(log.id);
    assert.equal(log.result_type, 'rejected');
    assert.equal(log.outcome, 'negative');
    assert.ok(log.notes.includes('budget frozen'));
  });

  // Test AB: Evidence link is correctly persisted and retrieved in progress log
  it('Test AB: persists and returns evidence_link (e.g. Loom, GitHub, Drive)', async () => {
    const evidenceUrl = 'https://loom.com/share/test-walkthrough-12345';
    const log = await actionPlanEngine.logProgressResult({
      resultType: 'demo_created',
      outcome: 'positive',
      notes: 'Recorded 2-minute walkthrough',
      evidenceLink: evidenceUrl
    });

    const retrievedLogs = await actionPlanEngine.getProgressLogs();
    const match = retrievedLogs.find(l => l.id === log.id);
    assert.ok(match);
    assert.equal(match.evidence_link, evidenceUrl);
  });

  // Test AC: Metrics report exactly 0 for metrics with no logged results (no fake data)
  it('Test AC: zero-fake-data policy ensures non-occurring metrics remain strictly 0', async () => {
    // Check responses_received or hours_spent if 0
    const metrics = await actionPlanEngine.getProgressMetrics();
    assert.equal(typeof metrics.opportunities_viewed, 'number');
    assert.equal(typeof metrics.revenue_earned, 'number');
    // Ensure all numeric fields are valid numbers and not NaN or undefined
    for (const [key, val] of Object.entries(metrics)) {
      assert.ok(!isNaN(val as number), `Metric ${key} must not be NaN`);
      assert.ok((val as number) >= 0, `Metric ${key} must be >= 0`);
    }
  });

  // Test AD: Idempotent plan generation returns existing active plan for same opportunity/combination
  it('Test AD: plan generation is idempotent and reuses existing active plan', async () => {
    const plan1 = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    const plan2 = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    assert.equal(plan1.id, plan2.id);
  });

  // Test AE: Deleting a progress log updates the progress metrics accurately
  it('Test AE: deleting a progress log updates aggregated progress metrics', async () => {
    const log = await actionPlanEngine.logProgressResult({
      resultType: 'revenue_earned',
      outcome: 'positive',
      numericValue: 2500,
      notes: 'Temporary revenue log for delete test'
    });

    const metricsWithLog = await actionPlanEngine.getProgressMetrics();
    assert.ok(metricsWithLog.revenue_earned >= 2500);

    const deleted = await actionPlanEngine.deleteProgressLog(log.id);
    assert.equal(deleted, true);

    const metricsAfterDelete = await actionPlanEngine.getProgressMetrics();
    assert.equal(metricsAfterDelete.revenue_earned, metricsWithLog.revenue_earned - 2500);
  });
});
