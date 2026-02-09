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

export const SQL_ADD_DIAGRAMS_VERSION = `
ALTER TABLE diagrams ADD COLUMN version TEXT NOT NULL DEFAULT '1.0.0';
`;

export const SQL_CREATE_DIAGRAM_MIGRATIONS = `
CREATE TABLE IF NOT EXISTS diagram_migrations (
  id TEXT PRIMARY KEY,
  diagram_id TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('virtual_to_real', 'real_to_virtual')),
  diff_snapshot TEXT NOT NULL,
  migration_ddl TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'applied', 'failed')),
  applied_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE,
  FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
  UNIQUE(diagram_id, connection_id, version_number)
);
`;

export const SQL_CREATE_DIAGRAM_MIGRATIONS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_migrations_diagram ON diagram_migrations(diagram_id);
CREATE INDEX IF NOT EXISTS idx_migrations_connection ON diagram_migrations(connection_id);
`;

export const SQL_CREATE_VIEW_SNAPSHOTS = `
CREATE TABLE IF NOT EXISTS view_snapshots (
  id TEXT PRIMARY KEY,
  diagram_id TEXT NOT NULL,
  name TEXT NOT NULL,
  filter_json TEXT NOT NULL DEFAULT '{}',
  layout_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE
);
`;

export const SQL_CREATE_VIEW_SNAPSHOTS_INDEX = `
CREATE INDEX IF NOT EXISTS idx_view_snapshots_diagram ON view_snapshots(diagram_id);
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
  SQL_CREATE_DIAGRAM_MIGRATIONS,
  SQL_CREATE_DIAGRAM_MIGRATIONS_INDEXES,
  SQL_CREATE_VIEW_SNAPSHOTS,
  SQL_CREATE_VIEW_SNAPSHOTS_INDEX,
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

    // Safe ALTER TABLE migrations (ignore if column already exists)
    const alterMigrations = [SQL_ADD_DIAGRAMS_VERSION];
    for (const sql of alterMigrations) {
      try {
        db.exec(sql);
      } catch {
        // Column already exists - safe to ignore
      }
    }
  });

  migrate();
}
