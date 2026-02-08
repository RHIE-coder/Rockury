import type Database from 'better-sqlite3';

export const SQL_CREATE_PACKAGES = `
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const SQL_CREATE_PACKAGE_RESOURCES = `
CREATE TABLE IF NOT EXISTS package_resources (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  is_shared INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
  UNIQUE(package_id, resource_type, resource_id)
);
`;

export const SQL_CREATE_CONNECTIONS = `
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  db_type TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  database_name TEXT NOT NULL,
  username TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  ssl_enabled INTEGER NOT NULL DEFAULT 0,
  ssl_config TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const SQL_CREATE_DIAGRAMS = `
CREATE TABLE IF NOT EXISTS diagrams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'virtual',
  tables_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const SQL_CREATE_DIAGRAM_LAYOUTS = `
CREATE TABLE IF NOT EXISTS diagram_layouts (
  diagram_id TEXT PRIMARY KEY,
  positions TEXT NOT NULL DEFAULT '{}',
  zoom REAL NOT NULL DEFAULT 1.0,
  viewport TEXT NOT NULL DEFAULT '{"x":0,"y":0}',
  FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE
);
`;

export const SQL_CREATE_DIAGRAM_VERSIONS = `
CREATE TABLE IF NOT EXISTS diagram_versions (
  id TEXT PRIMARY KEY,
  diagram_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  ddl_content TEXT NOT NULL DEFAULT '',
  schema_snapshot TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE
);
`;

export const SQL_CREATE_QUERIES = `
CREATE TABLE IF NOT EXISTS queries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sql_content TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const SQL_CREATE_QUERY_HISTORY = `
CREATE TABLE IF NOT EXISTS query_history (
  id TEXT PRIMARY KEY,
  query_id TEXT,
  sql_content TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  row_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  executed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE SET NULL
);
`;

export const SQL_CREATE_DOCUMENTS = `
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  auto_generated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const ALL_MIGRATIONS = [
  SQL_CREATE_PACKAGES,
  SQL_CREATE_PACKAGE_RESOURCES,
  SQL_CREATE_CONNECTIONS,
  SQL_CREATE_DIAGRAMS,
  SQL_CREATE_DIAGRAM_LAYOUTS,
  SQL_CREATE_DIAGRAM_VERSIONS,
  SQL_CREATE_QUERIES,
  SQL_CREATE_QUERY_HISTORY,
  SQL_CREATE_DOCUMENTS,
];

export function runMigrations(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const migrate = db.transaction(() => {
    for (const sql of ALL_MIGRATIONS) {
      db.exec(sql);
    }
  });

  migrate();
}
