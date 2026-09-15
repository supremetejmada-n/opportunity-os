import crypto from 'crypto';
import { dbAll, dbGet, dbRun } from '../db/sqlite.js';
import {
  LearningSignal,
  LearningSignalType,
  LearningSourceType,
  FeedbackRecord,
  FeedbackRating,
  UserLearningProfile,
  PreferenceDimension,
  LearningExplanation,
  Opportunity,
  ToolCombination
} from '../../src/types/index.js';

// ============================================================================
// Initial Signal Weight Matrix (Centralized & Deterministic)
// ============================================================================

export const INITIAL_SIGNAL_WEIGHTS: Record<LearningSignalType, number> = {
  revenue_earned: 10,
  client_acquired: 10,
  response_received: 6,
  demo_created: 5,
  portfolio_published: 5,
  completed_plan: 4,
  prospect_contacted: 4,
  tried: 3,
  saved: 3,
  useful: 3,
  relevant: 3,
  started_plan: 2,
  completed_step: 1,
  abandoned_plan: -5,
  rejected: -3,
  not_relevant: -3,
  not_useful: -3,
  ignored: -1
};

export const MAX_LEARNING_ADJUSTMENT = 10; // Bounded max adjustment: ±10 points

// ============================================================================
// Helper Utilities
// ============================================================================

export function calculateRecencyFactor(createdAtStr?: string): number {
  if (!createdAtStr) return 1.0;
  const createdTime = new Date(createdAtStr).getTime();
  if (isNaN(createdTime)) return 1.0;

  const ageMs = Date.now() - createdTime;
  const ageDays = Math.max(0, ageMs / (1000 * 60 * 60 * 24));

  if (ageDays <= 7) return 1.0;
  if (ageDays <= 30) return 0.85;
  if (ageDays <= 90) return 0.7;
  return 0.5;
}

export function calculateConfidence(positiveCount: number, negativeCount: number): number {
  const total = positiveCount + negativeCount;
  if (total === 0) return 0.0;

  // Consistency ratio: 1.0 if purely positive or negative, 0.5 if 50/50 split
  const consistency = Math.abs(positiveCount - negativeCount) / total;

  // Count scaling factor: 0.2 for 1 event, 0.6 for 3 events, 1.0 for 5+ events
  const countFactor = Math.min(1.0, total / 5.0);

  return Math.min(1.0, Math.max(0.0, Number((consistency * countFactor).toFixed(2))));
}

// ============================================================================
// Core Learning Engine Service
// ============================================================================

export class LearningEngine {
  /**
   * Records a single learning signal idempotently (prevents duplicate counting).
   */
  async recordSignal(params: {
    sourceType: LearningSourceType;
    sourceId: string;
    signalType: LearningSignalType;
    signalValue?: number;
    category?: string;
    toolName?: string;
    createdAt?: string;
  }): Promise<LearningSignal | null> {
    const { sourceType, sourceId, signalType } = params;
    const signalValue = params.signalValue !== undefined ? params.signalValue : 1.0;
    const category = params.category || undefined;
    const toolName = params.toolName || undefined;
    const createdAt = params.createdAt || new Date().toISOString();

    const weight = INITIAL_SIGNAL_WEIGHTS[signalType] ?? 0;

    // Idempotency check: verify tuple (source_type, source_id, signal_type) doesn't exist
    const existing = await dbGet<any>(
      'SELECT * FROM learning_signals WHERE source_type = ? AND source_id = ? AND signal_type = ?',
      [sourceType, sourceId, signalType]
    );

    if (existing) {
      return {
        id: existing.id,
        source_type: existing.source_type as LearningSourceType,
        source_id: existing.source_id,
        signal_type: existing.signal_type as LearningSignalType,
        signal_value: existing.signal_value,
        weight: existing.weight,
        category: existing.category || undefined,
        tool_name: existing.tool_name || undefined,
        created_at: existing.created_at
      };
    }

    const id = crypto.randomUUID();
    await dbRun(
      `INSERT INTO learning_signals (id, source_type, source_id, signal_type, signal_value, weight, category, tool_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, sourceType, sourceId, signalType, signalValue, weight, category || null, toolName || null, createdAt]
    );

    return {
      id,
      source_type: sourceType,
      source_id: sourceId,
      signal_type: signalType,
      signal_value: signalValue,
      weight,
      category,
      tool_name: toolName,
      created_at: createdAt
    };
  }

  /**
   * Records structured user feedback on an Opportunity or Combination
   */
  async recordFeedback(params: {
    sourceType: 'opportunity' | 'combination';
    sourceId: string;
    rating: FeedbackRating;
    reason?: string;
    comments?: string;
  }): Promise<FeedbackRecord> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const oppId = params.sourceType === 'opportunity' ? params.sourceId : null;
    const comboId = params.sourceType === 'combination' ? params.sourceId : null;

    await dbRun(
      `INSERT INTO feedback (id, source_type, source_id, opportunity_id, combination_id, rating, reason, comments, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, params.sourceType, params.sourceId, oppId, comboId, params.rating, params.reason || null, params.comments || null, now]
    );

    // Map rating to learning signal type
    let signalType: LearningSignalType = 'useful';
    if (params.rating === 'useful' || params.rating === 'save') signalType = 'useful';
    else if (params.rating === 'not_useful' || params.rating === 'ignore') signalType = 'not_useful';
    else if (params.rating === 'not_relevant') signalType = 'not_relevant';
    else if (params.rating === 'tried') signalType = 'tried';

    // Extract item category or tool details for domain-specific learning
    let itemCategory: string | undefined;
    let itemTool: string | undefined;

    if (params.sourceType === 'opportunity') {
      const opp = await dbGet<any>('SELECT * FROM opportunities WHERE id = ?', [params.sourceId]);
      if (opp) {
        itemCategory = opp.customer_type || opp.service_type || undefined;
      }
    } else if (params.sourceType === 'combination') {
      const combo = await dbGet<any>('SELECT * FROM tool_combinations WHERE id = ?', [params.sourceId]);
      if (combo) {
        itemCategory = combo.workflow_pattern || combo.customer_type || undefined;
        try {
          const tools = JSON.parse(combo.tool_names || '[]');
          if (tools.length > 0) itemTool = tools[0];
        } catch {}
      }
    }

    await this.recordSignal({
      sourceType: 'feedback',
      sourceId: id,
      signalType,
      category: itemCategory,
      toolName: itemTool,
      createdAt: now
    });

    // Automatically refresh learning profile summary
    await this.rebuildLearningProfile();

    return {
      id,
      source_type: params.sourceType,
      source_id: params.sourceId,
      opportunity_id: oppId,
      combination_id: comboId,
      rating: params.rating,
      reason: params.reason || null,
      comments: params.comments || null,
      created_at: now
    };
  }

  /**
   * Retrieves all submitted feedback records
   */
  async getFeedback(params?: { sourceType?: string; sourceId?: string }): Promise<FeedbackRecord[]> {
    let query = 'SELECT * FROM feedback WHERE 1=1';
    const args: any[] = [];
    if (params?.sourceType) {
      query += ' AND source_type = ?';
      args.push(params.sourceType);
    }
    if (params?.sourceId) {
      query += ' AND source_id = ?';
      args.push(params.sourceId);
    }
    query += ' ORDER BY created_at DESC';

    const rows = await dbAll<any>(query, args);
    return rows.map(r => ({
      id: r.id,
      source_type: r.source_type as any,
      source_id: r.source_id,
      opportunity_id: r.opportunity_id || null,
      combination_id: r.combination_id || null,
      rating: r.rating as FeedbackRating,
      reason: r.reason || null,
      comments: r.comments || null,
      created_at: r.created_at
    }));
  }

  /**
   * Retrieves raw learning signals from database
   */
  async getLearningSignals(params?: { sourceType?: string; limit?: number }): Promise<LearningSignal[]> {
    let query = 'SELECT * FROM learning_signals WHERE 1=1';
    const args: any[] = [];

    if (params?.sourceType) {
      query += ' AND source_type = ?';
      args.push(params.sourceType);
    }
    query += ' ORDER BY created_at DESC';
    if (params?.limit) {
      query += ' LIMIT ?';
      args.push(params.limit);
    }

    const rows = await dbAll<any>(query, args);
    return rows.map(r => ({
      id: r.id,
      source_type: r.source_type as LearningSourceType,
      source_id: r.source_id,
      signal_type: r.signal_type as LearningSignalType,
      signal_value: r.signal_value,
      weight: r.weight,
      category: r.category || undefined,
      tool_name: r.tool_name || undefined,
      created_at: r.created_at
    }));
  }

  /**
   * Rebuilds the user learning profile idempotently from raw SQLite evidence tables.
   */
  async rebuildLearningProfile(): Promise<UserLearningProfile> {
    // 1. Sync signals from progress_logs
    const logs = await dbAll<any>('SELECT * FROM progress_logs');
    for (const log of logs) {
      const typeMap: Record<string, LearningSignalType> = {
        demo_created: 'demo_created',
        prospect_contacted: 'prospect_contacted',
        response_received: 'response_received',
        client_acquired: 'client_acquired',
        revenue_earned: 'revenue_earned',
        rejected: 'rejected',
        abandoned: 'abandoned_plan'
      };
      if (typeMap[log.result_type]) {
        await this.recordSignal({
          sourceType: 'progress_log',
          sourceId: log.id,
          signalType: typeMap[log.result_type],
          signalValue: log.numeric_value !== null ? log.numeric_value : 1.0,
          createdAt: log.created_at
        });
      }
    }

    // 2. Sync signals from action_plans
    const plans = await dbAll<any>('SELECT * FROM action_plans');
    for (const plan of plans) {
      if (plan.status === 'in_progress') {
        await this.recordSignal({
          sourceType: 'action_plan',
          sourceId: plan.id,
          signalType: 'started_plan',
          createdAt: plan.created_at
        });
      } else if (plan.status === 'completed') {
        await this.recordSignal({
          sourceType: 'action_plan',
          sourceId: plan.id,
          signalType: 'completed_plan',
          createdAt: plan.updated_at || plan.created_at
        });
      } else if (plan.status === 'abandoned') {
        await this.recordSignal({
          sourceType: 'action_plan',
          sourceId: plan.id,
          signalType: 'abandoned_plan',
          createdAt: plan.updated_at || plan.created_at
        });
      }
    }

    // 3. Sync signals from saved/ignored opportunities & combinations
    const opps = await dbAll<any>('SELECT * FROM opportunities WHERE saved = 1 OR status = "ignored"');
    for (const opp of opps) {
      if (opp.saved) {
        await this.recordSignal({
          sourceType: 'opportunity',
          sourceId: opp.id,
          signalType: 'saved',
          category: opp.customer_type || opp.service_type || undefined,
          createdAt: opp.created_at
        });
      }
      if (opp.status === 'ignored') {
        await this.recordSignal({
          sourceType: 'opportunity',
          sourceId: opp.id,
          signalType: 'ignored',
          category: opp.customer_type || opp.service_type || undefined,
          createdAt: opp.created_at
        });
      }
    }

    const combos = await dbAll<any>('SELECT * FROM tool_combinations WHERE saved = 1');
    for (const combo of combos) {
      await this.recordSignal({
        sourceType: 'combination',
        sourceId: combo.id,
        signalType: 'saved',
        category: combo.workflow_pattern || undefined,
        createdAt: combo.created_at
      });
    }

    // 4. Clean orphan signals whose source items were deleted
    await dbRun(`
      DELETE FROM learning_signals
      WHERE (source_type = 'feedback' AND source_id NOT IN (SELECT id FROM feedback))
         OR (source_type = 'progress_log' AND source_id NOT IN (SELECT id FROM progress_logs))
         OR (source_type = 'action_plan' AND source_id NOT IN (SELECT id FROM action_plans))
    `);

    // 5. Aggregate all active signals into structured preference dimensions
    const signals = await dbAll<any>('SELECT * FROM learning_signals');

    const categoriesMap: Record<string, { pos: number; neg: number; net: number; count: number }> = {};
    const toolsMap: Record<string, { pos: number; neg: number; net: number; count: number }> = {};
    const workTypesMap: Record<string, { pos: number; neg: number; net: number; count: number }> = {};
    const capabilitiesMap: Record<string, { pos: number; neg: number; net: number; count: number }> = {};

    for (const s of signals) {
      const recency = calculateRecencyFactor(s.created_at);
      const effectiveWeight = s.weight * recency;
      const isPositive = s.weight > 0;

      const keysToUpdate: { map: any; key: string }[] = [];

      if (s.category) {
        keysToUpdate.push({ map: categoriesMap, key: s.category.toLowerCase().trim() });
      }
      if (s.tool_name) {
        keysToUpdate.push({ map: toolsMap, key: s.tool_name.toLowerCase().trim() });
      }

      for (const item of keysToUpdate) {
        if (!item.map[item.key]) {
          item.map[item.key] = { pos: 0, neg: 0, net: 0, count: 0 };
        }
        if (isPositive) item.map[item.key].pos += 1;
        else item.map[item.key].neg += 1;
        item.map[item.key].net += effectiveWeight;
        item.map[item.key].count += 1;
      }
    }

    const formatDimensions = (map: Record<string, { pos: number; neg: number; net: number; count: number }>) => {
      const res: Record<string, PreferenceDimension> = {};
      for (const [k, v] of Object.entries(map)) {
        res[k] = {
          key: k,
          positive: v.pos,
          negative: v.neg,
          net_weight: Number(v.net.toFixed(2)),
          confidence: calculateConfidence(v.pos, v.neg),
          sample_count: v.count
        };
      }
      return res;
    };

    const prefCategories = formatDimensions(categoriesMap);
    const prefTools = formatDimensions(toolsMap);
    const prefWorkTypes = formatDimensions(workTypesMap);
    const prefCapabilities = formatDimensions(capabilitiesMap);

    const totalSignals = signals.length;
    const overallPos = signals.filter((s: any) => s.weight > 0).length;
    const overallNeg = signals.filter((s: any) => s.weight < 0).length;
    const overallConfidence = calculateConfidence(overallPos, overallNeg);

    const now = new Date().toISOString();

    await dbRun(
      `INSERT OR REPLACE INTO learning_profile (
        id, preferred_categories, preferred_capabilities, preferred_tools, preferred_work_types, total_signals, confidence_score, updated_at
      ) VALUES ('user_learning_profile', ?, ?, ?, ?, ?, ?, ?)`,
      [
        JSON.stringify(prefCategories),
        JSON.stringify(prefCapabilities),
        JSON.stringify(prefTools),
        JSON.stringify(prefWorkTypes),
        totalSignals,
        overallConfidence,
        now
      ]
    );

    return {
      id: 'user_learning_profile',
      preferred_categories: prefCategories,
      preferred_capabilities: prefCapabilities,
      preferred_tools: prefTools,
      preferred_work_types: prefWorkTypes,
      total_signals: totalSignals,
      confidence_score: overallConfidence,
      updated_at: now
    };
  }

  /**
   * Retrieves stored user learning profile
   */
  async getLearningProfile(): Promise<UserLearningProfile> {
    const raw = await dbGet<any>('SELECT * FROM learning_profile WHERE id = "user_learning_profile"');
    if (!raw) {
      return await this.rebuildLearningProfile();
    }

    const parseMap = (str?: string) => {
      try {
        return JSON.parse(str || '{}');
      } catch {
        return {};
      }
    };

    return {
      id: 'user_learning_profile',
      preferred_categories: parseMap(raw.preferred_categories),
      preferred_capabilities: parseMap(raw.preferred_capabilities),
      preferred_tools: parseMap(raw.preferred_tools),
      preferred_work_types: parseMap(raw.preferred_work_types),
      total_signals: raw.total_signals || 0,
      confidence_score: raw.confidence_score || 0,
      updated_at: raw.updated_at || new Date().toISOString()
    };
  }

  /**
   * Calculates bounded learning adjustment for an Opportunity (clamped to max ±10 points).
   */
  async calculateOpportunityAdjustment(opp: {
    id: string;
    title: string;
    summary?: string;
    customer_type?: string;
    customerType?: string;
    required_tools?: string[];
    requiredTools?: string[];
  }): Promise<{ adjustment: number; explanation: string }> {
    const profile = await this.getLearningProfile();
    if (profile.total_signals === 0) {
      return {
        adjustment: 0,
        explanation: 'Learning adjustment is neutral (0 pts) because no user behavior signals exist yet.'
      };
    }

    let rawAdj = 0;
    const contributing: string[] = [];

    // Category match
    const categoryKey = (opp.customer_type || opp.customerType || '').toLowerCase().trim();
    if (categoryKey && profile.preferred_categories[categoryKey]) {
      const dim = profile.preferred_categories[categoryKey];
      if (dim.confidence > 0) {
        const catAdj = dim.net_weight * dim.confidence * 0.3;
        rawAdj += catAdj;
        if (catAdj !== 0) {
          contributing.push(`${catAdj > 0 ? '+' : ''}${catAdj.toFixed(1)} pts from '${categoryKey}' category signal`);
        }
      }
    }

    // Tool matches
    const tools = opp.required_tools || opp.requiredTools || [];
    for (const tool of tools) {
      const tKey = tool.toLowerCase().trim();
      if (profile.preferred_tools[tKey]) {
        const dim = profile.preferred_tools[tKey];
        if (dim.confidence > 0) {
          const tAdj = dim.net_weight * dim.confidence * 0.25;
          rawAdj += tAdj;
          if (tAdj !== 0) {
            contributing.push(`${tAdj > 0 ? '+' : ''}${tAdj.toFixed(1)} pts from tool '${tool}' preference`);
          }
        }
      }
    }

    // Strictly clamp adjustment to ±10 points
    const adjustment = Math.max(-MAX_LEARNING_ADJUSTMENT, Math.min(MAX_LEARNING_ADJUSTMENT, Math.round(rawAdj)));

    let explanation: string;
    if (adjustment > 0) {
      explanation = `Recommended with a +${adjustment} pt personalization boost based on your past positive results with ${contributing.slice(0, 2).join(' and ') || 'similar opportunities'}.`;
    } else if (adjustment < 0) {
      explanation = `Assigned a ${adjustment} pt personalization adjustment due to past rejections or negative feedback for similar candidate types.`;
    } else {
      explanation = 'Personalization score adjustment is neutral.';
    }

    return { adjustment, explanation };
  }

  /**
   * Calculates bounded learning adjustment for a Tool Combination (clamped to max ±10 points).
   */
  async calculateCombinationAdjustment(combo: {
    id: string;
    title: string;
    workflow_pattern?: string;
    workflowPattern?: string;
    tool_names?: string[];
    toolNames?: string[];
  }): Promise<{ adjustment: number; explanation: string }> {
    const profile = await this.getLearningProfile();
    if (profile.total_signals === 0) {
      return {
        adjustment: 0,
        explanation: 'Learning adjustment is neutral (0 pts) because no user behavior signals exist yet.'
      };
    }

    let rawAdj = 0;
    const contributing: string[] = [];

    // Workflow pattern match
    const patternKey = (combo.workflow_pattern || combo.workflowPattern || '').toLowerCase().trim();
    if (patternKey && profile.preferred_categories[patternKey]) {
      const dim = profile.preferred_categories[patternKey];
      if (dim.confidence > 0) {
        const pAdj = dim.net_weight * dim.confidence * 0.3;
        rawAdj += pAdj;
        if (pAdj !== 0) {
          contributing.push(`${pAdj > 0 ? '+' : ''}${pAdj.toFixed(1)} pts from workflow '${patternKey}'`);
        }
      }
    }

    // Tool matches
    const toolNames = combo.tool_names || combo.toolNames || [];
    for (const tool of toolNames) {
      const tKey = tool.toLowerCase().trim();
      if (profile.preferred_tools[tKey]) {
        const dim = profile.preferred_tools[tKey];
        if (dim.confidence > 0) {
          const tAdj = dim.net_weight * dim.confidence * 0.25;
          rawAdj += tAdj;
          if (tAdj !== 0) {
            contributing.push(`${tAdj > 0 ? '+' : ''}${tAdj.toFixed(1)} pts from tool '${tool}'`);
          }
        }
      }
    }

    const adjustment = Math.max(-MAX_LEARNING_ADJUSTMENT, Math.min(MAX_LEARNING_ADJUSTMENT, Math.round(rawAdj)));

    let explanation: string;
    if (adjustment > 0) {
      explanation = `Received a +${adjustment} pt synergy boost based on your successful execution history with ${toolNames.join(' + ') || 'these tools'}.`;
    } else if (adjustment < 0) {
      explanation = `Assigned a ${adjustment} pt personalization adjustment based on past abandoned workflows.`;
    } else {
      explanation = 'Personalization score adjustment is neutral.';
    }

    return { adjustment, explanation };
  }
}

export const learningEngine = new LearningEngine();
