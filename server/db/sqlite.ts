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
    { name: 'action_plan', type: "TEXT DEFAULT '[]'" }
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

  console.log('[SQLite] All database tables initialized successfully.');
}
