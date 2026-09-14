import crypto from 'crypto';
import { dbAll, dbGet, dbRun } from '../db/sqlite.js';
import {
  ActionPlan,
  ActionStep,
  ActionStepPhase,
  ActionStepStatus,
  ActionPlanStatus,
  ProgressLog,
  ProgressResultType,
  ProgressOutcome,
  ProgressMetrics
} from '../../src/types/index.js';

// ============================================================================
// Helper Utilities
// ============================================================================

function parseMinutes(timeStr: string): number {
  if (!timeStr) return 60;
  let total = 0;
  const hMatch = timeStr.match(/(\d+)\s*h/i);
  const mMatch = timeStr.match(/(\d+)\s*m/i);
  if (hMatch) total += parseInt(hMatch[1], 10) * 60;
  if (mMatch) total += parseInt(mMatch[1], 10);
  if (total === 0) {
    const num = parseInt(timeStr, 10);
    return isNaN(num) ? 60 : num * 60;
  }
  return total;
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours} hours`;
  return `${mins}m`;
}

// ============================================================================
// Core Action Plan Engine
// ============================================================================

export class ActionPlanEngine {
  /**
   * Generates a 6-phase deterministic action plan for an Opportunity
   */
  async generatePlanForOpportunity(opportunityId: string): Promise<ActionPlan> {
    const opp = await dbGet<any>('SELECT * FROM opportunities WHERE id = ?', [opportunityId]);
    if (!opp) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    // Check if an active action plan already exists for this opportunity
    const existing = await dbGet<any>(
      'SELECT id FROM action_plans WHERE opportunity_id = ? AND status != "abandoned" ORDER BY created_at DESC LIMIT 1',
      [opportunityId]
    );
    if (existing) {
      const plan = await this.getActionPlanById(existing.id);
      if (plan) return plan;
    }

    const profile = await dbGet<any>('SELECT * FROM profiles LIMIT 1') || {
      available_hours_per_week: 20,
      preferred_budget: 0,
      disliked_work: ''
    };

    const skills = await dbAll<{ name: string }>('SELECT name FROM skills');
    const userSkillNames = new Set(skills.map(s => s.name.toLowerCase()));

    // Parse opportunity arrays safely
    let requiredSkills: string[] = [];
    try {
      const rawSkills = opp.required_skills || opp.missing_skills;
      requiredSkills = typeof rawSkills === 'string' ? JSON.parse(rawSkills) : (rawSkills || []);
    } catch {
      requiredSkills = [];
    }

    let toolsNeeded: string[] = [];
    try {
      const rawTools = opp.tools_needed || opp.required_tools;
      toolsNeeded = typeof rawTools === 'string' ? JSON.parse(rawTools) : (rawTools || []);
    } catch {
      toolsNeeded = [];
    }

    const planId = crypto.randomUUID();
    const title = `Action Plan: ${opp.title}`;
    const objective = `Build a working demo, create portfolio proof, and manually reach out to 5 target clients for ${opp.title}.`;
    const summary = `Tailored execution roadmap grounded in your available ${profile.available_hours_per_week || 20} hrs/week and ₹${profile.preferred_budget || 0} upfront capital budget.`;
    const difficulty = (opp.difficulty as 'Easy' | 'Medium' | 'Hard') || 'Medium';

    const steps = this.createDeterministicSteps({
      planId,
      title: opp.title,
      outcome: opp.concrete_outcome || opp.summary,
      targetCustomer: opp.target_customer || opp.customer_type || 'Potential Clients',
      customerType: opp.customer_type || 'Niche Businesses',
      tools: toolsNeeded,
      requiredSkills,
      userSkillNames,
      userProfile: profile
    });

    const totalMinutes = steps.reduce((acc, s) => acc + parseMinutes(s.estimated_time), 0);
    const estimatedTotalTime = formatMinutes(totalMinutes);

    // Persist action plan in SQLite
    const now = new Date().toISOString();
    await dbRun(
      `INSERT INTO action_plans (id, opportunity_id, combination_id, title, objective, summary, estimated_total_time, difficulty, status, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'not_started', ?, ?)`,
      [planId, opportunityId, title, objective, summary, estimatedTotalTime, difficulty, now, now]
    );

    // Persist action steps
    for (const step of steps) {
      await dbRun(
        `INSERT INTO action_steps (id, action_plan_id, step_order, phase, title, description, estimated_time, status, notes, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'not_started', NULL, NULL)`,
        [step.id, planId, step.step_order, step.phase, step.title, step.description, step.estimated_time]
      );
    }

    return (await this.getActionPlanById(planId))!;
  }

  /**
   * Generates a 6-phase deterministic action plan for a Tool Combination
   */
  async generatePlanForCombination(combinationId: string): Promise<ActionPlan> {
    const combo = await dbGet<any>('SELECT * FROM tool_combinations WHERE id = ?', [combinationId]);
    if (!combo) {
      throw new Error(`Tool combination not found: ${combinationId}`);
    }

    // Check if an active action plan already exists for this combination
    const existing = await dbGet<any>(
      'SELECT id FROM action_plans WHERE combination_id = ? AND status != "abandoned" ORDER BY created_at DESC LIMIT 1',
      [combinationId]
    );
    if (existing) {
      const plan = await this.getActionPlanById(existing.id);
      if (plan) return plan;
    }

    const profile = await dbGet<any>('SELECT * FROM profiles LIMIT 1') || {
      available_hours_per_week: 20,
      preferred_budget: 0,
      disliked_work: ''
    };

    const skills = await dbAll<{ name: string }>('SELECT name FROM skills');
    const userSkillNames = new Set(skills.map(s => s.name.toLowerCase()));

    let toolNames: string[] = [];
    try {
      toolNames = typeof combo.tool_names === 'string' ? JSON.parse(combo.tool_names) : (combo.tool_names || []);
    } catch {
      toolNames = [];
    }

    const planId = crypto.randomUUID();
    const title = `Action Plan: ${combo.title}`;
    const objective = `Build a working demo of ${combo.concrete_outcome || combo.title}, package proof-of-work, and manually contact 5 target clients.`;
    const summary = `Combination execution roadmap using ${toolNames.join(' + ')}, strictly adhering to ₹${combo.startup_cost === -1 ? 'Unknown' : combo.startup_cost} startup cost.`;
    const difficulty = (combo.difficulty as 'Easy' | 'Medium' | 'Hard') || 'Medium';

    const steps = this.createDeterministicSteps({
      planId,
      title: combo.title,
      outcome: combo.concrete_outcome || combo.summary,
      targetCustomer: combo.target_customer || combo.customer_type || 'Target Businesses',
      customerType: combo.customer_type || 'Clients',
      tools: toolNames,
      requiredSkills: [],
      userSkillNames,
      userProfile: profile
    });

    const totalMinutes = steps.reduce((acc, s) => acc + parseMinutes(s.estimated_time), 0);
    const estimatedTotalTime = formatMinutes(totalMinutes);

    // Persist action plan in SQLite
    const now = new Date().toISOString();
    await dbRun(
      `INSERT INTO action_plans (id, opportunity_id, combination_id, title, objective, summary, estimated_total_time, difficulty, status, created_at, updated_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'not_started', ?, ?)`,
      [planId, combinationId, title, objective, summary, estimatedTotalTime, difficulty, now, now]
    );

    // Persist action steps
    for (const step of steps) {
      await dbRun(
        `INSERT INTO action_steps (id, action_plan_id, step_order, phase, title, description, estimated_time, status, notes, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'not_started', NULL, NULL)`,
        [step.id, planId, step.step_order, step.phase, step.title, step.description, step.estimated_time]
      );
    }

    return (await this.getActionPlanById(planId))!;
  }

  /**
   * Internal deterministic 6-phase step creator
   */
  private createDeterministicSteps(params: {
    planId: string;
    title: string;
    outcome: string;
    targetCustomer: string;
    customerType: string;
    tools: string[];
    requiredSkills: string[];
    userSkillNames: Set<string>;
    userProfile: any;
  }): ActionStep[] {
    const {
      planId,
      title,
      outcome,
      targetCustomer,
      customerType,
      tools,
      requiredSkills,
      userSkillNames,
      userProfile
    } = params;

    const steps: ActionStep[] = [];

    // -------------------------------------------------------------
    // Phase 1: LEARN (Proportional to skill gaps & budget)
    // -------------------------------------------------------------
    const missingSkills = requiredSkills.filter(
      sk => !userSkillNames.has(sk.toLowerCase())
    );

    let learnTitle: string;
    let learnDesc: string;
    let learnTime: string;

    if (missingSkills.length === 0) {
      // User already has skills or tool combination requires no new programming skills
      learnTitle = `Setup & Workflow Verification`;
      learnDesc = `Verify your local environment and tool access for ${tools.join(', ') || 'selected tools'}. Review existing templates to prepare for immediate demo creation.`;
      learnTime = '45m';
    } else {
      learnTitle = `Skill Mastery: ${missingSkills.slice(0, 2).join(' & ')}`;
      const isZeroBudget = userProfile?.preferred_budget === 0;
      learnDesc = isZeroBudget
        ? `Review free official documentation and tutorials for ${missingSkills.join(', ')}. Complete a minimal hello-world exercise using zero-cost resources.`
        : `Complete a practical primer on ${missingSkills.join(', ')}. Build a minimal practice test to confirm capability before starting the main demo.`;
      learnTime = '1h 30m';
    }

    steps.push({
      id: crypto.randomUUID(),
      action_plan_id: planId,
      step_order: 1,
      phase: 'LEARN',
      title: learnTitle,
      description: learnDesc,
      estimated_time: learnTime,
      status: 'not_started',
      toolsNeeded: tools
    });

    // -------------------------------------------------------------
    // Phase 2: BUILD (Concrete Prototype/Demo)
    // -------------------------------------------------------------
    const toolLabel = tools.length > 0 ? tools.join(' and ') : 'your primary tools';
    steps.push({
      id: crypto.randomUUID(),
      action_plan_id: planId,
      step_order: 2,
      phase: 'BUILD',
      title: `Build Concrete Demo: ${outcome.slice(0, 50)}`,
      description: `Using ${toolLabel}, execute the end-to-end workflow to produce a tangible sample: ${outcome}. Verify the output thoroughly.`,
      estimated_time: '2h 30m',
      status: 'not_started',
      toolsNeeded: tools
    });

    // -------------------------------------------------------------
    // Phase 3: PORTFOLIO (Zero-cost proof of work)
    // -------------------------------------------------------------
    steps.push({
      id: crypto.randomUUID(),
      action_plan_id: planId,
      step_order: 3,
      phase: 'PORTFOLIO',
      title: `Package Proof-of-Work Showcase`,
      description: `Package your demo into a zero-cost proof asset: export a clean 1-page PDF showcase, record a 2-minute Loom walkthrough, or host a live public demonstration link.`,
      estimated_time: '45m',
      status: 'not_started',
      toolsNeeded: []
    });

    // -------------------------------------------------------------
    // Phase 4: PROSPECT (Finding 5 exact buyers, respecting profile)
    // -------------------------------------------------------------
    const dislikedWork = (userProfile?.disliked_work || '').toLowerCase();
    const avoidPhoneCalls = dislikedWork.includes('cold call');
    const prospectChannel = avoidPhoneCalls
      ? 'LinkedIn searches, relevant subreddits, and niche online business communities (strictly avoiding phone cold calls)'
      : 'LinkedIn searches, business directories, and local industry forums';

    steps.push({
      id: crypto.randomUUID(),
      action_plan_id: planId,
      step_order: 4,
      phase: 'PROSPECT',
      title: `Identify 5 Target ${customerType}`,
      description: `Locate 5 specific ${targetCustomer} via ${prospectChannel}. Document each contact name, current workflow challenge, and profile link.`,
      estimated_time: '1h 15m',
      status: 'not_started',
      toolsNeeded: []
    });

    // -------------------------------------------------------------
    // Phase 5: OUTREACH (Manual preparation & execution, ZERO BOT)
    // -------------------------------------------------------------
    const toolHook = tools.slice(0, 2).join(' & ') || 'modern AI tools';
    const sampleTemplate = `"Hi [Name], I noticed [specific operational friction]. I recently built a streamlined workflow with ${toolHook} that ${outcome.toLowerCase().slice(0, 60)}. Here is a 2-minute proof of how it works: [Link]. Would you find it helpful if I shared the template or helped you set it up?"`;

    steps.push({
      id: crypto.randomUUID(),
      action_plan_id: planId,
      step_order: 5,
      phase: 'OUTREACH',
      title: `Manual Personalized Outreach (5 Prospects)`,
      description: `Manually review each prospect's background and tailor the template: ${sampleTemplate}. Send each message manually one-by-one. DO NOT use automated outreach bots or mass mailers.`,
      estimated_time: '1 hour',
      status: 'not_started',
      toolsNeeded: []
    });

    // -------------------------------------------------------------
    // Phase 6: RESULT (Outcome recording in Progress Screen)
    // -------------------------------------------------------------
    steps.push({
      id: crypto.randomUUID(),
      action_plan_id: planId,
      step_order: 6,
      phase: 'RESULT',
      title: `Log Real Outcomes in Progress Tracker`,
      description: `Record actual responses received, meetings booked, rejections, or lessons learned in the Opportunity OS Progress screen. Truthful negative outcomes (rejections/no-replies) are essential for tuning future recommendations.`,
      estimated_time: '20m',
      status: 'not_started',
      toolsNeeded: []
    });

    return steps;
  }

  /**
   * Retrieves an Action Plan with its steps and computed progress percentage
   */
  async getActionPlanById(planId: string): Promise<ActionPlan | null> {
    const raw = await dbGet<any>('SELECT * FROM action_plans WHERE id = ?', [planId]);
    if (!raw) return null;

    const rawSteps = await dbAll<any>(
      'SELECT * FROM action_steps WHERE action_plan_id = ? ORDER BY step_order ASC',
      [planId]
    );

    const steps: ActionStep[] = rawSteps.map(s => ({
      id: s.id,
      action_plan_id: s.action_plan_id,
      step_order: s.step_order,
      phase: s.phase as ActionStepPhase,
      title: s.title,
      description: s.description,
      estimated_time: s.estimated_time,
      status: s.status as ActionStepStatus,
      notes: s.notes || undefined,
      completed_at: s.completed_at || null,
      dayOrPhase: `Step ${s.step_order} (${s.phase})`,
      estimatedHours: parseMinutes(s.estimated_time) / 60
    }));

    const totalSteps = steps.length;
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    let progressPercentage = 0;

    if (raw.status === 'completed') {
      progressPercentage = 100;
    } else if (totalSteps > 0) {
      progressPercentage = Math.round((completedSteps / totalSteps) * 100);
    }

    return {
      id: raw.id,
      opportunity_id: raw.opportunity_id || null,
      combination_id: raw.combination_id || null,
      title: raw.title,
      objective: raw.objective,
      summary: raw.summary || '',
      estimated_total_time: raw.estimated_total_time,
      difficulty: raw.difficulty,
      status: raw.status as ActionPlanStatus,
      steps,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      progress_percentage: progressPercentage,
      completed_steps_count: completedSteps,
      total_steps_count: totalSteps
    };
  }

  /**
   * Lists action plans with optional filtering
   */
  async getActionPlans(params?: {
    opportunityId?: string;
    combinationId?: string;
    status?: string;
  }): Promise<ActionPlan[]> {
    let query = 'SELECT id FROM action_plans WHERE 1=1';
    const args: any[] = [];

    if (params?.opportunityId) {
      query += ' AND opportunity_id = ?';
      args.push(params.opportunityId);
    }
    if (params?.combinationId) {
      query += ' AND combination_id = ?';
      args.push(params.combinationId);
    }
    if (params?.status) {
      query += ' AND status = ?';
      args.push(params.status);
    }

    query += ' ORDER BY created_at DESC';
    const rows = await dbAll<{ id: string }>(query, args);

    const plans: ActionPlan[] = [];
    for (const row of rows) {
      const p = await this.getActionPlanById(row.id);
      if (p) plans.push(p);
    }
    return plans;
  }

  /**
   * Starts an Action Plan: sets status to in_progress, step 1 to in_progress
   */
  async startPlan(planId: string): Promise<ActionPlan> {
    const plan = await this.getActionPlanById(planId);
    if (!plan) throw new Error(`Plan not found: ${planId}`);

    const now = new Date().toISOString();
    await dbRun(
      'UPDATE action_plans SET status = "in_progress", updated_at = ? WHERE id = ?',
      [now, planId]
    );

    // If step 1 is not_started, transition it to in_progress
    if (plan.steps.length > 0 && plan.steps[0].status === 'not_started') {
      await dbRun(
        'UPDATE action_steps SET status = "in_progress" WHERE id = ?',
        [plan.steps[0].id]
      );
    }

    // Log progress start event
    await this.logProgressResult({
      actionPlanId: planId,
      opportunityId: plan.opportunity_id || undefined,
      combinationId: plan.combination_id || undefined,
      resultType: 'general_note',
      outcome: 'neutral',
      notes: `Started action plan: ${plan.title}`
    });

    return (await this.getActionPlanById(planId))!;
  }

  /**
   * Pauses an Action Plan
   */
  async pausePlan(planId: string): Promise<ActionPlan> {
    const now = new Date().toISOString();
    await dbRun(
      'UPDATE action_plans SET status = "paused", updated_at = ? WHERE id = ?',
      [now, planId]
    );
    return (await this.getActionPlanById(planId))!;
  }

  /**
   * Resumes an Action Plan
   */
  async resumePlan(planId: string): Promise<ActionPlan> {
    const now = new Date().toISOString();
    await dbRun(
      'UPDATE action_plans SET status = "in_progress", updated_at = ? WHERE id = ?',
      [now, planId]
    );
    return (await this.getActionPlanById(planId))!;
  }

  /**
   * Marks an Action Plan as completed
   */
  async completePlan(planId: string): Promise<ActionPlan> {
    const now = new Date().toISOString();
    await dbRun(
      'UPDATE action_plans SET status = "completed", updated_at = ? WHERE id = ?',
      [now, planId]
    );
    return (await this.getActionPlanById(planId))!;
  }

  /**
   * Deletes an Action Plan and cascades deletion of its steps and logs
   */
  async deletePlan(planId: string): Promise<boolean> {
    await dbRun('DELETE FROM action_steps WHERE action_plan_id = ?', [planId]);
    await dbRun('DELETE FROM progress_logs WHERE action_plan_id = ?', [planId]);
    const res = await dbRun('DELETE FROM action_plans WHERE id = ?', [planId]);
    return (res.changes || 0) > 0;
  }

  /**
   * Updates an Action Step's status, notes, and auto-advances the plan
   */
  async updateStep(
    stepId: string,
    updates: { status?: ActionStepStatus; notes?: string }
  ): Promise<ActionStep> {
    const step = await dbGet<any>('SELECT * FROM action_steps WHERE id = ?', [stepId]);
    if (!step) throw new Error(`Step not found: ${stepId}`);

    const newStatus = updates.status || step.status;
    const newNotes = updates.notes !== undefined ? updates.notes : step.notes;
    const completedAt = newStatus === 'completed' ? (step.completed_at || new Date().toISOString()) : (newStatus === 'not_started' ? null : step.completed_at);

    await dbRun(
      'UPDATE action_steps SET status = ?, notes = ?, completed_at = ? WHERE id = ?',
      [newStatus, newNotes, completedAt, stepId]
    );

    // If step was completed or skipped, activate next step if it's currently not_started
    if (newStatus === 'completed' || newStatus === 'skipped') {
      const nextStep = await dbGet<any>(
        'SELECT id, status FROM action_steps WHERE action_plan_id = ? AND step_order > ? ORDER BY step_order ASC LIMIT 1',
        [step.action_plan_id, step.step_order]
      );
      if (nextStep && nextStep.status === 'not_started') {
        await dbRun('UPDATE action_steps SET status = "in_progress" WHERE id = ?', [nextStep.id]);
      }
    }

    // Check if entire plan should be auto-completed or marked in_progress
    const allSteps = await dbAll<any>(
      'SELECT status FROM action_steps WHERE action_plan_id = ?',
      [step.action_plan_id]
    );

    const hasAnyCompleted = allSteps.some(s => s.status === 'completed');
    const allFinished = allSteps.every(s => s.status === 'completed' || s.status === 'skipped');

    const plan = await dbGet<any>('SELECT status FROM action_plans WHERE id = ?', [step.action_plan_id]);
    const now = new Date().toISOString();

    if (allFinished && hasAnyCompleted && plan?.status !== 'completed') {
      await dbRun('UPDATE action_plans SET status = "completed", updated_at = ? WHERE id = ?', [now, step.action_plan_id]);
    } else if (newStatus === 'in_progress' && plan?.status === 'not_started') {
      await dbRun('UPDATE action_plans SET status = "in_progress", updated_at = ? WHERE id = ?', [now, step.action_plan_id]);
    }

    const updated = await dbGet<any>('SELECT * FROM action_steps WHERE id = ?', [stepId]);
    return {
      id: updated.id,
      action_plan_id: updated.action_plan_id,
      step_order: updated.step_order,
      phase: updated.phase as ActionStepPhase,
      title: updated.title,
      description: updated.description,
      estimated_time: updated.estimated_time,
      status: updated.status as ActionStepStatus,
      notes: updated.notes || undefined,
      completed_at: updated.completed_at || null
    };
  }

  /**
   * Logs a user-reported real-world execution result or outcome
   */
  async logProgressResult(params: {
    actionPlanId?: string;
    stepId?: string;
    opportunityId?: string;
    combinationId?: string;
    resultType: ProgressResultType;
    outcome?: ProgressOutcome;
    numericValue?: number;
    notes: string;
    evidenceLink?: string;
    date?: string;
  }): Promise<ProgressLog> {
    const id = crypto.randomUUID();
    const actionPlanId = params.actionPlanId || null;
    const stepId = params.stepId || null;
    const opportunityId = params.opportunityId || null;
    const combinationId = params.combinationId || null;
    const resultType = params.resultType;
    const outcome = params.outcome || 'neutral';
    const numericValue = params.numericValue !== undefined ? params.numericValue : null;
    const notes = params.notes || '';
    const evidenceLink = params.evidenceLink || null;
    const date = params.date || new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Map aggregate counter fields
    let demosCreated = 0;
    let prospectsContacted = 0;
    let responsesReceived = 0;
    let clientsAcquired = 0;
    let revenueEarned = 0;
    let hoursSpent = 0;

    if (resultType === 'demo_created') {
      demosCreated = numericValue ? Math.max(1, Math.round(numericValue)) : 1;
    } else if (resultType === 'prospect_contacted') {
      prospectsContacted = numericValue ? Math.max(1, Math.round(numericValue)) : 1;
    } else if (resultType === 'response_received') {
      responsesReceived = numericValue ? Math.max(1, Math.round(numericValue)) : 1;
    } else if (resultType === 'client_acquired') {
      clientsAcquired = numericValue ? Math.max(1, Math.round(numericValue)) : 1;
    } else if (resultType === 'revenue_earned') {
      revenueEarned = numericValue || 0;
    } else if (resultType === 'hours_spent') {
      hoursSpent = numericValue || 0;
    }

    await dbRun(
      `INSERT INTO progress_logs (
        id, action_plan_id, step_id, opportunity_id, combination_id,
        result_type, outcome, numeric_value, notes, evidence_link,
        date, demos_created, prospects_contacted, responses_received,
        clients_acquired, revenue_earned, hours_spent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, actionPlanId, stepId, opportunityId, combinationId,
        resultType, outcome, numericValue, notes, evidenceLink,
        date, demosCreated, prospectsContacted, responsesReceived,
        clientsAcquired, revenueEarned, hoursSpent, now
      ]
    );

    return {
      id,
      action_plan_id: actionPlanId,
      step_id: stepId,
      opportunity_id: opportunityId,
      combination_id: combinationId,
      result_type: resultType,
      outcome,
      numeric_value: numericValue,
      notes,
      evidence_link: evidenceLink,
      date,
      created_at: now
    };
  }

  /**
   * Retrieves progress logs with optional filters
   */
  async getProgressLogs(params?: {
    actionPlanId?: string;
    opportunityId?: string;
    combinationId?: string;
  }): Promise<ProgressLog[]> {
    let query = 'SELECT * FROM progress_logs WHERE 1=1';
    const args: any[] = [];

    if (params?.actionPlanId) {
      query += ' AND action_plan_id = ?';
      args.push(params.actionPlanId);
    }
    if (params?.opportunityId) {
      query += ' AND opportunity_id = ?';
      args.push(params.opportunityId);
    }
    if (params?.combinationId) {
      query += ' AND combination_id = ?';
      args.push(params.combinationId);
    }

    query += ' ORDER BY created_at DESC';
    const rows = await dbAll<any>(query, args);

    return rows.map(r => ({
      id: r.id,
      action_plan_id: r.action_plan_id || null,
      step_id: r.step_id || null,
      opportunity_id: r.opportunity_id || null,
      combination_id: r.combination_id || null,
      result_type: r.result_type as ProgressResultType,
      outcome: r.outcome as ProgressOutcome,
      numeric_value: r.numeric_value !== null ? r.numeric_value : undefined,
      notes: r.notes || '',
      evidence_link: r.evidence_link || null,
      date: r.date || undefined,
      created_at: r.created_at
    }));
  }

  /**
   * Deletes a progress log
   */
  async deleteProgressLog(logId: string): Promise<boolean> {
    const res = await dbRun('DELETE FROM progress_logs WHERE id = ?', [logId]);
    return (res.changes || 0) > 0;
  }

  /**
   * Aggregates real execution metrics from the database with ZERO fake data
   */
  async getProgressMetrics(): Promise<ProgressMetrics> {
    // 1. Saved counts
    const oppSaved = await dbGet<{ count: number }>('SELECT COUNT(*) as count FROM opportunities WHERE saved = 1');
    const comboSaved = await dbGet<{ count: number }>('SELECT COUNT(*) as count FROM tool_combinations WHERE saved = 1');
    const totalSaved = (oppSaved?.count || 0) + (comboSaved?.count || 0);

    // 2. Viewed / total opportunities count
    const oppTotal = await dbGet<{ count: number }>('SELECT COUNT(*) as count FROM opportunities WHERE status != "ignored"');
    const comboTotal = await dbGet<{ count: number }>('SELECT COUNT(*) as count FROM tool_combinations');
    const totalOpportunities = (oppTotal?.count || 0) + (comboTotal?.count || 0);

    // 3. Attempted count: action plans created
    const plansAttempted = await dbGet<{ count: number }>(
      'SELECT COUNT(*) as count FROM action_plans WHERE status != "not_started"'
    );

    // 4. Progress log counters
    const logSums = await dbGet<{
      demos: number;
      prospects: number;
      responses: number;
      clients: number;
      revenue: number;
      hours: number;
    }>(`
      SELECT 
        COALESCE(SUM(demos_created), 0) as demos,
        COALESCE(SUM(prospects_contacted), 0) as prospects,
        COALESCE(SUM(responses_received), 0) as responses,
        COALESCE(SUM(clients_acquired), 0) as clients,
        COALESCE(SUM(revenue_earned), 0) as revenue,
        COALESCE(SUM(hours_spent), 0) as hours
      FROM progress_logs
    `);

    return {
      opportunities_viewed: totalOpportunities,
      opportunities_saved: totalSaved,
      opportunities_attempted: plansAttempted?.count || 0,
      demos_created: logSums?.demos || 0,
      prospects_contacted: logSums?.prospects || 0,
      responses_received: logSums?.responses || 0,
      clients_acquired: logSums?.clients || 0,
      revenue_earned: logSums?.revenue || 0,
      hours_spent: logSums?.hours || 0
    };
  }
}

export const actionPlanEngine = new ActionPlanEngine();
