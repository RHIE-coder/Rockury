import { getDb } from '#/infrastructure';
import type { ISchemaChangelog, ISchemaChange } from '~/shared/types/db';

interface ChangelogRow {
  id: string;
  connection_id: string;
  diagram_id: string;
  changes_json: string;
  synced_at: string;
}

function toChangelog(row: ChangelogRow): ISchemaChangelog {
  return {
    id: row.id,
    connectionId: row.connection_id,
    diagramId: row.diagram_id,
    changes: JSON.parse(row.changes_json) as ISchemaChange[],
    syncedAt: row.synced_at,
  };
}

export const changelogRepository = {
  list(connectionId: string): ISchemaChangelog[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM schema_changelogs WHERE connection_id = ? ORDER BY synced_at DESC',
    ).all(connectionId) as ChangelogRow[];
    return rows.map(toChangelog);
  },

  create(data: { connectionId: string; diagramId: string; changes: ISchemaChange[] }): ISchemaChangelog {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      'INSERT INTO schema_changelogs (id, connection_id, diagram_id, changes_json) VALUES (?, ?, ?, ?)',
    ).run(id, data.connectionId, data.diagramId, JSON.stringify(data.changes));
    const row = db.prepare('SELECT * FROM schema_changelogs WHERE id = ?').get(id) as ChangelogRow;
    return toChangelog(row);
  },

  deleteById(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM schema_changelogs WHERE id = ?').run(id);
  },
};
