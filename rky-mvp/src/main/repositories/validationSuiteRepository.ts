import { getDb } from '#/infrastructure';
import type { IValidationSuite, IValidationRule } from '~/shared/types/db';

interface SuiteRow {
  id: string;
  name: string;
  description: string;
  rules: string;
  created_at: string;
  updated_at: string;
}

function toSuite(row: SuiteRow): IValidationSuite {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    rules: JSON.parse(row.rules) as IValidationRule[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const validationSuiteRepository = {
  list(): IValidationSuite[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM validation_suites ORDER BY created_at DESC').all() as SuiteRow[];
    return rows.map(toSuite);
  },

  getById(id: string): IValidationSuite | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM validation_suites WHERE id = ?').get(id) as SuiteRow | undefined;
    return row ? toSuite(row) : null;
  },

  create(data: { name: string; description: string }): IValidationSuite {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO validation_suites (id, name, description) VALUES (?, ?, ?)`,
    ).run(id, data.name, data.description);
    return this.getById(id)!;
  },

  update(id: string, data: Partial<{ name: string; description: string; rules: IValidationRule[] }>): IValidationSuite {
    const db = getDb();
    const sets: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
    if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description); }
    if (data.rules !== undefined) { sets.push('rules = ?'); params.push(JSON.stringify(data.rules)); }

    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      params.push(id);
      db.prepare(`UPDATE validation_suites SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    }
    return this.getById(id)!;
  },

  deleteById(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM validation_suites WHERE id = ?').run(id);
  },
};
