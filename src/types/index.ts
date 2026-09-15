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
  freeTier?: boolean;
  free_tier?: number | boolean;
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

export interface EarningHypothesis {
  range: string;
  basis: string;
  confidence: 'Low' | 'Medium' | 'High';
}

export type OpportunityOrigin = 'discovery_derived' | 'profile_hypothesis' | 'template';

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
  earning_basis?: string;
  earning_confidence?: 'Low' | 'Medium' | 'High';
  earningHypothesis?: EarningHypothesis;
  origin?: OpportunityOrigin;
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
  learning_adjustment?: number;
  learningAdjustment?: number;
  learning_explanation?: string;
  learningExplanation?: string;
  created_at?: string;
  createdAt?: string;
  is_demo_data?: boolean;
}

// Action Plan schema (Phase 6 Engine)
export type ActionStepPhase = 'LEARN' | 'BUILD' | 'PORTFOLIO' | 'PROSPECT' | 'OUTREACH' | 'RESULT';
export type ActionStepStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';
export type ActionPlanStatus = 'not_started' | 'in_progress' | 'completed' | 'paused' | 'abandoned';

export interface ActionStep {
  id: string;
  action_plan_id: string;
  step_order: number;
  phase: ActionStepPhase;
  title: string;
  description: string;
  estimated_time: string;
  status: ActionStepStatus;
  notes?: string;
  completed_at?: string | null;
  // Optional backward-compatibility helpers
  dayOrPhase?: string;
  estimatedHours?: number;
  toolsNeeded?: string[];
  learningResources?: string[];
}

export interface ActionPlan {
  id: string;
  opportunity_id?: string | null;
  combination_id?: string | null;
  title: string;
  objective: string;
  summary: string;
  estimated_total_time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  status: ActionPlanStatus;
  steps: ActionStep[];
  created_at: string;
  updated_at?: string;
  target_timeframe?: string;
  progress_percentage?: number;
  completed_steps_count?: number;
  total_steps_count?: number;
}

// Progress & Feedback schema (Phase 6 & 7)
export type ProgressResultType =
  | 'demo_created'
  | 'prospect_contacted'
  | 'response_received'
  | 'client_acquired'
  | 'revenue_earned'
  | 'hours_spent'
  | 'rejected'
  | 'abandoned'
  | 'general_note';

export type ProgressOutcome = 'positive' | 'neutral' | 'negative';

export interface ProgressLog {
  id: string;
  action_plan_id?: string | null;
  step_id?: string | null;
  opportunity_id?: string | null;
  combination_id?: string | null;
  result_type: ProgressResultType;
  outcome?: ProgressOutcome;
  numeric_value?: number | null;
  notes: string;
  evidence_link?: string | null;
  date?: string;
  created_at: string;
}

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

// ==========================================
// Phase 5: "Combine My Tools" Engine Types
// ==========================================

export type ToolAccessStatus = 'already_have' | 'free_to_obtain' | 'requires_paid_access' | 'unknown';

export type WorkflowPattern =
  | 'GENERATE_DESIGN'
  | 'GENERATE_EDIT'
  | 'CAPTURE_PROCESS_RESPOND'
  | 'TRIGGER_AI_ACTION'
  | 'LOCAL_AI_DOCUMENT_OUTPUT'
  | 'EXTRACT_SYNTHESIZE_PUBLISH'
  | 'MONITOR_ANALYZE_ALERT';

export interface CapabilityChainStage {
  stageIndex: number;
  toolId: string;
  toolName: string;
  capability: string;
  actionDescription: string;
  accessStatus?: ToolAccessStatus;
}

export interface CombinerScoreBreakdown {
  userToolAvailability: number;         // 20% (0-20)
  capabilitySynergy: number;            // 20% (0-20)
  personalSkillFit: number;             // 15% (0-15)
  outcomeUsefulness: number;            // 15% (0-15)
  zeroCostFeasibility: number;          // 10% (0-10)
  executionSimplicity: number;          // 10% (0-10)
  timeToDemo: number;                   // 5% (0-5)
  customerMonetizationPotential: number;// 5% (0-5)
  reasoning?: Record<string, string>;
}

export interface CombinerMonetizationHypothesis {
  range: string;
  pricingModel: string;
  targetCustomer: string;
  basis: string;
  confidence: 'Low' | 'Medium' | 'High';
}

export interface ToolCombination {
  id: string;
  title: string;
  summary: string;
  tool_ids: string[];
  tool_names: string[];
  discovery_ids?: string[];
  origin?: OpportunityOrigin;
  market_evidence?: string;
  capability_chain: CapabilityChainStage[];
  workflow_pattern: WorkflowPattern;
  workflow_steps: string[];
  concrete_outcome: string;
  customer_type: string;
  target_customer: string;
  monetization_hypothesis: CombinerMonetizationHypothesis;
  startup_cost: number;
  is_zero_cost: boolean;
  time_to_demo: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  score: number;
  score_breakdown: CombinerScoreBreakdown;
  confidence: ConfidenceLevel;
  saved: boolean;
  learning_adjustment?: number;
  learningAdjustment?: number;
  learning_explanation?: string;
  learningExplanation?: string;
  created_at?: string;
  is_demo_data?: boolean;
}

// ==========================================
// Phase 7: Learning & Adaptive Engine Types
// ==========================================

export type LearningSourceType = 'opportunity' | 'combination' | 'action_plan' | 'action_step' | 'progress_log' | 'feedback';

export type LearningSignalType =
  | 'useful'
  | 'not_useful'
  | 'relevant'
  | 'not_relevant'
  | 'saved'
  | 'ignored'
  | 'tried'
  | 'already_know'
  | 'started_plan'
  | 'completed_step'
  | 'completed_plan'
  | 'abandoned_plan'
  | 'demo_created'
  | 'portfolio_published'
  | 'prospect_contacted'
  | 'response_received'
  | 'rejected'
  | 'client_acquired'
  | 'revenue_earned';

export interface LearningSignal {
  id: string;
  source_type: LearningSourceType;
  source_id: string;
  signal_type: LearningSignalType;
  signal_value: number;
  weight: number;
  category?: string;
  tool_name?: string;
  created_at: string;
}

export type FeedbackRating = 'useful' | 'not_useful' | 'tried' | 'ignore' | 'save' | 'not_relevant' | 'already_know';

export interface FeedbackRecord {
  id: string;
  source_type: 'opportunity' | 'combination';
  source_id: string;
  opportunity_id?: string | null;
  combination_id?: string | null;
  rating: FeedbackRating;
  reason?: string | null;
  comments?: string | null;
  created_at: string;
}

export interface PreferenceDimension {
  key: string;
  positive: number;
  negative: number;
  net_weight: number;
  confidence: number; // 0.0 to 1.0
  sample_count: number;
}

export interface UserLearningProfile {
  id: string;
  preferred_categories: Record<string, PreferenceDimension>;
  preferred_capabilities: Record<string, PreferenceDimension>;
  preferred_tools: Record<string, PreferenceDimension>;
  preferred_work_types: Record<string, PreferenceDimension>;
  observed_difficulty_preference?: Record<string, PreferenceDimension>;
  observed_time_preference?: Record<string, PreferenceDimension>;
  total_signals: number;
  confidence_score: number;
  updated_at: string;
}

export interface LearningExplanation {
  opportunityId?: string;
  combinationId?: string;
  learningAdjustment: number;
  explanationText: string;
  contributingSignals: string[];
  confidence: 'High' | 'Medium' | 'Low' | 'Neutral';
}

