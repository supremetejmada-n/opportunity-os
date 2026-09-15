import { 
  UserProfile, UserSkill, UserTool, UserGoal, UserInterest, UserProject, 
  ProgressMetrics, Discovery, Opportunity, ToolCombination,
  ActionPlan, ActionStep, ActionStepStatus, ProgressLog, ProgressResultType
} from '../types/index.js';

const API_BASE = '/api';

export interface FullProfileData {
  profile: UserProfile;
  skills: UserSkill[];
  tools: UserTool[];
  goals: UserGoal[];
  interests: UserInterest[];
  projects: UserProject[];
}

export interface DiscoveriesResponse {
  count: number;
  discoveries: Discovery[];
  lastScanSummary?: any;
  isScanning: boolean;
}

export interface OpportunitiesResponse {
  count: number;
  savedCount: number;
  bestOpportunity: Opportunity | null;
  opportunities: Opportunity[];
  worthKnowing: string[];
}

export interface CombinationsResponse {
  count: number;
  savedCount: number;
  combinations: ToolCombination[];
  message: string;
}

export const api = {
  // PROFILE
  async getProfile(): Promise<FullProfileData> {
    const res = await fetch(`${API_BASE}/profile`);
    if (!res.ok) throw new Error('Failed to load profile data');
    return res.json();
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  // SKILLS
  async addSkill(skill: Partial<UserSkill>): Promise<UserSkill> {
    const res = await fetch(`${API_BASE}/profile/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skill),
    });
    if (!res.ok) throw new Error('Failed to add skill');
    return res.json();
  },

  async updateSkill(id: string, updates: Partial<UserSkill>): Promise<UserSkill> {
    const res = await fetch(`${API_BASE}/profile/skills/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update skill');
    return res.json();
  },

  async deleteSkill(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/profile/skills/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete skill');
  },

  // TOOLS
  async addTool(tool: Partial<UserTool>): Promise<UserTool> {
    const res = await fetch(`${API_BASE}/profile/tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tool),
    });
    if (!res.ok) throw new Error('Failed to add tool');
    return res.json();
  },

  async updateTool(id: string, updates: Partial<UserTool>): Promise<UserTool> {
    const res = await fetch(`${API_BASE}/profile/tools/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update tool');
    return res.json();
  },

  async deleteTool(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/profile/tools/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete tool');
  },

  // GOALS
  async addGoal(goal: Partial<UserGoal>): Promise<UserGoal> {
    const res = await fetch(`${API_BASE}/profile/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goal),
    });
    if (!res.ok) throw new Error('Failed to add goal');
    return res.json();
  },

  async deleteGoal(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/profile/goals/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete goal');
  },

  // INTERESTS
  async addInterest(interest: Partial<UserInterest>): Promise<UserInterest> {
    const res = await fetch(`${API_BASE}/profile/interests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(interest),
    });
    if (!res.ok) throw new Error('Failed to add interest');
    return res.json();
  },

  async deleteInterest(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/profile/interests/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete interest');
  },

  // PROJECTS
  async addProject(project: Partial<UserProject>): Promise<UserProject> {
    const res = await fetch(`${API_BASE}/profile/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!res.ok) throw new Error('Failed to add project');
    return res.json();
  },

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/profile/projects/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete project');
  },

  // DISCOVERIES
  async getDiscoveries(params: Record<string, string> = {}): Promise<DiscoveriesResponse> {
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/discoveries?${queryString}`);
    if (!res.ok) throw new Error('Failed to fetch discoveries');
    return res.json();
  },

  async getDiscoveryById(id: string): Promise<Discovery> {
    const res = await fetch(`${API_BASE}/discoveries/${id}`);
    if (!res.ok) throw new Error('Failed to fetch discovery details');
    return res.json();
  },

  // SCAN ENGINE (Phase 8 On-Demand Intelligence)
  async triggerScan(): Promise<{ success: boolean; status: string; scanRecord: any; recommendations: Opportunity[]; count: number; message: string }> {
    const res = await fetch(`${API_BASE}/scan/trigger`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Failed to execute scan');
    }
    return res.json();
  },

  async getScanHistory(limit: number = 20): Promise<{ success: boolean; scanRecords: any[]; count: number }> {
    const res = await fetch(`${API_BASE}/scan/history?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch scan history');
    return res.json();
  },

  async getLatestScan(): Promise<{ success: boolean; scanRecord: any }> {
    const res = await fetch(`${API_BASE}/scan/latest`);
    if (!res.ok) throw new Error('Failed to fetch latest scan');
    return res.json();
  },

  // PROGRESS METRICS
  async getProgressMetrics(): Promise<{ metrics: ProgressMetrics; activityLogs?: ProgressLog[] }> {
    const res = await fetch(`${API_BASE}/progress/metrics`);
    if (!res.ok) throw new Error('Failed to fetch progress metrics');
    return res.json();
  },

  // OPPORTUNITIES (Phase 4 Engine)
  async getOpportunities(params: Record<string, string> = {}): Promise<OpportunitiesResponse> {
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/opportunities?${queryString}`);
    if (!res.ok) throw new Error('Failed to fetch opportunities');
    return res.json();
  },

  async getOpportunityById(id: string): Promise<Opportunity> {
    const res = await fetch(`${API_BASE}/opportunities/${id}`);
    if (!res.ok) throw new Error('Failed to fetch opportunity detail');
    return res.json();
  },

  async evaluateOpportunities(): Promise<{ success: boolean; message: string; opportunities: Opportunity[] }> {
    const res = await fetch(`${API_BASE}/opportunities/evaluate`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to evaluate opportunities');
    return res.json();
  },

  async saveOpportunity(id: string): Promise<{ success: boolean; saved: boolean; opportunity: Opportunity }> {
    const res = await fetch(`${API_BASE}/opportunities/${id}/save`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to toggle opportunity save state');
    return res.json();
  },

  // COMBINATIONS (Phase 5 Engine)
  async getCombinations(params: Record<string, string> = {}): Promise<CombinationsResponse> {
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/combinations?${queryString}`);
    if (!res.ok) throw new Error('Failed to fetch tool combinations');
    return res.json();
  },

  async getCombinationById(id: string): Promise<ToolCombination> {
    const res = await fetch(`${API_BASE}/combinations/${id}`);
    if (!res.ok) throw new Error('Failed to fetch combination detail');
    return res.json();
  },

  async generateCombinations(options: { toolIds?: string[]; minScore?: number } = {}): Promise<CombinationsResponse> {
    const res = await fetch(`${API_BASE}/combinations/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to generate tool combinations');
    }
    return res.json();
  },

  async saveCombination(id: string): Promise<{ success: boolean; saved: boolean; combination: ToolCombination }> {
    const res = await fetch(`${API_BASE}/combinations/${id}/save`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to toggle combination save state');
    return res.json();
  },

  // ACTION PLANS (Phase 6 Engine)
  async generateActionPlan(params: { opportunityId?: string; combinationId?: string }): Promise<{ success: boolean; plan: ActionPlan }> {
    const res = await fetch(`${API_BASE}/action-plans/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate action plan');
    }
    return res.json();
  },

  async getActionPlans(params: Record<string, string> = {}): Promise<{ success: boolean; plans: ActionPlan[]; count: number }> {
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/action-plans?${queryString}`);
    if (!res.ok) throw new Error('Failed to fetch action plans');
    return res.json();
  },

  async getActionPlanById(id: string): Promise<{ success: boolean; plan: ActionPlan }> {
    const res = await fetch(`${API_BASE}/action-plans/${id}`);
    if (!res.ok) throw new Error('Failed to fetch action plan');
    return res.json();
  },

  async startActionPlan(id: string): Promise<{ success: boolean; plan: ActionPlan }> {
    const res = await fetch(`${API_BASE}/action-plans/${id}/start`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start action plan');
    return res.json();
  },

  async pauseActionPlan(id: string): Promise<{ success: boolean; plan: ActionPlan }> {
    const res = await fetch(`${API_BASE}/action-plans/${id}/pause`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to pause action plan');
    return res.json();
  },

  async resumeActionPlan(id: string): Promise<{ success: boolean; plan: ActionPlan }> {
    const res = await fetch(`${API_BASE}/action-plans/${id}/resume`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to resume action plan');
    return res.json();
  },

  async completeActionPlan(id: string): Promise<{ success: boolean; plan: ActionPlan }> {
    const res = await fetch(`${API_BASE}/action-plans/${id}/complete`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to complete action plan');
    return res.json();
  },

  async deleteActionPlan(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/action-plans/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete action plan');
    return res.json();
  },

  async updateActionStep(stepId: string, updates: { status?: ActionStepStatus; notes?: string }): Promise<{ success: boolean; step: ActionStep }> {
    const res = await fetch(`${API_BASE}/action-plans/steps/${stepId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update action step');
    return res.json();
  },

  // PROGRESS & RESULTS (Phase 6 Engine)
  async getProgressLogs(params: Record<string, string> = {}): Promise<{ success: boolean; logs: ProgressLog[]; count: number }> {
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/progress/logs?${queryString}`);
    if (!res.ok) throw new Error('Failed to fetch progress logs');
    return res.json();
  },

  async logProgressResult(data: {
    actionPlanId?: string;
    stepId?: string;
    opportunityId?: string;
    combinationId?: string;
    resultType: ProgressResultType;
    outcome?: 'positive' | 'neutral' | 'negative';
    numericValue?: number;
    notes: string;
    evidenceLink?: string;
    date?: string;
  }): Promise<{ success: boolean; log: ProgressLog }> {
    const res = await fetch(`${API_BASE}/progress/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to record progress log');
    }
    return res.json();
  },

  async deleteProgressLog(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/progress/logs/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete progress log');
    return res.json();
  },

  // FEEDBACK & LEARNING (Phase 7 Engine)
  async submitFeedback(data: {
    sourceType: 'opportunity' | 'combination';
    sourceId: string;
    rating: 'useful' | 'not_useful' | 'not_relevant' | 'tried' | 'rejected' | 'ignored';
    reason?: string;
    comments?: string;
  }): Promise<{ success: boolean; feedback: any; signalRecorded: boolean }> {
    const res = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit feedback');
    }
    return res.json();
  },

  async getFeedback(params: Record<string, string> = {}): Promise<{ success: boolean; feedback: any[]; count: number }> {
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/feedback?${queryString}`);
    if (!res.ok) throw new Error('Failed to fetch feedback records');
    return res.json();
  },

  async getLearningProfile(): Promise<{ success: boolean; profile: any }> {
    const res = await fetch(`${API_BASE}/learning/profile`);
    if (!res.ok) throw new Error('Failed to fetch learning profile');
    return res.json();
  },

  async rebuildLearningProfile(): Promise<{ success: boolean; profile: any; totalSignals: number }> {
    const res = await fetch(`${API_BASE}/learning/rebuild`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to rebuild learning profile');
    return res.json();
  },

  async getLearningSignals(params: Record<string, string> = {}): Promise<{ success: boolean; signals: any[]; count: number }> {
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/learning/signals?${queryString}`);
    if (!res.ok) throw new Error('Failed to fetch learning signals');
    return res.json();
  },

  async getLearningExplanation(id: string): Promise<{ success: boolean; explanation: any }> {
    const res = await fetch(`${API_BASE}/learning/explanations/${id}`);
    if (!res.ok) throw new Error('Failed to fetch learning explanation');
    return res.json();
  }
};
