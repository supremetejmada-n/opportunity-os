import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { SCHEMA_SQL } from './schema.js';
import { hashPassword } from '../services/authService.js';

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'opportunity_engine.db');
const DB_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err);
  } else {
    console.log(`[SQLite] Connected successfully to database at ${DB_PATH}`);
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON;');

// Helper promise functions
export function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row as T);
    });
  });
}

export function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve((rows || []) as T[]);
    });
  });
}

export async function initDatabase(): Promise<void> {
  const statements = SCHEMA_SQL.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const statement of statements) {
    await dbRun(statement);
  }

  // Ensure new Phase 4 columns exist on opportunities table if table was created previously
  const columns = await dbAll<{ name: string }>("PRAGMA table_info(opportunities);");
  const colNames = new Set(columns.map(c => c.name));

  const missingCols = [
    { name: 'discovery_ids', type: "TEXT DEFAULT '[]'" },
    { name: 'tool_ids', type: "TEXT DEFAULT '[]'" },
    { name: 'summary', type: "TEXT" },
    { name: 'why_match', type: "TEXT" },
    { name: 'customer_type', type: "TEXT" },
    { name: 'earning_potential', type: "TEXT" },
    { name: 'earning_basis', type: "TEXT" },
    { name: 'earning_confidence', type: "TEXT DEFAULT 'Low'" },
    { name: 'origin', type: "TEXT DEFAULT 'template'" },
    { name: 'action_plan', type: "TEXT DEFAULT '[]'" },
    { name: 'learning_adjustment', type: "REAL DEFAULT 0" },
    { name: 'learning_explanation', type: "TEXT" },
    { name: 'canonical_key', type: "TEXT" },
    { name: 'scan_id', type: "TEXT" }
  ];

  for (const col of missingCols) {
    if (!colNames.has(col.name)) {
      try {
        await dbRun(`ALTER TABLE opportunities ADD COLUMN ${col.name} ${col.type};`);
        console.log(`[SQLite Migration] Added column '${col.name}' to opportunities table.`);
      } catch (err: any) {
        console.warn(`[SQLite Migration] Note adding column ${col.name}:`, err?.message);
      }
    }
  }

  await dbRun(`CREATE INDEX IF NOT EXISTS idx_opportunities_canonical_key ON opportunities(canonical_key);`);

  // Ensure tool_combinations table exists
  await dbRun(`
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
      learning_adjustment REAL DEFAULT 0,
      learning_explanation TEXT,
      canonical_key TEXT,
      saved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_demo_data INTEGER DEFAULT 0
    );
  `);

  // Ensure new columns exist on tool_combinations if table was created previously
  const comboCols = await dbAll<{ name: string }>("PRAGMA table_info(tool_combinations);");
  const comboColNames = new Set(comboCols.map(c => c.name));
  const missingComboCols = [
    { name: 'discovery_ids', type: "TEXT DEFAULT '[]'" },
    { name: 'origin', type: "TEXT DEFAULT 'profile_hypothesis'" },
    { name: 'market_evidence', type: "TEXT DEFAULT 'limited'" },
    { name: 'learning_adjustment', type: "REAL DEFAULT 0" },
    { name: 'learning_explanation', type: "TEXT" },
    { name: 'canonical_key', type: "TEXT" }
  ];
  for (const col of missingComboCols) {
    if (!comboColNames.has(col.name)) {
      try {
        await dbRun(`ALTER TABLE tool_combinations ADD COLUMN ${col.name} ${col.type};`);
        console.log(`[SQLite Migration] Added column '${col.name}' to tool_combinations table.`);
      } catch (err: any) {
        console.warn(`[SQLite Migration] Note adding column ${col.name}:`, err?.message);
      }
    }
  }

  await dbRun(`CREATE INDEX IF NOT EXISTS idx_tool_combinations_canonical_key ON tool_combinations(canonical_key);`);

  // Ensure Phase 6 Action Plans & Progress tables exist
  const planCols = await dbAll<{ name: string }>("PRAGMA table_info(action_plans);");
  const planColNames = new Set(planCols.map(c => c.name));
  if (planCols.length > 0 && !planColNames.has('combination_id')) {
    await dbRun(`DROP TABLE IF EXISTS action_plans;`);
  }

  await dbRun(`
    CREATE TABLE IF NOT EXISTS action_plans (
      id TEXT PRIMARY KEY,
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
      FOREIGN KEY (combination_id) REFERENCES tool_combinations(id) ON DELETE CASCADE
    );
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS action_steps (
      id TEXT PRIMARY KEY,
      action_plan_id TEXT NOT NULL,
      step_order INTEGER NOT NULL,
      phase TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      estimated_time TEXT NOT NULL DEFAULT '1 hour',
      status TEXT NOT NULL DEFAULT 'not_started',
      notes TEXT,
      completed_at TEXT,
      FOREIGN KEY (action_plan_id) REFERENCES action_plans(id) ON DELETE CASCADE
    );
  `);

  // Ensure progress_logs has all required Phase 6 columns
  const progCols = await dbAll<{ name: string }>("PRAGMA table_info(progress_logs);");
  const progColNames = new Set(progCols.map(c => c.name));
  const missingProgCols = [
    { name: 'step_id', type: "TEXT" },
    { name: 'combination_id', type: "TEXT" },
    { name: 'result_type', type: "TEXT NOT NULL DEFAULT 'general_note'" },
    { name: 'outcome', type: "TEXT DEFAULT 'neutral'" },
    { name: 'numeric_value', type: "REAL" },
    { name: 'evidence_link', type: "TEXT" },
    { name: 'date', type: "TEXT" }
  ];
  for (const col of missingProgCols) {
    if (!progColNames.has(col.name)) {
      try {
        await dbRun(`ALTER TABLE progress_logs ADD COLUMN ${col.name} ${col.type};`);
        console.log(`[SQLite Migration] Added column '${col.name}' to progress_logs table.`);
      } catch (err: any) {
        console.warn(`[SQLite Migration] Note adding column ${col.name}:`, err?.message);
      }
    }
  }

  // Ensure Phase 7 Learning & Adaptive Engine tables exist
  await dbRun(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL DEFAULT 'opportunity',
      source_id TEXT NOT NULL,
      opportunity_id TEXT,
      combination_id TEXT,
      rating TEXT NOT NULL,
      reason TEXT,
      comments TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
      FOREIGN KEY (combination_id) REFERENCES tool_combinations(id) ON DELETE CASCADE
    );
  `);

  const fbCols = await dbAll<{ name: string }>("PRAGMA table_info(feedback);");
  const fbColNames = new Set(fbCols.map(c => c.name));
  const missingFbCols = [
    { name: 'source_type', type: "TEXT NOT NULL DEFAULT 'opportunity'" },
    { name: 'source_id', type: "TEXT DEFAULT ''" },
    { name: 'combination_id', type: "TEXT" }
  ];
  for (const col of missingFbCols) {
    if (!fbColNames.has(col.name)) {
      try {
        await dbRun(`ALTER TABLE feedback ADD COLUMN ${col.name} ${col.type};`);
        console.log(`[SQLite Migration] Added column '${col.name}' to feedback table.`);
      } catch (err: any) {
        console.warn(`[SQLite Migration] Note adding column ${col.name}:`, err?.message);
      }
    }
  }

  await dbRun(`
    CREATE TABLE IF NOT EXISTS learning_signals (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      signal_type TEXT NOT NULL,
      signal_value REAL DEFAULT 1.0,
      weight REAL NOT NULL,
      category TEXT,
      tool_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_type, source_id, signal_type)
    );
  `);

  await dbRun(`
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
  `);

  // Seed default Product Story v1 if table is empty or update v1 to match curated narrative
  const defaultStages = {
    discover: {
      id: "discover",
      badge: "01 DISCOVER · LIVE MARKET RADAR",
      headline: "Find what's newly available.",
      body: "Opportunity OS scans daily AI releases, filters out the technical noise, and surfaces practical tools you can start using immediately."
    },
    understand: {
      id: "understand",
      badge: "02 UNDERSTAND · SKILL & TOOL FIT",
      headline: "Match tools to what you already know.",
      body: "Instantly see realistic client services you can deliver with free tools like Gemini, Canva, and WhatsApp—zero coding required."
    },
    combine: {
      id: "combine",
      badge: "03 COMBINE · TOOL WORKFLOWS",
      headline: "Combine tools into complete services.",
      body: "Stack simple tools together to create end-to-end deliverables for local businesses, from social media kits to customer inquiry setups."
    },
    act: {
      id: "act",
      badge: "04 ACT · EXECUTION ROADMAP",
      headline: "Turn opportunity into a step-by-step plan.",
      body: "Follow clear, bite-sized checklists with copy-paste prompts and client outreach templates to land your first buyer."
    },
    learn: {
      id: "learn",
      badge: "05 LEARN · SMARTER MATCHING",
      headline: "Your results sharpen what comes next.",
      body: "Every completed project refines your matching engine to recommend higher-value opportunities tailored to your track record."
    }
  };

  const storyCount = await dbGet<{ count: number }>('SELECT COUNT(*) as count FROM product_story;');
  if (!storyCount || storyCount.count === 0) {
    const now = new Date().toISOString();
    await dbRun(
      `INSERT INTO product_story (
        id, version, headline, summary, theme_detected, narrative_stages, discovery_ids, is_current, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
      [
        'story_v1',
        1,
        "Find what's newly available.",
        "Opportunity OS scans daily AI releases, filters out the technical noise, and surfaces practical tools you can start using immediately.",
        "Live Market Radar",
        JSON.stringify(defaultStages),
        '[]',
        now,
        now
      ]
    );
    console.log('[SQLite Seed] Default Product Story (v1) initialized.');
  } else {
    // Update active story if it contains legacy uncurated stages
    await dbRun(
      `UPDATE product_story SET
        headline = 'Find what''s newly available.',
        summary = 'Opportunity OS scans daily AI releases, filters out the technical noise, and surfaces practical tools you can start using immediately.',
        theme_detected = 'Live Market Radar',
        narrative_stages = ?
      WHERE is_current = 1 AND (narrative_stages LIKE '%SADC%' OR narrative_stages LIKE '%Grounded in%' OR headline LIKE '%Evolving%');`,
      [JSON.stringify(defaultStages)]
    );
  }

  // Safe one-time cleanup of synthetic seed/test data in local SQLite tables
  try {
    await dbRun(`DELETE FROM skills WHERE id IN ('skill_1', 'skill_2', 'skill_3', 'skill_4');`);
    await dbRun(`DELETE FROM tools WHERE id IN ('tool_1', 'tool_2', 'tool_3', 'tool_4', 'tool_5');`);
    await dbRun(`DELETE FROM goals WHERE id IN ('goal_1', 'goal_2');`);
    await dbRun(`DELETE FROM interests WHERE id IN ('interest_1', 'interest_2');`);
    await dbRun(`DELETE FROM projects WHERE id IN ('project_1');`);
    await dbRun(`DELETE FROM action_plans WHERE title LIKE '%Phase 8%' OR title LIKE '%chronocode7%' OR title LIKE '%SH98%' OR title LIKE '%Test%';`);
    await dbRun(`DELETE FROM progress_logs WHERE action_plan_id NOT IN (SELECT id FROM action_plans);`);
  } catch (err: any) {
    console.warn('[SQLite Migration] Safe cleanup note:', err?.message);
  }

  // Multi-Tenant SaaS Migration & Ownership Backfill
  const userScopedTables = [
    'profiles',
    'skills',
    'tools',
    'goals',
    'interests',
    'projects',
    'opportunities',
    'tool_combinations',
    'action_plans',
    'action_steps',
    'progress_logs',
    'feedback',
    'learning_signals',
    'learning_profile',
    'scan_records',
    'subscriptions',
    'payment_transactions'
  ];

  for (const tableName of userScopedTables) {
    try {
      const cols = await dbAll<{ name: string }>(`PRAGMA table_info(${tableName});`);
      const names = new Set(cols.map(c => c.name));
      if (cols.length > 0 && !names.has('user_id')) {
        await dbRun(`ALTER TABLE ${tableName} ADD COLUMN user_id TEXT;`);
        console.log(`[SQLite Migration] Added 'user_id' column to ${tableName} table.`);
      }
      if (cols.length > 0) {
        await dbRun(`CREATE INDEX IF NOT EXISTS idx_${tableName}_user_id ON ${tableName}(user_id);`);
      }
    } catch (err: any) {
      console.warn(`[SQLite Migration] Note adding user_id to ${tableName}:`, err?.message);
    }
  }

  // Seed legacy owner user if not already present
  const legacyUser = await dbGet<any>('SELECT id FROM users WHERE id = "user-default-legacy";');
  if (!legacyUser) {
    const legacyEmail = process.env.INITIAL_OWNER_EMAIL || 'owner@opportunityos.local';
    const isProd = process.env.NODE_ENV === 'production';
    const legacyPassword = process.env.INITIAL_OWNER_PASSWORD || (isProd ? crypto.randomBytes(24).toString('hex') : 'OpportunityOS!2026');
    const { hash, salt } = await hashPassword(legacyPassword);
    const now = new Date().toISOString();
    await dbRun(
      `INSERT INTO users (id, email, password_hash, salt, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      ['user-default-legacy', legacyEmail, hash, salt, 'Supreme Tej', now, now]
    );
    console.log(`[SQLite Migration] Legacy owner account initialized for user-default-legacy (${legacyEmail})`);
  }

  // Safe, non-destructive legacy data backfill: associate existing unowned records with legacy owner
  await dbRun(`UPDATE profiles SET user_id = 'user-default-legacy' WHERE user_id IS NULL OR user_id = '';`);
  await dbRun(`UPDATE skills SET user_id = COALESCE((SELECT user_id FROM profiles WHERE profiles.id = skills.profile_id), 'user-default-legacy') WHERE user_id IS NULL OR user_id = '';`);
  await dbRun(`UPDATE tools SET user_id = COALESCE((SELECT user_id FROM profiles WHERE profiles.id = tools.profile_id), 'user-default-legacy') WHERE user_id IS NULL OR user_id = '';`);
  await dbRun(`UPDATE goals SET user_id = COALESCE((SELECT user_id FROM profiles WHERE profiles.id = goals.profile_id), 'user-default-legacy') WHERE user_id IS NULL OR user_id = '';`);
  await dbRun(`UPDATE interests SET user_id = COALESCE((SELECT user_id FROM profiles WHERE profiles.id = interests.profile_id), 'user-default-legacy') WHERE user_id IS NULL OR user_id = '';`);
  await dbRun(`UPDATE projects SET user_id = COALESCE((SELECT user_id FROM profiles WHERE profiles.id = projects.profile_id), 'user-default-legacy') WHERE user_id IS NULL OR user_id = '';`);
  await dbRun(`UPDATE opportunities SET user_id = 'user-default-legacy' WHERE user_id IS NULL OR user_id = '';`);
  await dbRun(`UPDATE tool_combinations SET user_id = 'user-default-legacy' WHERE user_id IS NULL OR user_id = '';`);
  await dbRun(`UPDATE action_plans SET user_id = 'user-default-legacy' WHERE user_id IS NULL OR user_id = '';`);
  await dbRun(`UPDATE action_steps SET user_id = COALESCE((SELECT user_id FROM action_plans WHERE action_plans.id = action_steps.action_plan_id), 'user-default-legacy') WHERE user_id IS NULL OR user_id = '';`);
  await dbRun(`UPDATE progress_logs SET user_id = COALESCE((SELECT user_id FROM action_plans WHERE action_plans.id = progress_logs.action_plan_id), 'user-default-legacy') WHERE user_id IS NULL OR user_id = '';`);
  await dbRun(`UPDATE feedback SET user_id = 'user-default-legacy' WHERE user_id IS NULL OR user_id = '';`);
  await dbRun(`UPDATE learning_signals SET user_id = 'user-default-legacy' WHERE user_id IS NULL OR user_id = '';`);
  await dbRun(`UPDATE learning_profile SET user_id = 'user-default-legacy' WHERE user_id IS NULL OR user_id = '';`);
  await dbRun(`UPDATE learning_profile SET id = 'user_learning_profile' WHERE user_id = 'user-default-legacy';`);
  await dbRun(`UPDATE scan_records SET user_id = 'user-default-legacy' WHERE user_id IS NULL OR user_id = '';`);

  // Provision subscription for legacy owner if not already present
  const legacySub = await dbGet<any>('SELECT id FROM subscriptions WHERE user_id = "user-default-legacy";');
  if (!legacySub) {
    const now = new Date().toISOString();
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    await dbRun(
      `INSERT INTO subscriptions (id, user_id, plan_id, plan_name, amount_paise, currency, status, trial_started_at, trial_expires_at, current_period_start, current_period_end, created_at, updated_at)
       VALUES (?, ?, 'monthly_tier_8', 'Opportunity OS Pro', 800, 'INR', 'active', ?, ?, ?, ?, ?, ?);`,
      ['sub_legacy_owner', 'user-default-legacy', now, futureDate, now, futureDate, now, now]
    );
  }

  // Backfill subscriptions for any other existing users without subscriptions
  try {
    const unseededUsers = await dbAll<{ id: string; created_at: string }>(
      'SELECT id, created_at FROM users WHERE id NOT IN (SELECT user_id FROM subscriptions);'
    );
    for (const u of unseededUsers) {
      const createdAt = u.created_at || new Date().toISOString();
      const trialStart = new Date(createdAt).getTime();
      const trialExpires = new Date(trialStart + 3 * 24 * 60 * 60 * 1000).toISOString();
      const isExpired = Date.now() > trialStart + 3 * 24 * 60 * 60 * 1000;
      const status = isExpired ? 'expired' : 'trialing';
      await dbRun(
        `INSERT INTO subscriptions (id, user_id, plan_id, plan_name, amount_paise, currency, status, trial_started_at, trial_expires_at, created_at, updated_at)
         VALUES (?, ?, 'monthly_tier_8', 'Opportunity OS Pro', 800, 'INR', ?, ?, ?, ?, ?);`,
        [`sub_${u.id}`, u.id, status, new Date(trialStart).toISOString(), trialExpires, createdAt, createdAt]
      );
    }
  } catch (err: any) {
    console.warn('[SQLite Migration] Note seeding existing user subscriptions:', err?.message);
  }

  console.log('[SQLite] All database tables initialized successfully.');
}
