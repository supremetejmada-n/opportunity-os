// TypeScript definitions for Personal AI Opportunity Engine

export type SkillProficiency = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
export type ToolAccessType = 'Free' | 'Free Tier' | 'Free Trial' | 'Paid' | 'Open Source' | 'Self-Hosted';
export type GoalPriority = 'High' | 'Medium' | 'Low';
export type RemotePreference = 'Remote Only' | 'Hybrid' | 'Any';
export type WorkTypePreference = 'Freelance' | 'Micro-SaaS' | 'Agency Service' | 'Consulting' | 'Content / Digital Asset' | 'Any';

export interface UserProfile {
  id: string;
  name: string;
  title: string;
  bio: string;
  preferred_budget: number; // e.g. 0
  available_hours_per_week: number;
  preferred_work_type: string;
  disliked_work: string;
  remote_preference: RemotePreference;
  learning_tolerance: 'Low' | 'Medium' | 'High';
  created_at?: string;
  updated_at?: string;
}

export interface UserSkill {
  id: string;
  profile_id: string;
  name: string;
  proficiency: SkillProficiency;
  confidence: number; // 1-100
  experience_years: number;
  last_used: string;
  created_at?: string;
}

export interface UserTool {
  id: string;
  profile_id: string;
  name: string;
  category: string; // e.g., 'AI Model', 'Design', 'Automation', 'Database', 'Code Editor'
  access_type: ToolAccessType;
  cost_per_month: number;
  capabilities: string[]; // JSON array stored in DB
  familiarity: number; // 1-100
  created_at?: string;
}

export interface UserGoal {
  id: string;
  profile_id: string;
  goal: string;
  priority: GoalPriority;
  description: string;
  target_timeframe: string; // e.g. '1 month', '3 months'
  created_at?: string;
}

export interface UserInterest {
  id: string;
  profile_id: string;
  category: string;
  topic: string;
  industry: string;
  created_at?: string;
}

export interface UserProject {
  id: string;
  profile_id: string;
  name: string;
  description: string;
  technologies: string[];
  status: 'Idea' | 'In Progress' | 'Completed' | 'Paused';
  relevance: string;
  created_at?: string;
}

// Discovery Object schema (Phase 3 Engine)
export type PricingStatus = 'genuinely_free' | 'free_tier' | 'free_trial' | 'open_source_self_hostable' | 'open_weight' | 'free_credits' | 'paid_only' | 'unclear' | 'unknown';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export interface Discovery {
  id: string;
  title: string;
  description: string;
  url: string;
  source: 'github' | 'huggingface' | 'rss' | 'web' | 'manual';
  type: string;
  category: string;
  capabilities: string[];
  pricing_cost?: string;
  free_status?: PricingStatus;
  pricingStatus?: PricingStatus;
  open_source_status?: boolean;
  openSource?: boolean;
  openWeight?: boolean;
  selfHostable?: boolean;
  local_availability?: boolean;
  api_availability?: boolean;
  author?: string;
  license?: string;
  first_discovered_date?: string;
  last_verified_date?: string;
  evidence: any[];
  confidence: ConfidenceLevel;
  verified?: boolean;
  verificationStatus?: string;
  is_demo_data?: boolean;
}

// Opportunity Object schema (Phase 4 Engine)
export interface ScoreBreakdown {
  skillMatch: number;      // 25% (0-25)
  marketDemand: number;    // 20% (0-20)
  toolMatch: number;       // 15% (0-15)
  startupCost: number;     // 15% (0-15)
  timeToDemo: number;      // 10% (0-10)
  learningCurve: number;   // 5% (0-5)
  competition: number;     // 5% (0-5)
  simplicity: number;      // 5% (0-5)
  reasoning?: Record<string, string>;
}

export interface ActionPlanStep {
  dayOrPhase: string;
  title: string;
  description: string;
  estimatedHours: number;
  toolsNeeded?: string[];
}

export interface Opportunity {
  id: string;
  discovery_id?: string;
  discoveryId?: string;
  discovery_ids?: string[];
  discoveryIds?: string[];
  tool_ids?: string[];
  toolIds?: string[];
  title: string;
  summary?: string;
  problem?: string;
  why_match?: string;
  whyMatch?: string;
  solution?: string;
  service_type?: string;
  target_customer?: string;
  customer_type?: string;
  customerType?: string;
  earning_potential?: string;
  earningPotential?: string;
  workflow: string[];
  required_tools?: string[];
  requiredTools?: string[];
  action_plan?: ActionPlanStep[];
  actionPlan?: ActionPlanStep[];
  missing_skills?: string[];
  startup_cost?: number;
  startupCost?: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  time_to_demo?: string;
  timeToDemo?: string;
  potential_monetization?: string;
  risks: string[];
  evidence?: Record<string, any>;
  score: number;
  score_breakdown: ScoreBreakdown;
  scoreBreakdown?: ScoreBreakdown;
  confidence?: ConfidenceLevel;
  saved: boolean;
  status: 'new' | 'saved' | 'in_progress' | 'completed' | 'ignored';
  created_at?: string;
  createdAt?: string;
  is_demo_data?: boolean;
}

// Action Plan schema (ready for Phase 6)
export interface ActionStep {
  dayOrPhase: string;
  title: string;
  description: string;
  estimatedHours: number;
  toolsNeeded: string[];
  learningResources?: string[];
  status: 'pending' | 'in_progress' | 'completed';
}

export interface ActionPlan {
  id: string;
  opportunity_id: string;
  objective: string;
  target_timeframe: string;
  steps: ActionStep[];
  created_at: string;
}

// Progress & Feedback schema (ready for Phase 6 & 7)
export interface ProgressMetrics {
  opportunities_viewed: number;
  opportunities_saved: number;
  opportunities_attempted: number;
  demos_created: number;
  prospects_contacted: number;
  responses_received: number;
  clients_acquired: number;
  revenue_earned: number;
  hours_spent: number;
}

export interface FeedbackSubmission {
  id?: string;
  opportunity_id: string;
  rating: 'useful' | 'not_useful' | 'tried_it' | 'ignore' | 'save' | 'not_relevant' | 'already_know';
  reason?: string;
  comments?: string;
  created_at?: string;
}
