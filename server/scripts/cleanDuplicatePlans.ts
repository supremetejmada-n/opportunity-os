import { dbAll, dbRun, initDatabase } from '../db/sqlite.js';

export async function cleanDuplicatePlans(): Promise<{ cleaned: number; kept: number }> {
  await initDatabase();

  // Find all action plans
  const plans = await dbAll<any>('SELECT id, user_id, opportunity_id, combination_id, title, status, created_at FROM action_plans ORDER BY created_at ASC');
  
  const grouped: Record<string, any[]> = {};
  for (const plan of plans) {
    const baseKey = plan.opportunity_id ? `opp:${plan.opportunity_id}` : (plan.combination_id ? `combo:${plan.combination_id}` : `title:${plan.title}`);
    const key = `${plan.user_id || 'user-default-legacy'}:::${baseKey}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(plan);
  }

  let cleaned = 0;
  let kept = 0;

  for (const key of Object.keys(grouped)) {
    const group = grouped[key];
    if (group.length <= 1) {
      kept += group.length;
      continue;
    }

    // Sort to prioritize in_progress or completed plans, or latest created
    group.sort((a, b) => {
      const statusScore = (s: string) => (s === 'completed' ? 3 : s === 'in_progress' ? 2 : 1);
      const scoreA = statusScore(a.status);
      const scoreB = statusScore(b.status);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Keep the best plan (index 0), delete any unstarted duplicates (index 1..N) if they have no completed steps
    kept++;
    for (let i = 1; i < group.length; i++) {
      const dup = group[i];
      // Check if duplicate has completed steps
      const completedSteps = await dbAll('SELECT id FROM action_steps WHERE action_plan_id = ? AND status = "completed"', [dup.id]);
      if (completedSteps.length === 0 && dup.status === 'not_started') {
        await dbRun('DELETE FROM action_steps WHERE action_plan_id = ?', [dup.id]);
        await dbRun('DELETE FROM progress_logs WHERE action_plan_id = ?', [dup.id]);
        await dbRun('DELETE FROM action_plans WHERE id = ?', [dup.id]);
        cleaned++;
      } else {
        kept++;
      }
    }
  }

  console.log(`[CleanDuplicatePlans] Cleaned ${cleaned} unstarted duplicate plans. Kept ${kept} active/completed plans.`);
  return { cleaned, kept };
}

if (process.argv[1]?.endsWith('cleanDuplicatePlans.ts') || process.argv[1]?.endsWith('cleanDuplicatePlans.js')) {
  cleanDuplicatePlans().catch(console.error);
}
