import { initDatabase, dbAll, dbGet } from '../server/db/sqlite.js';
import { learningEngine } from '../server/services/learningEngine.js';
import { opportunityEngine } from '../server/services/opportunityEngine.js';
import { getStoredCombinations } from '../server/services/combineEngine.js';

async function runAudit() {
  await initDatabase();
  await learningEngine.rebuildLearningProfile();
  console.log('=== PHASE 7 FINAL DATABASE AUDIT ===');

  // 1. Check duplicate signals
  const dups = await dbAll<any>(`
    SELECT source_type, source_id, signal_type, COUNT(*) as cnt
    FROM learning_signals
    GROUP BY source_type, source_id, signal_type
    HAVING cnt > 1
  `);
  console.log('1. Duplicate Learning Signals count:', dups.length);

  // 2. Check orphan signals
  const orphans = await dbAll<any>(`
    SELECT * FROM learning_signals
    WHERE (source_type = 'feedback' AND source_id NOT IN (SELECT id FROM feedback))
       OR (source_type = 'progress_log' AND source_id NOT IN (SELECT id FROM progress_logs))
       OR (source_type = 'action_plan' AND source_id NOT IN (SELECT id FROM action_plans))
  `);
  console.log('2. Orphan Learning Signals count:', orphans.length);

  // 3. Check abandoned_plan signals created by deletion
  // Any abandoned_plan signal whose source_id is not in action_plans and not in progress_logs
  const invalidAbandoned = await dbAll<any>(`
    SELECT * FROM learning_signals
    WHERE signal_type = 'abandoned_plan'
      AND source_type = 'action_plan'
      AND source_id NOT IN (SELECT id FROM action_plans)
  `);
  console.log('3. Invalid abandoned_plan signals from deletion:', invalidAbandoned.length);

  // 4. Check already_know signal weight and preference
  const akSignals = await dbAll<any>(`SELECT * FROM learning_signals WHERE signal_type = 'already_know'`);
  console.log('4. already_know signals in DB:', akSignals.length);
  for (const s of akSignals) {
    if (s.weight !== 0) {
      console.error('ERROR: already_know signal has non-zero weight:', s);
    }
  }

  // 5. Check adjustments bounds (-10 to +10) across DB
  const opps = await dbAll<any>(`SELECT id, learning_adjustment FROM opportunities WHERE learning_adjustment IS NOT NULL`);
  let oppAdjBounded = true;
  for (const o of opps) {
    if (o.learning_adjustment < -10 || o.learning_adjustment > 10) {
      oppAdjBounded = false;
      console.error('ERROR: Opportunity learning_adjustment out of bounds:', o);
    }
  }

  const combos = await dbAll<any>(`SELECT id, learning_adjustment FROM tool_combinations WHERE learning_adjustment IS NOT NULL`);
  let comboAdjBounded = true;
  for (const c of combos) {
    if (c.learning_adjustment < -10 || c.learning_adjustment > 10) {
      comboAdjBounded = false;
      console.error('ERROR: Combination learning_adjustment out of bounds:', c);
    }
  }
  console.log('5. All learning_adjustments strictly bounded to [-10, 10]:', oppAdjBounded && comboAdjBounded);

  // 6. Check base score threshold (eval candidates must have base score >= 65 before learning adjustment)
  const evalOpps = await opportunityEngine.evaluateOpportunities();
  let baseThresholdValid = true;
  for (const opp of evalOpps) {
    // Base score is score minus learning_adjustment
    const baseScore = opp.score - (opp.learningAdjustment || 0);
    if (baseScore < 65) {
      baseThresholdValid = false;
      console.error('ERROR: Candidate with base score < 65 was returned:', opp.id, baseScore);
    }
  }
  console.log('6. Base score threshold (>= 65) strictly enforced for all evaluated candidates:', baseThresholdValid);

  // 7. Explanations lookup resolution
  const profile = await learningEngine.getLearningProfile();
  console.log('7. Learning profile total signals:', profile.total_signals, '| confidence:', profile.confidence_score);
  console.log('Audit completed successfully.');
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
