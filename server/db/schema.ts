export const SCHEMA_SQL = `
-- Users table (Public SaaS Multi-Tenant Engine)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  name TEXT,
  reset_token TEXT,
  reset_token_expires TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  preferred_budget REAL DEFAULT 0,
  available_hours_per_week INTEGER DEFAULT 20,
  preferred_work_type TEXT DEFAULT 'Freelance',
  disliked_work TEXT,
  remote_preference TEXT DEFAULT 'Remote Only',
  learning_tolerance TEXT DEFAULT 'High',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  proficiency TEXT NOT NULL,
  confidence INTEGER DEFAULT 80,
  experience_years REAL DEFAULT 1,
  last_used TEXT DEFAULT 'Recently',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tools table
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  access_type TEXT NOT NULL,
  cost_per_month REAL DEFAULT 0,
  capabilities TEXT DEFAULT '[]',
  familiarity INTEGER DEFAULT 80,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  profile_id TEXT NOT NULL,
  goal TEXT NOT NULL,
  priority TEXT DEFAULT 'Medium',
  description TEXT,
  target_timeframe TEXT DEFAULT '1 month',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Interests table
CREATE TABLE IF NOT EXISTS interests (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  profile_id TEXT NOT NULL,
  category TEXT NOT NULL,
  topic TEXT NOT NULL,
  industry TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  technologies TEXT DEFAULT '[]',
  status TEXT DEFAULT 'In Progress',
  relevance TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Discoveries table (Phase 3 Engine)
CREATE TABLE IF NOT EXISTS discoveries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  type TEXT DEFAULT 'other',
  category TEXT DEFAULT 'Other',
  capabilities TEXT DEFAULT '[]',
  author TEXT,
  license TEXT,
  pricing_status TEXT DEFAULT 'unknown',
  free_tier INTEGER DEFAULT 0,
  open_source INTEGER DEFAULT 0,
  open_weight INTEGER DEFAULT 0,
  self_hostable INTEGER DEFAULT 0,
  api_available INTEGER DEFAULT 0,
  local_available INTEGER DEFAULT 0,
  first_discovered_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_verified_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  evidence TEXT DEFAULT '{}',
  confidence TEXT DEFAULT 'High',
  verification_status TEXT DEFAULT 'unverified',
  is_demo_data INTEGER DEFAULT 0
);

-- Verification Records table
CREATE TABLE IF NOT EXISTS verification_records (
  id TEXT PRIMARY KEY,
  discovery_id TEXT NOT NULL,
  verification_timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  verification_status TEXT NOT NULL,
  claim TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL,
  evidence_text TEXT NOT NULL,
  confidence TEXT DEFAULT 'High',
  FOREIGN KEY (discovery_id) REFERENCES discoveries(id) ON DELETE CASCADE
);

-- Opportunities table (Phase 4 Engine)
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  scan_id TEXT,
  discovery_id TEXT,
  discovery_ids TEXT DEFAULT '[]',
  tool_ids TEXT DEFAULT '[]',
  title TEXT NOT NULL,
  summary TEXT,
  why_match TEXT,
  problem TEXT,
  solution TEXT,
  service_type TEXT,
  target_customer TEXT,
  customer_type TEXT,
  earning_potential TEXT,
  earning_basis TEXT,
  earning_confidence TEXT DEFAULT 'Low',
  origin TEXT DEFAULT 'template',
  workflow TEXT DEFAULT '[]',
  required_tools TEXT DEFAULT '[]',
  action_plan TEXT DEFAULT '[]',
  missing_skills TEXT DEFAULT '[]',
  startup_cost REAL DEFAULT 0,
  difficulty TEXT DEFAULT 'Medium',
  time_to_demo TEXT DEFAULT '1-2 days',
  potential_monetization TEXT,
  risks TEXT DEFAULT '[]',
  evidence TEXT DEFAULT '{}',
  score REAL DEFAULT 0,
  score_breakdown TEXT DEFAULT '{}',
  confidence TEXT DEFAULT 'High',
  saved INTEGER DEFAULT 0,
  status TEXT DEFAULT 'new',
  learning_adjustment REAL DEFAULT 0,
  learning_explanation TEXT,
  canonical_key TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  is_demo_data INTEGER DEFAULT 0,
  FOREIGN KEY (discovery_id) REFERENCES discoveries(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Feedback table (Phase 7 Learning Engine)
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  source_type TEXT NOT NULL DEFAULT 'opportunity',
  source_id TEXT NOT NULL,
  opportunity_id TEXT,
  combination_id TEXT,
  rating TEXT NOT NULL,
  reason TEXT,
  comments TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
  FOREIGN KEY (combination_id) REFERENCES tool_combinations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Learning Signals table (Phase 7 Learning Engine)
CREATE TABLE IF NOT EXISTS learning_signals (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  signal_value REAL DEFAULT 1.0,
  weight REAL NOT NULL,
  category TEXT,
  tool_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User Learning Profile summary table (Phase 7 Learning Engine)
CREATE TABLE IF NOT EXISTS learning_profile (
  id TEXT PRIMARY KEY DEFAULT 'user_learning_profile',
  user_id TEXT,
  preferred_categories TEXT DEFAULT '{}',
  preferred_capabilities TEXT DEFAULT '{}',
  preferred_tools TEXT DEFAULT '{}',
  preferred_work_types TEXT DEFAULT '{}',
  total_signals INTEGER DEFAULT 0,
  confidence_score REAL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Action Plans table (Phase 6 Engine)
CREATE TABLE IF NOT EXISTS action_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  opportunity_id TEXT,
  combination_id TEXT,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  summary TEXT,
  estimated_total_time TEXT NOT NULL DEFAULT '4-8 hours',
  difficulty TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'not_started',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
  FOREIGN KEY (combination_id) REFERENCES tool_combinations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Action Steps table (Phase 6 Engine)
CREATE TABLE IF NOT EXISTS action_steps (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action_plan_id TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  phase TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_time TEXT NOT NULL DEFAULT '1 hour',
  status TEXT NOT NULL DEFAULT 'not_started',
  notes TEXT,
  completed_at TEXT,
  FOREIGN KEY (action_plan_id) REFERENCES action_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Progress tracking table (Phase 6 Progress Engine)
CREATE TABLE IF NOT EXISTS progress_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action_plan_id TEXT,
  step_id TEXT,
  opportunity_id TEXT,
  combination_id TEXT,
  result_type TEXT NOT NULL DEFAULT 'general_note',
  outcome TEXT DEFAULT 'neutral',
  numeric_value REAL,
  notes TEXT,
  evidence_link TEXT,
  date TEXT,
  status_change TEXT,
  demos_created INTEGER DEFAULT 0,
  prospects_contacted INTEGER DEFAULT 0,
  responses_received INTEGER DEFAULT 0,
  clients_acquired INTEGER DEFAULT 0,
  revenue_earned REAL DEFAULT 0,
  hours_spent REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (action_plan_id) REFERENCES action_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (step_id) REFERENCES action_steps(id) ON DELETE SET NULL,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
  FOREIGN KEY (combination_id) REFERENCES tool_combinations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tool Combinations table (Phase 5 Combiner Engine)
CREATE TABLE IF NOT EXISTS tool_combinations (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  tool_ids TEXT NOT NULL DEFAULT '[]',
  tool_names TEXT NOT NULL DEFAULT '[]',
  discovery_ids TEXT NOT NULL DEFAULT '[]',
  origin TEXT NOT NULL DEFAULT 'profile_hypothesis',
  market_evidence TEXT NOT NULL DEFAULT 'limited',
  capability_chain TEXT NOT NULL DEFAULT '[]',
  workflow_pattern TEXT NOT NULL,
  workflow_steps TEXT NOT NULL DEFAULT '[]',
  concrete_outcome TEXT NOT NULL,
  customer_type TEXT NOT NULL,
  target_customer TEXT NOT NULL,
  monetization_hypothesis TEXT NOT NULL DEFAULT '{}',
  startup_cost REAL DEFAULT 0,
  is_zero_cost INTEGER DEFAULT 1,
  time_to_demo TEXT DEFAULT '1-2 days',
  difficulty TEXT DEFAULT 'Medium',
  score REAL DEFAULT 0,
  score_breakdown TEXT NOT NULL DEFAULT '{}',
  confidence TEXT DEFAULT 'Medium',
  learning_adjustment REAL DEFAULT 0,
  learning_explanation TEXT,
  canonical_key TEXT,
  saved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  is_demo_data INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Scan Records table (Phase 8 Opportunity Intelligence & On-Demand Scanning Engine)
CREATE TABLE IF NOT EXISTS scan_records (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  sources_attempted INTEGER DEFAULT 0,
  items_collected INTEGER DEFAULT 0,
  items_normalized INTEGER DEFAULT 0,
  duplicates_removed INTEGER DEFAULT 0,
  verified_count INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0,
  changed_count INTEGER DEFAULT 0,
  opportunities_generated INTEGER DEFAULT 0,
  errors TEXT DEFAULT '[]',
  duration_ms INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Product Story table (Dynamic Evolution Engine)
CREATE TABLE IF NOT EXISTS product_story (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 1,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  theme_detected TEXT DEFAULT 'General AI Discovery',
  narrative_stages TEXT NOT NULL DEFAULT '{}',
  discovery_ids TEXT NOT NULL DEFAULT '[]',
  is_current INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table (₹8/month with 3-Day Free Trial)
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL DEFAULT 'monthly_tier_8',
  plan_name TEXT NOT NULL DEFAULT 'Opportunity OS Pro',
  amount_paise INTEGER NOT NULL DEFAULT 800,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'trialing', -- 'trialing', 'active', 'past_due', 'cancelled', 'expired', 'pending_payment'
  trial_started_at TEXT,
  trial_expires_at TEXT,
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER DEFAULT 0,
  cancelled_at TEXT,
  billing_provider TEXT DEFAULT 'razorpay',
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  provider_payment_id TEXT,
  provider_order_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Payment transactions table (Idempotent order & webhook processing)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subscription_id TEXT,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  provider_order_id TEXT NOT NULL,
  provider_payment_id TEXT,
  provider_signature TEXT,
  amount_paise INTEGER NOT NULL DEFAULT 800,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL, -- 'created', 'paid', 'failed'
  error_code TEXT,
  error_description TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(provider_order_id);
`;
