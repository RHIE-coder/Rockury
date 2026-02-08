import { getDb } from '#/infrastructure';
import type { IDiagramVersion } from '~/shared/types/db';

interface DiagramVersionRow {
  id: string;
  diagram_id: string;
  version_number: number;
  ddl_content: string;
  schema_snapshot: string;
  created_at: string;
}

function toVersion(row: DiagramVersionRow): IDiagramVersion {
  return {
    id: row.id,
    diagramId: row.diagram_id,
    versionNumber: row.version_number,
    ddlContent: row.ddl_content,
    schemaSnapshot: JSON.parse(row.schema_snapshot),
    createdAt: row.created_at,
  };
}

export const diagramVersionRepository = {
  list(diagramId: string): IDiagramVersion[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM diagram_versions WHERE diagram_id = ? ORDER BY version_number DESC',
    ).all(diagramId) as DiagramVersionRow[];
    return rows.map(toVersion);
  },

  create(data: {
    diagramId: string;
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

    db.prepare(
      `INSERT INTO diagram_versions (id, diagram_id, version_number, ddl_content, schema_snapshot)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(id, data.diagramId, versionNumber, data.ddlContent, JSON.stringify(data.schemaSnapshot));

    const row = db.prepare('SELECT * FROM diagram_versions WHERE id = ?').get(id) as DiagramVersionRow;
    return toVersion(row);
  },

  getById(id: string): IDiagramVersion | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM diagram_versions WHERE id = ?').get(id) as DiagramVersionRow | undefined;
    return row ? toVersion(row) : null;
  },
};
