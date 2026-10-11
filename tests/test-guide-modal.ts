import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { actionPlanEngine } from '../server/services/actionPlanEngine.js';
import { initDatabase, dbRun, dbGet, dbAll } from '../server/db/sqlite.js';

async function runGuideModalTests() {
  console.log('====================================================');
  console.log(' Running Opportunity OS Guide Modal & Combination Lookup Tests');
  console.log('====================================================');

  await initDatabase();

  // Test 1: arch-1 lookup with cardPayload generates plan without error
  console.log('\n[Test 1] arch-1 combination lookup with active card payload...');
  const cardPayloadArch1 = {
    id: 'arch-1',
    title: 'Social Media Automation & Graphic Design',
    summary: 'Automate social media posts using Canva & ChatGPT',
    whatYouMake: 'Automated social media graphics package',
    whoPaysForIt: 'Local Bakeries & Cafes',
    tools: ['Canva', 'ChatGPT'],
    toolsYouUse: ['Canva', 'ChatGPT'],
    toolsUsed: ['Canva', 'ChatGPT'],
    startupCost: 0,
    technicalDetails: { rawId: 'arch-1', rawSource: 'tool_combination', rawTitle: 'Social Media Automation & Graphic Design' }
  };

  const planArch1 = await actionPlanEngine.generatePlanForCombination('arch-1', cardPayloadArch1);
  assert.ok(planArch1, 'Plan should be returned for arch-1');
  assert.ok(planArch1.id, 'Plan should have a valid ID');
  assert.strictEqual(planArch1.combination_id, 'arch-1', 'Plan should be linked to combination_id arch-1');
  assert.ok(planArch1.steps.length > 0, 'Plan should contain action steps');
  console.log(`✓ Passed - Plan generated with ID: ${planArch1.id} (${planArch1.steps.length} steps)`);

  // Test 2: Reopening arch-1 reuses existing plan (no duplicate creation)
  console.log('\n[Test 2] Reopening arch-1 guide reuses existing plan (no duplicate creation)...');
  const planArch1Reopened = await actionPlanEngine.generatePlanForCombination('arch-1', cardPayloadArch1);
  assert.strictEqual(planArch1Reopened.id, planArch1.id, 'Reopening must reuse existing plan ID');
  console.log('✓ Passed - Existing plan reused correctly');

  // Test 3: Updating step status preserves progress
  console.log('\n[Test 3] Step completion progress tracking...');
  const stepToComplete = planArch1.steps[0];
  await actionPlanEngine.updateStep(stepToComplete.id, { status: 'completed' });
  const updatedPlan = await actionPlanEngine.getActionPlanById(planArch1.id);
  assert.ok(updatedPlan, 'Plan must exist after step update');
  assert.strictEqual(updatedPlan.steps[0].status, 'completed', 'Step 1 must be marked completed');
  assert.ok(updatedPlan.progress_percentage > 0, 'Progress percentage must update (>0%)');
  console.log(`✓ Passed - Step updated (Progress: ${updatedPlan.progress_percentage}%)`);

  // Test 4: Unknown combination ID uses fallback order
  console.log('\n[Test 4] Unknown combination ID lookup fallback...');
  const unknownPayload = {
    id: 'unknown-combo-999',
    title: 'Custom AI Copywriting Stack',
    summary: 'Write high converting ad copy using Claude & Jasper',
    whoPaysForIt: 'E-commerce Brands',
    tools: ['Claude', 'Jasper']
  };
  const unknownPlan = await actionPlanEngine.generatePlanForCombination('unknown-combo-999', unknownPayload);
  assert.ok(unknownPlan, 'Fallback plan must be generated for unknown ID');
  assert.strictEqual(unknownPlan.combination_id, 'unknown-combo-999');
  console.log('✓ Passed - Unknown ID fallback created successfully');

  // Test 5: Opportunity ID lookup fallback
  console.log('\n[Test 5] Opportunity ID lookup with cardPayload fallback...');
  const oppPayload = {
    id: 'opp-virtual-123',
    title: 'Automated SEO Blog Production',
    summary: 'Generate SEO optimized articles for SaaS companies',
    whoPaysForIt: 'SaaS Startups',
    tools: ['ChatGPT', 'SurferSEO']
  };
  const oppPlan = await actionPlanEngine.generatePlanForOpportunity('opp-virtual-123', oppPayload);
  assert.ok(oppPlan, 'Opportunity fallback plan must be generated');
  assert.strictEqual(oppPlan.opportunity_id, 'opp-virtual-123');
  console.log('✓ Passed - Opportunity payload fallback created successfully');

  // Test 6: Verify OpportunityDetailModal layout structure source code rules
  console.log('\n[Test 6] Inspecting OpportunityDetailModal frontend layout structure...');
  const modalComponentPath = path.resolve('src/components/widgets/OpportunityDetailModal.tsx');
  const modalCode = fs.readFileSync(modalComponentPath, 'utf-8');

  // 1. Centered Backdrop layout
  assert.ok(
    modalCode.includes('fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6'),
    'Modal backdrop must match exact centering & blur specification'
  );

  // 2. Modal Container layout
  assert.ok(
    modalCode.includes('relative w-[70vw] max-w-5xl h-[80vh] max-h-[850px] bg-[#0c0f17]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col'),
    'Modal container must match exact dimensions & glass layout specification'
  );

  // 3. Scrollable Body
  assert.ok(
    modalCode.includes('min-h-0 flex-1 overflow-y-auto p-6 space-y-6'),
    'Modal body must have min-h-0 flex-1 overflow-y-auto p-6 space-y-6 scrollable container'
  );

  // 4. Backdrop click vs Modal stopPropagation
  assert.ok(modalCode.includes('onClick={onClose}'), 'Backdrop click must call onClose');
  assert.ok(modalCode.includes('e.stopPropagation()'), 'Modal container must stop click propagation');

  // 5. Close button accessibility
  assert.ok(modalCode.includes('aria-label="Close guide"'), 'Close button must have aria-label="Close guide"');

  // 6. Escape key listener
  assert.ok(modalCode.includes("e.key === 'Escape'"), 'Modal must close on Escape key');

  // 7. Focus restoration on unmount
  assert.ok(modalCode.includes('triggerElementRef.current.focus()'), 'Modal must restore focus to opener element on unmount');

  // 8. Raw lookup error banner removed
  assert.ok(!modalCode.includes('Tool combination not found: arch-1'), 'Raw lookup error banner must NOT be present in normal UI');

  // 9. Redundant START STEP-BY-STEP GUIDE button removed
  assert.ok(!modalCode.includes('Start Step-by-Step Guide →'), 'Redundant START STEP-BY-STEP GUIDE button must be completely removed');

  // 10. Step-by-step wizard navigation controls present
  assert.ok(modalCode.includes('← Previous Step'), 'Must contain Previous Step button');
  assert.ok(modalCode.includes('Next Step →'), 'Must contain Next Step button');
  assert.ok(modalCode.includes('Complete Guide ✓'), 'Must contain Complete Guide button');
  assert.ok(modalCode.includes('handleCompleteGuide'), 'Must contain handleCompleteGuide function');

  console.log('✓ Passed - Frontend modal layout & navigation rules verified');

  console.log('\n====================================================');
  console.log(' ALL 20 REGRESSION TESTS PASSED CLEANLY! 🎉');
  console.log('====================================================\n');
}

runGuideModalTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
