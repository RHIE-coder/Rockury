import { getDb } from '#/infrastructure';
import type { IConnection, TDbType } from '~/shared/types/db';

interface ConnectionRow {
  id: string;
  name: string;
  db_type: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  encrypted_password: string;
  ssl_enabled: number;
  ssl_config: string | null;
  sort_order: number;
  ignored: number;
  created_at: string;
  updated_at: string;
}

function toConnection(row: ConnectionRow): IConnection {
  return {
    id: row.id,
    name: row.name,
    dbType: row.db_type as TDbType,
    host: row.host,
    port: row.port,
    database: row.database_name,
    username: row.username,
    sslEnabled: row.ssl_enabled === 1,
    sslConfig: row.ssl_config ? JSON.parse(row.ssl_config) : undefined,
    ignored: row.ignored === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const connectionRepository = {
  list(): IConnection[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM connections ORDER BY sort_order ASC, created_at DESC').all() as ConnectionRow[];
    return rows.map(toConnection);
  },

  getById(id: string): IConnection | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM connections WHERE id = ?').get(id) as ConnectionRow | undefined;
    return row ? toConnection(row) : null;
  },

  create(data: {
    name: string;
    dbType: TDbType;
    host: string;
    port: number;
    database: string;
    username: string;
    encryptedPassword: string;
    sslEnabled: boolean;
    sslConfig?: Record<string, unknown>;
  }): IConnection {
    const db = getDb();
    const id = crypto.randomUUID();
    const maxOrder = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) as max_order FROM connections').get() as { max_order: number }).max_order;
    db.prepare(
      `INSERT INTO connections (id, name, db_type, host, port, database_name, username, encrypted_password, ssl_enabled, ssl_config, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      data.name,
      data.dbType,
      data.host,
      data.port,
      data.database,
      data.username,
      data.encryptedPassword,
      data.sslEnabled ? 1 : 0,
      data.sslConfig ? JSON.stringify(data.sslConfig) : null,
      maxOrder + 1,
    );
    return this.getById(id)!;
  },

  update(
    id: string,
    data: Partial<{
      name: string;
      dbType: TDbType;
      host: string;
      port: number;
      database: string;
      username: string;
      encryptedPassword: string;
      sslEnabled: boolean;
      sslConfig: Record<string, unknown>;
    }>,
  ): IConnection {
    const db = getDb();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
    if (data.dbType !== undefined) { sets.push('db_type = ?'); values.push(data.dbType); }
    if (data.host !== undefined) { sets.push('host = ?'); values.push(data.host); }
    if (data.port !== undefined) { sets.push('port = ?'); values.push(data.port); }
    if (data.database !== undefined) { sets.push('database_name = ?'); values.push(data.database); }
    if (data.username !== undefined) { sets.push('username = ?'); values.push(data.username); }
    if (data.encryptedPassword !== undefined) { sets.push('encrypted_password = ?'); values.push(data.encryptedPassword); }
    if (data.sslEnabled !== undefined) { sets.push('ssl_enabled = ?'); values.push(data.sslEnabled ? 1 : 0); }
    if (data.sslConfig !== undefined) { sets.push('ssl_config = ?'); values.push(JSON.stringify(data.sslConfig)); }

    if (sets.length > 0) {
      sets.push(`updated_at = datetime('now')`);
      values.push(id);
      db.prepare(`UPDATE connections SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getById(id)!;
  },

  setIgnored(id: string, ignored: boolean): IConnection {
    const db = getDb();
    db.prepare(`UPDATE connections SET ignored = ?, updated_at = datetime('now') WHERE id = ?`).run(ignored ? 1 : 0, id);
    return this.getById(id)!;
  },

  deleteById(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM connections WHERE id = ?').run(id);
  },

  reorder(orderedIds: string[]): void {
    const db = getDb();
    const stmt = db.prepare('UPDATE connections SET sort_order = ? WHERE id = ?');
    const run = db.transaction(() => {
      orderedIds.forEach((id, index) => {
        stmt.run(index + 1, id);
      });
    });
    run();
  },

  getByIdWithPassword(id: string): (IConnection & { encryptedPassword: string }) | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM connections WHERE id = ?').get(id) as ConnectionRow | undefined;
    if (!row) return null;
    return {
      ...toConnection(row),
      encryptedPassword: row.encrypted_password,
    };
  },
};
