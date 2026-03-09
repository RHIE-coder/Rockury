import { getDb } from '#/infrastructure';
import type { IQuery } from '~/shared/types/db';

interface QueryRow {
  id: string;
  name: string;
  description: string;
  sql_content: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

function toQuery(row: QueryRow): IQuery {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sqlContent: row.sql_content,
    tags: JSON.parse(row.tags) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const queryRepository = {
  list(): IQuery[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM queries ORDER BY updated_at DESC').all() as QueryRow[];
    return rows.map(toQuery);
  },

  create(data: {
    name: string;
    description: string;
    sqlContent: string;
    tags: string[];
  }): IQuery {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      'INSERT INTO queries (id, name, description, sql_content, tags) VALUES (?, ?, ?, ?, ?)',
    ).run(id, data.name, data.description, data.sqlContent, JSON.stringify(data.tags));

    const row = db.prepare('SELECT * FROM queries WHERE id = ?').get(id) as QueryRow;
    return toQuery(row);
  },

  update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      sqlContent: string;
      tags: string[];
    }>,
  ): IQuery {
    const db = getDb();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { sets.push('description = ?'); values.push(data.description); }
    if (data.sqlContent !== undefined) { sets.push('sql_content = ?'); values.push(data.sqlContent); }
    if (data.tags !== undefined) { sets.push('tags = ?'); values.push(JSON.stringify(data.tags)); }

    if (sets.length > 0) {
      sets.push(`updated_at = datetime('now')`);
      values.push(id);
      db.prepare(`UPDATE queries SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }

    const row = db.prepare('SELECT * FROM queries WHERE id = ?').get(id) as QueryRow;
    return toQuery(row);
  },

  deleteById(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM queries WHERE id = ?').run(id);
  },
};
