import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { SCHEMA_SQL } from './schema.js';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'opportunity_engine.db');

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
    { name: 'learning_explanation', type: "TEXT" }
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
    { name: 'learning_explanation', type: "TEXT" }
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
    CREATE TABLE IF NOT EXISTS learning_profile (
      id TEXT PRIMARY KEY DEFAULT 'user_learning_profile',
      preferred_categories TEXT DEFAULT '{}',
      preferred_capabilities TEXT DEFAULT '{}',
      preferred_tools TEXT DEFAULT '{}',
      preferred_work_types TEXT DEFAULT '{}',
      total_signals INTEGER DEFAULT 0,
      confidence_score REAL DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('[SQLite] All database tables initialized successfully.');
}
