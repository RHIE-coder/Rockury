import { getDb } from '#/infrastructure';
import type { IDiagramVersion } from '~/shared/types/db';

interface DiagramVersionRow {
  id: string;
  diagram_id: string;
  version_number: number;
  name: string;
  ddl_content: string;
  schema_snapshot: string;
  sort_order: number;
  is_locked: number;
  created_at: string;
}

function toVersion(row: DiagramVersionRow): IDiagramVersion {
  return {
    id: row.id,
    diagramId: row.diagram_id,
    versionNumber: row.version_number,
    name: row.name ?? '',
    ddlContent: row.ddl_content,
    schemaSnapshot: JSON.parse(row.schema_snapshot),
    sortOrder: row.sort_order ?? 0,
    isLocked: row.is_locked === 1,
    createdAt: row.created_at,
  };
}

export const diagramVersionRepository = {
  list(diagramId: string): IDiagramVersion[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM diagram_versions WHERE diagram_id = ? ORDER BY sort_order ASC, version_number DESC',
    ).all(diagramId) as DiagramVersionRow[];
    return rows.map(toVersion);
  },

  create(data: {
    diagramId: string;
    name: string;
    ddlContent: string;
    schemaSnapshot: unknown;
  }): IDiagramVersion {
    const db = getDb();
    const id = crypto.randomUUID();

    // Determine next version number
    const latest = db.prepare(
      'SELECT MAX(version_number) as max_ver FROM diagram_versions WHERE diagram_id = ?',
    ).get(data.diagramId) as { max_ver: number | null };

    const versionNumber = (latest.max_ver ?? 0) + 1;

    // Determine next sort_order
    const maxOrder = db.prepare(
      'SELECT MAX(sort_order) as max_ord FROM diagram_versions WHERE diagram_id = ?',
    ).get(data.diagramId) as { max_ord: number | null };

    const sortOrder = (maxOrder.max_ord ?? 0) + 1;

    db.prepare(
      `INSERT INTO diagram_versions (id, diagram_id, version_number, name, ddl_content, schema_snapshot, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, data.diagramId, versionNumber, data.name, data.ddlContent, JSON.stringify(data.schemaSnapshot), sortOrder);

    const row = db.prepare('SELECT * FROM diagram_versions WHERE id = ?').get(id) as DiagramVersionRow;
    return toVersion(row);
  },

  update(id: string, data: { name?: string; ddlContent?: string; schemaSnapshot?: unknown; isLocked?: boolean }): IDiagramVersion {
    const db = getDb();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
    if (data.ddlContent !== undefined) { sets.push('ddl_content = ?'); values.push(data.ddlContent); }
    if (data.schemaSnapshot !== undefined) { sets.push('schema_snapshot = ?'); values.push(JSON.stringify(data.schemaSnapshot)); }
    if (data.isLocked !== undefined) { sets.push('is_locked = ?'); values.push(data.isLocked ? 1 : 0); }

    if (sets.length > 0) {
      values.push(id);
      db.prepare(`UPDATE diagram_versions SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }

    const row = db.prepare('SELECT * FROM diagram_versions WHERE id = ?').get(id) as DiagramVersionRow;
    return toVersion(row);
  },

  deleteById(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM diagram_versions WHERE id = ?').run(id);
  },

  getById(id: string): IDiagramVersion | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM diagram_versions WHERE id = ?').get(id) as DiagramVersionRow | undefined;
    return row ? toVersion(row) : null;
  },

  reorder(diagramId: string, orderedIds: string[]): void {
    const db = getDb();
    const stmt = db.prepare('UPDATE diagram_versions SET sort_order = ? WHERE id = ? AND diagram_id = ?');
    const tx = db.transaction(() => {
      for (let i = 0; i < orderedIds.length; i++) {
        stmt.run(i + 1, orderedIds[i], diagramId);
      }
    });
    tx();
  },
};
