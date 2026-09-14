import { UserProfile, UserSkill, UserTool, UserGoal, UserInterest, UserProject, ProgressMetrics, Discovery, Opportunity, ToolCombination } from '../types/index.js';

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

  // SCAN TRIGGER
  async triggerScan(): Promise<{ status: string; message: string; summary?: any }> {
    const res = await fetch(`${API_BASE}/scan/trigger`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger scan');
    return res.json();
  },

  // PROGRESS METRICS
  async getProgressMetrics(): Promise<{ metrics: ProgressMetrics }> {
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
  }
};
