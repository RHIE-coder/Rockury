import { getDb } from '#/infrastructure';
import type { IViewSnapshot, IDiagramFilter, IDiagramLayout } from '~/shared/types/db';

interface ViewSnapshotRow {
  id: string;
  diagram_id: string;
  name: string;
  filter_json: string;
  layout_json: string;
  created_at: string;
}

function toViewSnapshot(row: ViewSnapshotRow): IViewSnapshot {
  return {
    id: row.id,
    diagramId: row.diagram_id,
    name: row.name,
    filter: JSON.parse(row.filter_json) as IDiagramFilter,
    layout: JSON.parse(row.layout_json) as IDiagramLayout,
    createdAt: row.created_at,
  };
}

export const viewSnapshotRepository = {
  list(diagramId: string): IViewSnapshot[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM view_snapshots WHERE diagram_id = ? ORDER BY created_at DESC',
    ).all(diagramId) as ViewSnapshotRow[];
    return rows.map(toViewSnapshot);
  },

  getById(id: string): IViewSnapshot | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM view_snapshots WHERE id = ?').get(id) as ViewSnapshotRow | undefined;
    return row ? toViewSnapshot(row) : null;
  },

  create(data: {
    diagramId: string;
    name: string;
    filter: IDiagramFilter;
    layout: IDiagramLayout;
  }): IViewSnapshot {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO view_snapshots (id, diagram_id, name, filter_json, layout_json)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      id,
      data.diagramId,
      data.name,
      JSON.stringify(data.filter),
      JSON.stringify(data.layout),
    );
    return this.getById(id)!;
  },

  deleteById(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM view_snapshots WHERE id = ?').run(id);
  },
};
