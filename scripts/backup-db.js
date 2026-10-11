#!/usr/bin/env node
/**
 * Opportunity OS — SQLite Safe Backup & Restore Utility
 *
 * Uses SQLite's atomic `VACUUM INTO` command for safe, non-blocking online backups
 * without interrupting running traffic or risking partial write corruption.
 *
 * Usage:
 *   node scripts/backup-db.js backup [output-file.db]
 *   node scripts/backup-db.js restore <source-backup.db>
 *   node scripts/backup-db.js list
 */

import fs from 'node:fs';
import path from 'node:path';
import sqlite3 from 'sqlite3';

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'opportunity_engine.db');
const BACKUP_DIR = path.resolve(process.cwd(), 'data', 'backups');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function backup() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`[Backup Error] Database file not found at: ${DB_PATH}`);
    process.exit(1);
  }

  ensureDir(BACKUP_DIR);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetFile = process.argv[3]
    ? path.resolve(process.cwd(), process.argv[3])
    : path.join(BACKUP_DIR, `opportunity_engine_backup_${timestamp}.db`);

  if (fs.existsSync(targetFile)) {
    console.error(`[Backup Error] Target backup file already exists: ${targetFile}`);
    process.exit(1);
  }

  console.log(`[Backup] Connecting to source database: ${DB_PATH}`);
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE);

  return new Promise((resolve, reject) => {
    // Escape single quotes for SQL safety
    const escapedTarget = targetFile.replace(/'/g, "''");
    console.log(`[Backup] Executing atomic VACUUM INTO '${targetFile}'...`);
    db.run(`VACUUM INTO '${escapedTarget}'`, (err) => {
      db.close();
      if (err) {
        console.error(`[Backup Failed]:`, err.message);
        reject(err);
      } else {
        const stats = fs.statSync(targetFile);
        console.log(`[Backup Success] Created snapshot: ${targetFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        resolve(targetFile);
      }
    });
  });
}

async function restore() {
  const sourceFile = process.argv[3];
  if (!sourceFile) {
    console.error(`[Restore Error] Please specify a backup file to restore from.`);
    console.error(`Usage: node scripts/backup-db.js restore <path/to/backup.db>`);
    process.exit(1);
  }

  const resolvedSource = path.resolve(process.cwd(), sourceFile);
  if (!fs.existsSync(resolvedSource)) {
    console.error(`[Restore Error] Source backup file not found: ${resolvedSource}`);
    process.exit(1);
  }

  // Pre-restore safety backup
  if (fs.existsSync(DB_PATH)) {
    ensureDir(BACKUP_DIR);
    const preRestoreSafety = path.join(BACKUP_DIR, `pre_restore_safety_${Date.now()}.db`);
    console.log(`[Restore Safety] Archiving existing database to ${preRestoreSafety}...`);
    fs.copyFileSync(DB_PATH, preRestoreSafety);
  }

  console.log(`[Restore] Copying ${resolvedSource} -> ${DB_PATH}...`);
  fs.copyFileSync(resolvedSource, DB_PATH);
  console.log(`[Restore Success] Database successfully restored from ${resolvedSource}.`);
}

function list() {
  ensureDir(BACKUP_DIR);
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.db'));
  console.log(`[Backups in ${BACKUP_DIR}]:`);
  if (files.length === 0) {
    console.log('  (No backups found)');
    return;
  }
  for (const f of files) {
    const full = path.join(BACKUP_DIR, f);
    const stat = fs.statSync(full);
    console.log(`  - ${f} (${(stat.size / 1024 / 1024).toFixed(2)} MB, modified ${stat.mtime.toISOString()})`);
  }
}

const command = process.argv[2] || 'backup';

if (command === 'backup') {
  backup().catch(() => process.exit(1));
} else if (command === 'restore') {
  restore().catch(() => process.exit(1));
} else if (command === 'list') {
  list();
} else {
  console.log(`Unknown command: ${command}`);
  console.log(`Usage: node scripts/backup-db.js [backup|restore|list]`);
  process.exit(1);
}
