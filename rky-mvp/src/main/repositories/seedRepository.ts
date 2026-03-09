import { getDb } from '#/infrastructure';
import type { ISeedFile } from '~/shared/types/db';

interface SeedRow {
  id: string;
  name: string;
  description: string;
  dml_content: string;
  target_tables: string;
  created_at: string;
  updated_at: string;
}

function toSeedFile(row: SeedRow): ISeedFile {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    dmlContent: row.dml_content,
    targetTables: JSON.parse(row.target_tables) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const seedRepository = {
  list(): ISeedFile[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM seeds ORDER BY created_at DESC').all() as SeedRow[];
    return rows.map(toSeedFile);
  },

  getById(id: string): ISeedFile | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM seeds WHERE id = ?').get(id) as SeedRow | undefined;
    return row ? toSeedFile(row) : null;
  },

  create(data: { name: string; description: string; dmlContent: string; targetTables: string[] }): ISeedFile {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO seeds (id, name, description, dml_content, target_tables) VALUES (?, ?, ?, ?, ?)`,
    ).run(id, data.name, data.description, data.dmlContent, JSON.stringify(data.targetTables));
    return this.getById(id)!;
  },

  update(id: string, data: Partial<{ name: string; description: string; dmlContent: string; targetTables: string[] }>): ISeedFile {
    const db = getDb();
    const sets: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
    if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description); }
    if (data.dmlContent !== undefined) { sets.push('dml_content = ?'); params.push(data.dmlContent); }
    if (data.targetTables !== undefined) { sets.push('target_tables = ?'); params.push(JSON.stringify(data.targetTables)); }

    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      params.push(id);
      db.prepare(`UPDATE seeds SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    }
    return this.getById(id)!;
  },

  deleteById(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM seeds WHERE id = ?').run(id);
  },
};
