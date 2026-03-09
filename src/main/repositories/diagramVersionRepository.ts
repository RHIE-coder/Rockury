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

  uniquifyName(diagramId: string, baseName: string): string {
    const db = getDb();
    const rows = db.prepare(
      'SELECT name FROM diagram_versions WHERE diagram_id = ?',
    ).all(diagramId) as { name: string }[];
    const names = new Set(rows.map((r) => r.name.toLowerCase()));
    if (!names.has(baseName.toLowerCase())) return baseName;
    let i = 1;
    while (names.has(`${baseName} (${i})`.toLowerCase())) i++;
    return `${baseName} (${i})`;
  },

  create(data: {
    diagramId: string;
    name: string;
    ddlContent: string;
    schemaSnapshot: unknown;
  }): IDiagramVersion {
    const db = getDb();
    const id = crypto.randomUUID();

    const tx = db.transaction(() => {
      // Determine next version number
      const latest = db.prepare(
        'SELECT MAX(version_number) as max_ver FROM diagram_versions WHERE diagram_id = ?',
      ).get(data.diagramId) as { max_ver: number | null };
      const versionNumber = (latest.max_ver ?? 0) + 1;

      // Shift existing versions down, insert at top (sort_order = 1)
      db.prepare(
        'UPDATE diagram_versions SET sort_order = sort_order + 1 WHERE diagram_id = ?',
      ).run(data.diagramId);

      db.prepare(
        `INSERT INTO diagram_versions (id, diagram_id, version_number, name, ddl_content, schema_snapshot, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
      ).run(id, data.diagramId, versionNumber, data.name, data.ddlContent, JSON.stringify(data.schemaSnapshot));
    });
    tx();

    const row = db.prepare('SELECT * FROM diagram_versions WHERE id = ?').get(id) as DiagramVersionRow;
    return toVersion(row);
  },

  update(id: string, data: { name?: string; ddlContent?: string; schemaSnapshot?: unknown; isLocked?: boolean }): IDiagramVersion {
    const db = getDb();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      // Validate name uniqueness within the version's diagram
      const version = db.prepare('SELECT diagram_id FROM diagram_versions WHERE id = ?').get(id) as { diagram_id: string } | undefined;
      if (version) {
        const existing = db.prepare(
          'SELECT id FROM diagram_versions WHERE diagram_id = ? AND LOWER(name) = LOWER(?) AND id != ?',
        ).get(version.diagram_id, data.name, id) as { id: string } | undefined;
        if (existing) {
          throw new Error(`A version named "${data.name}" already exists in this diagram.`);
        }
      }
      sets.push('name = ?'); values.push(data.name);
    }
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

  moveToDiagram(versionId: string, targetDiagramId: string): IDiagramVersion {
    const db = getDb();
    let result!: IDiagramVersion;

    const tx = db.transaction(() => {
      const row = db.prepare('SELECT * FROM diagram_versions WHERE id = ?').get(versionId) as DiagramVersionRow | undefined;
      if (!row) throw new Error(`Version not found: ${versionId}`);

      const uniqueName = diagramVersionRepository.uniquifyName(targetDiagramId, row.name);

      const nextVer = db.prepare(
        'SELECT MAX(version_number) as max_ver FROM diagram_versions WHERE diagram_id = ?',
      ).get(targetDiagramId) as { max_ver: number | null };
      const versionNumber = (nextVer.max_ver ?? 0) + 1;

      // Shift target versions down to make room at top
      db.prepare(
        'UPDATE diagram_versions SET sort_order = sort_order + 1 WHERE diagram_id = ?',
      ).run(targetDiagramId);

      // Move the version
      db.prepare(
        'UPDATE diagram_versions SET diagram_id = ?, version_number = ?, sort_order = 1, name = ? WHERE id = ?',
      ).run(targetDiagramId, versionNumber, uniqueName, versionId);

      const updated = db.prepare('SELECT * FROM diagram_versions WHERE id = ?').get(versionId) as DiagramVersionRow;
      result = toVersion(updated);
    });
    tx();

    return result;
  },

  copyToDiagram(versionId: string, targetDiagramId: string): IDiagramVersion {
    const db = getDb();
    const newId = crypto.randomUUID();
    let result!: IDiagramVersion;

    const tx = db.transaction(() => {
      const row = db.prepare('SELECT * FROM diagram_versions WHERE id = ?').get(versionId) as DiagramVersionRow | undefined;
      if (!row) throw new Error(`Version not found: ${versionId}`);

      const uniqueName = diagramVersionRepository.uniquifyName(targetDiagramId, row.name);

      const nextVer = db.prepare(
        'SELECT MAX(version_number) as max_ver FROM diagram_versions WHERE diagram_id = ?',
      ).get(targetDiagramId) as { max_ver: number | null };
      const versionNumber = (nextVer.max_ver ?? 0) + 1;

      // Shift target versions down
      db.prepare(
        'UPDATE diagram_versions SET sort_order = sort_order + 1 WHERE diagram_id = ?',
      ).run(targetDiagramId);

      // Insert copy at top
      db.prepare(
        `INSERT INTO diagram_versions (id, diagram_id, version_number, name, ddl_content, schema_snapshot, sort_order, is_locked)
         VALUES (?, ?, ?, ?, ?, ?, 1, 0)`,
      ).run(newId, targetDiagramId, versionNumber, uniqueName, row.ddl_content, row.schema_snapshot);

      const inserted = db.prepare('SELECT * FROM diagram_versions WHERE id = ?').get(newId) as DiagramVersionRow;
      result = toVersion(inserted);
    });
    tx();

    return result;
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
