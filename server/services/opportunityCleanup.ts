import { dbAll, dbGet, dbRun } from '../db/sqlite.js';
import { getCanonicalOpportunityKey, mergeOpportunityRecords } from './canonicalIdentity.js';

export interface CleanupResult {
  oppClustersFound: number;
  oppRecordsMerged: number;
  oppsRemaining: number;
  comboClustersFound: number;
  comboRecordsMerged: number;
  combosRemaining: number;
  actionPlansPreserved: number;
  progressLogsPreserved: number;
}

/**
 * Audits, clusters, and deduplicates existing records in SQLite database safely.
 * Migrates action_plans, progress_logs, and feedback references to the canonical record ID before deleting redundant entries.
 */
export async function cleanExistingDuplicates(): Promise<CleanupResult> {
  console.log('[Deduplication Engine] Initiating cleanup of duplicate recommendations...');

  let oppClustersFound = 0;
  let oppRecordsMerged = 0;
  let comboClustersFound = 0;
  let comboRecordsMerged = 0;

  // 1. DEDUPLICATE OPPORTUNITIES
  const allOpps = await dbAll<any>('SELECT * FROM opportunities;');
  const oppMap = new Map<string, any[]>();

  for (const opp of allOpps) {
    const key = opp.canonical_key || getCanonicalOpportunityKey({
      title: opp.title,
      summary: opp.summary,
      workflow: safeParseJSON(opp.workflow, []),
      requiredTools: safeParseJSON(opp.required_tools, []),
      customerType: opp.customer_type,
      targetCustomer: opp.target_customer
    });

    // Update canonical_key in DB if missing
    if (!opp.canonical_key) {
      await dbRun('UPDATE opportunities SET canonical_key = ? WHERE id = ?;', [key, opp.id]);
      opp.canonical_key = key;
    }

    const clusterKey = `${opp.user_id || 'user-default-legacy'}:::${key}`;
    const cluster = oppMap.get(clusterKey) || [];
    cluster.push(opp);
    oppMap.set(clusterKey, cluster);
  }

  // Process clusters with multiple records
  for (const [key, cluster] of oppMap.entries()) {
    if (cluster.length <= 1) continue;

    oppClustersFound++;

    // Find if any record has action plans attached
    const recordsWithPlans = new Set<string>();
    for (const item of cluster) {
      const plan = await dbGet('SELECT id FROM action_plans WHERE opportunity_id = ?;', [item.id]);
      if (plan) recordsWithPlans.add(item.id);
    }

    // Sort cluster to pick the primary canonical record to keep
    cluster.sort((a, b) => {
      // 1. Saved records first
      if (b.saved !== a.saved) return (b.saved ? 1 : 0) - (a.saved ? 1 : 0);

      // 2. Records with action plans next
      const aHasPlan = recordsWithPlans.has(a.id) ? 1 : 0;
      const bHasPlan = recordsWithPlans.has(b.id) ? 1 : 0;
      if (bHasPlan !== aHasPlan) return bHasPlan - aHasPlan;

      // 3. Higher score
      return Number(b.score || 0) - Number(a.score || 0);
    });

    const canonicalRecord = cluster[0];
    const redundantRecords = cluster.slice(1);

    for (const redundant of redundantRecords) {
      // Merge evidence, discovery IDs, tool IDs, and saved status onto canonical record
      mergeOpportunityRecords(canonicalRecord, redundant);

      // Migrate references in action_plans
      await dbRun('UPDATE action_plans SET opportunity_id = ? WHERE opportunity_id = ?;', [canonicalRecord.id, redundant.id]);

      // Migrate references in progress_logs
      await dbRun('UPDATE progress_logs SET opportunity_id = ? WHERE opportunity_id = ?;', [canonicalRecord.id, redundant.id]);

      // Migrate references in feedback
      await dbRun('UPDATE feedback SET opportunity_id = ? WHERE opportunity_id = ?;', [canonicalRecord.id, redundant.id]);

      // Delete redundant record
      await dbRun('DELETE FROM opportunities WHERE id = ?;', [redundant.id]);
      oppRecordsMerged++;
    }

    // Save updated canonical record
    await dbRun(`
      UPDATE opportunities SET
        saved = ?,
        score = ?,
        discovery_ids = ?,
        tool_ids = ?,
        summary = ?,
        status = ?,
        canonical_key = ?
      WHERE id = ?;
    `, [
      canonicalRecord.saved ? 1 : 0,
      canonicalRecord.score,
      JSON.stringify(canonicalRecord.discoveryIds || safeParseJSON(canonicalRecord.discovery_ids, [])),
      JSON.stringify(canonicalRecord.toolIds || safeParseJSON(canonicalRecord.tool_ids, [])),
      canonicalRecord.summary,
      canonicalRecord.status,
      canonicalRecord.canonical_key,
      canonicalRecord.id
    ]);
  }

  // 2. DEDUPLICATE TOOL COMBINATIONS
  const allCombos = await dbAll<any>('SELECT * FROM tool_combinations;');
  const comboMap = new Map<string, any[]>();

  for (const combo of allCombos) {
    const key = combo.canonical_key || getCanonicalOpportunityKey({
      title: combo.title,
      summary: combo.summary,
      workflow: safeParseJSON(combo.workflow_steps, []),
      requiredTools: safeParseJSON(combo.tool_names, []),
      customerType: combo.customer_type,
      targetCustomer: combo.target_customer,
      workflowPattern: combo.workflow_pattern
    });

    if (!combo.canonical_key) {
      await dbRun('UPDATE tool_combinations SET canonical_key = ? WHERE id = ?;', [key, combo.id]);
      combo.canonical_key = key;
    }

    const clusterKey = `${combo.user_id || 'user-default-legacy'}:::${key}`;
    const cluster = comboMap.get(clusterKey) || [];
    cluster.push(combo);
    comboMap.set(clusterKey, cluster);
  }

  for (const [key, cluster] of comboMap.entries()) {
    if (cluster.length <= 1) continue;

    comboClustersFound++;

    const recordsWithPlans = new Set<string>();
    for (const item of cluster) {
      const plan = await dbGet('SELECT id FROM action_plans WHERE combination_id = ?;', [item.id]);
      if (plan) recordsWithPlans.add(item.id);
    }

    cluster.sort((a, b) => {
      const aHasPlan = recordsWithPlans.has(a.id) ? 1 : 0;
      const bHasPlan = recordsWithPlans.has(b.id) ? 1 : 0;
      if (bHasPlan !== aHasPlan) return bHasPlan - aHasPlan;

      if (b.saved !== a.saved) return (b.saved ? 1 : 0) - (a.saved ? 1 : 0);

      // Prefer smaller tool count for equivalent outcome
      const toolsA = safeParseJSON(a.tool_ids, []).length;
      const toolsB = safeParseJSON(b.tool_ids, []).length;
      if (toolsA !== toolsB) return toolsA - toolsB;

      return Number(b.score || 0) - Number(a.score || 0);
    });

    const canonicalRecord = cluster[0];
    const redundantRecords = cluster.slice(1);

    for (const redundant of redundantRecords) {
      if (redundant.saved) canonicalRecord.saved = 1;

      await dbRun('UPDATE action_plans SET combination_id = ? WHERE combination_id = ?;', [canonicalRecord.id, redundant.id]);
      await dbRun('UPDATE progress_logs SET combination_id = ? WHERE combination_id = ?;', [canonicalRecord.id, redundant.id]);
      await dbRun('UPDATE feedback SET combination_id = ? WHERE combination_id = ?;', [canonicalRecord.id, redundant.id]);

      await dbRun('DELETE FROM tool_combinations WHERE id = ?;', [redundant.id]);
      comboRecordsMerged++;
    }

    await dbRun('UPDATE tool_combinations SET saved = ?, canonical_key = ? WHERE id = ?;', [
      canonicalRecord.saved ? 1 : 0,
      canonicalRecord.canonical_key,
      canonicalRecord.id
    ]);
  }

  const remainingOpps = await dbAll('SELECT id FROM opportunities;');
  const remainingCombos = await dbAll('SELECT id FROM tool_combinations;');
  const actionPlans = await dbAll('SELECT id FROM action_plans;');
  const progressLogs = await dbAll('SELECT id FROM progress_logs;');

  const result: CleanupResult = {
    oppClustersFound,
    oppRecordsMerged,
    oppsRemaining: remainingOpps.length,
    comboClustersFound,
    comboRecordsMerged,
    combosRemaining: remainingCombos.length,
    actionPlansPreserved: actionPlans.length,
    progressLogsPreserved: progressLogs.length
  };

  console.log('[Deduplication Engine] Cleanup completed:', result);
  return result;
}

function safeParseJSON(input: any, fallback: any): any {
  if (!input) return fallback;
  if (typeof input === 'object') return input;
  try {
    return JSON.parse(input);
  } catch {
    return fallback;
  }
}
