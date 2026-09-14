export const SCHEMA_SQL = `
-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
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
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  proficiency TEXT NOT NULL,
  confidence INTEGER DEFAULT 80,
  experience_years REAL DEFAULT 1,
  last_used TEXT DEFAULT 'Recently',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Tools table
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  access_type TEXT NOT NULL,
  cost_per_month REAL DEFAULT 0,
  capabilities TEXT DEFAULT '[]',
  familiarity INTEGER DEFAULT 80,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  goal TEXT NOT NULL,
  priority TEXT DEFAULT 'Medium',
  description TEXT,
  target_timeframe TEXT DEFAULT '1 month',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Interests table
CREATE TABLE IF NOT EXISTS interests (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  category TEXT NOT NULL,
  topic TEXT NOT NULL,
  industry TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  technologies TEXT DEFAULT '[]',
  status TEXT DEFAULT 'In Progress',
  relevance TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
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
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  is_demo_data INTEGER DEFAULT 0,
  FOREIGN KEY (discovery_id) REFERENCES discoveries(id) ON DELETE SET NULL
);

-- Action plans table (ready for Phase 6)
CREATE TABLE IF NOT EXISTS action_plans (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL,
  objective TEXT NOT NULL,
  target_timeframe TEXT DEFAULT '5 days',
  steps TEXT DEFAULT '[]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
);

-- Feedback table (ready for Phase 6 & 7)
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL,
  rating TEXT NOT NULL,
  reason TEXT,
  comments TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
);

-- Progress tracking table (ready for Phase 6)
CREATE TABLE IF NOT EXISTS progress_logs (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT,
  action_plan_id TEXT,
  status_change TEXT,
  demos_created INTEGER DEFAULT 0,
  prospects_contacted INTEGER DEFAULT 0,
  responses_received INTEGER DEFAULT 0,
  clients_acquired INTEGER DEFAULT 0,
  revenue_earned REAL DEFAULT 0,
  hours_spent REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tool Combinations table (Phase 5 Combiner Engine)
CREATE TABLE IF NOT EXISTS tool_combinations (
  id TEXT PRIMARY KEY,
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
  saved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  is_demo_data INTEGER DEFAULT 0
);
`;
