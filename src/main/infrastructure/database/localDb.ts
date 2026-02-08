import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';
import { runMigrations } from './localDb.schema';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Local database not initialized. Call initLocalDb() first.');
  }
  return db;
}

export function initLocalDb(): Database.Database {
  if (db) return db;

  const dbPath = path.join(app.getPath('userData'), 'rockury.db');
  db = new Database(dbPath);

  runMigrations(db);

  return db;
}

export function closeLocalDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
