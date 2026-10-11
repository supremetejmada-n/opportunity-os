import { actionPlanEngine } from '../server/services/actionPlanEngine.js';
import { learningEngine } from '../server/services/learningEngine.js';
import { initDatabase, dbRun, dbGet, dbAll } from '../server/db/sqlite.js';

async function testDataTruthfulness() {
  console.log('================================================================');
  console.log(' RUNNING FULL WEBSITE DATA TRUTHFULNESS INTEGRITY SUITE ');
  console.log('================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failedCount++;
    }
  }

  try {
    await initDatabase();

    // 1. Clean test state for truthfulness test
    await dbRun('DELETE FROM progress_logs;');
    await dbRun('DELETE FROM action_steps;');
    await dbRun('DELETE FROM action_plans;');
    await dbRun('DELETE FROM learning_signals;');
    await dbRun('DELETE FROM skills;');
    await dbRun('DELETE FROM tools;');
    await dbRun('DELETE FROM goals;');
    await dbRun('DELETE FROM interests;');
    await dbRun('DELETE FROM projects;');
    await dbRun('UPDATE opportunities SET saved = 0;');
    await dbRun('UPDATE tool_combinations SET saved = 0;');

    // Test 1: Fresh DB Progress Metrics are all 0
    const metrics = await actionPlanEngine.getProgressMetrics();
    assert(metrics.opportunities_saved === 0, '1. Fresh DB opportunities_saved is 0');
    assert(metrics.opportunities_attempted === 0, '2. Fresh DB opportunities_attempted is 0');
    assert(metrics.demos_created === 0, '3. Fresh DB demos_created is 0');
    assert(metrics.prospects_contacted === 0, '4. Fresh DB prospects_contacted is 0');
    assert(metrics.responses_received === 0, '5. Fresh DB responses_received is 0');
    assert(metrics.clients_acquired === 0, '6. Fresh DB clients_acquired is 0');
    assert(metrics.revenue_earned === 0, '7. Fresh DB revenue_earned is 0');
    assert(metrics.hours_spent === 0, '8. Fresh DB hours_spent is 0');

    // Test 2: getCurrentActivePlan returns null on fresh DB
    const activePlan = await actionPlanEngine.getCurrentActivePlan();
    assert(activePlan === null, '9. Fresh DB getCurrentActivePlan() returns null');

    // Test 3: Generate action plan starts as status "not_started" with 0% progress
    const testOppId = 'truth_test_opp_1';
    await dbRun(
      `INSERT OR REPLACE INTO opportunities (id, title, summary, required_tools, difficulty)
       VALUES (?, 'Truth Test Opportunity', 'Summary', '["Gemini"]', 'Easy')`,
      [testOppId]
    );

    const generatedPlan = await actionPlanEngine.generatePlanForOpportunity(testOppId);
    assert(generatedPlan.status === 'not_started', '10. Newly generated plan status is "not_started"');
    assert(generatedPlan.progress_percentage === 0, '11. Newly generated plan progress_percentage is 0%');
    assert(generatedPlan.completed_steps_count === 0, '12. Newly generated plan completed_steps_count is 0');

    const allStepsNotStarted = generatedPlan.steps.every(s => s.status === 'not_started');
    assert(allStepsNotStarted, '13. All steps in newly generated plan are status "not_started"');

    // Test 4: Explicitly starting plan transitions status to in_progress and step 1 to in_progress
    const startedPlan = await actionPlanEngine.startPlan(generatedPlan.id);
    assert(startedPlan.status === 'in_progress', '14. Explicitly started plan status is "in_progress"');
    assert(startedPlan.steps[0].status === 'in_progress', '15. Step 1 status is "in_progress" after startPlan()');

    const metricsAfterStart = await actionPlanEngine.getProgressMetrics();
    assert(metricsAfterStart.opportunities_attempted === 1, '16. opportunities_attempted count is 1 after startPlan()');

    // Test 5: Completing step 1 updates progress percentage deterministically
    const updatedStep = await actionPlanEngine.updateStep(startedPlan.steps[0].id, { status: 'completed' });
    assert(updatedStep.status === 'completed', '17. Step 1 status is "completed" after updateStep()');

    const planAfterStep1 = await actionPlanEngine.getActionPlanById(generatedPlan.id);
    assert(planAfterStep1?.completed_steps_count === 1, '18. completed_steps_count is 1 after completing Step 1');
    assert((planAfterStep1?.progress_percentage || 0) > 0, '19. progress_percentage > 0% after completing Step 1');

    // Verify learning signal was recorded on real step completion
    const stepSignal = await dbGet('SELECT * FROM learning_signals WHERE source_id = ?', [startedPlan.steps[0].id]);
    assert(Boolean(stepSignal), '20. Learning signal created for real step completion');

    // Test 6: Completing all steps transitions plan status to "completed"
    for (let i = 1; i < planAfterStep1!.steps.length; i++) {
      await actionPlanEngine.updateStep(planAfterStep1!.steps[i].id, { status: 'completed' });
    }

    const completedPlan = await actionPlanEngine.getActionPlanById(generatedPlan.id);
    assert(completedPlan?.status === 'completed', '21. Plan status becomes "completed" after all steps finished');
    assert(completedPlan?.progress_percentage === 100, '22. Plan progress_percentage becomes 100%');

    // Test 7: Logging real revenue and client result updates metrics truthfully
    await actionPlanEngine.logProgressResult({
      actionPlanId: generatedPlan.id,
      resultType: 'revenue_earned',
      numericValue: 5000,
      notes: 'Real client payment received'
    });

    await actionPlanEngine.logProgressResult({
      actionPlanId: generatedPlan.id,
      resultType: 'client_acquired',
      numericValue: 1,
      notes: 'Real client signed'
    });

    const metricsAfterResult = await actionPlanEngine.getProgressMetrics();
    assert(metricsAfterResult.revenue_earned === 5000, '23. revenue_earned is 5000 after real log');
    assert(metricsAfterResult.clients_acquired === 1, '24. clients_acquired is 1 after real log');

    console.log(`\n================================================================`);
    console.log(` TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED `);
    console.log(`================================================================`);

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Data truthfulness test error:', err);
    process.exit(1);
  }
}

testDataTruthfulness();
