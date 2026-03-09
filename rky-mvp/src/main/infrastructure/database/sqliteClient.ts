import Database from 'better-sqlite3';

export interface ISqliteConnectionConfig {
  database: string; // file path
}

export function createSqliteConnection(config: ISqliteConnectionConfig): Database.Database {
  const db = new Database(config.database, { readonly: true, timeout: 10_000 });
  return db;
}

export function closeSqliteConnection(db: Database.Database): void {
  db.close();
}
