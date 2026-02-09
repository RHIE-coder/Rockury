import { getDb } from '#/infrastructure';
import type { IDiagram, IDiagramLayout, ITable, TDiagramType } from '~/shared/types/db';

interface DiagramRow {
  id: string;
  name: string;
  version: string;
  type: string;
  tables_json: string;
  created_at: string;
  updated_at: string;
}

interface DiagramLayoutRow {
  diagram_id: string;
  positions: string;
  zoom: number;
  viewport: string;
}

function toDiagram(row: DiagramRow): IDiagram {
  return {
    id: row.id,
    name: row.name,
    version: row.version ?? '1.0.0',
    type: row.type as TDiagramType,
    tables: JSON.parse(row.tables_json) as ITable[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toLayout(row: DiagramLayoutRow): IDiagramLayout {
  return {
    diagramId: row.diagram_id,
    positions: JSON.parse(row.positions),
    zoom: row.zoom,
    viewport: JSON.parse(row.viewport),
  };
}

export const diagramRepository = {
  list(type?: TDiagramType): IDiagram[] {
    const db = getDb();
    if (type) {
      const rows = db.prepare('SELECT * FROM diagrams WHERE type = ? ORDER BY created_at DESC').all(type) as DiagramRow[];
      return rows.map(toDiagram);
    }
    const rows = db.prepare('SELECT * FROM diagrams ORDER BY created_at DESC').all() as DiagramRow[];
    return rows.map(toDiagram);
  },

  getById(id: string): IDiagram | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM diagrams WHERE id = ?').get(id) as DiagramRow | undefined;
    return row ? toDiagram(row) : null;
  },

  create(data: { name: string; type: TDiagramType; version?: string; tables?: ITable[] }): IDiagram {
    const db = getDb();
    const id = crypto.randomUUID();
    const tablesJson = JSON.stringify(data.tables ?? []);
    const version = data.version ?? '1.0.0';
    db.prepare(
      'INSERT INTO diagrams (id, name, type, version, tables_json) VALUES (?, ?, ?, ?, ?)',
    ).run(id, data.name, data.type, version, tablesJson);
    return this.getById(id)!;
  },

  update(id: string, data: { name?: string; version?: string; tables?: ITable[] }): IDiagram {
    const db = getDb();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
    if (data.version !== undefined) { sets.push('version = ?'); values.push(data.version); }
    if (data.tables !== undefined) { sets.push('tables_json = ?'); values.push(JSON.stringify(data.tables)); }

    if (sets.length > 0) {
      sets.push(`updated_at = datetime('now')`);
      values.push(id);
      db.prepare(`UPDATE diagrams SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getById(id)!;
  },

  deleteById(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM diagrams WHERE id = ?').run(id);
  },

  getLayout(diagramId: string): IDiagramLayout | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM diagram_layouts WHERE diagram_id = ?').get(diagramId) as DiagramLayoutRow | undefined;
    return row ? toLayout(row) : null;
  },

  saveLayout(layout: IDiagramLayout): void {
    const db = getDb();
    db.prepare(
      `INSERT INTO diagram_layouts (diagram_id, positions, zoom, viewport)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(diagram_id)
       DO UPDATE SET positions = excluded.positions, zoom = excluded.zoom, viewport = excluded.viewport`,
    ).run(
      layout.diagramId,
      JSON.stringify(layout.positions),
      layout.zoom,
      JSON.stringify(layout.viewport),
    );
  },
};
