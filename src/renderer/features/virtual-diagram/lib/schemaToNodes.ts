import type { ITable } from '@/entities/table';
import type { Node, Edge } from '@xyflow/react';

const TABLE_WIDTH = 250;
const TABLE_HEIGHT_BASE = 60;
const COLUMN_ROW_HEIGHT = 24;
const GRID_GAP_X = 320;
const GRID_GAP_Y = 40;
const COLUMNS_PER_ROW = 4;

export interface TableNodeData {
  table: ITable;
  label: string;
}

/**
 * Convert ITable[] to React Flow nodes and edges.
 * Tables are arranged in a grid. FK references become edges.
 */
export function schemaToNodes(
  tables: ITable[],
  positions?: Record<string, { x: number; y: number }>,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = tables.map((table, index) => {
    const col = index % COLUMNS_PER_ROW;
    const row = Math.floor(index / COLUMNS_PER_ROW);
    const defaultPosition = {
      x: col * GRID_GAP_X,
      y: row * (TABLE_HEIGHT_BASE + table.columns.length * COLUMN_ROW_HEIGHT + GRID_GAP_Y),
    };
    const position = positions?.[table.id] ?? defaultPosition;

    return {
      id: table.id,
      type: 'tableNode',
      position,
      data: {
        table,
        label: table.name,
      } satisfies TableNodeData,
      style: { width: TABLE_WIDTH },
    };
  });

  const edges: Edge[] = [];
  const tableNameToId = new Map(tables.map((t) => [t.name, t.id]));

  for (const table of tables) {
    for (const column of table.columns) {
      if (column.reference) {
        const targetTableId = tableNameToId.get(column.reference.table);
        if (targetTableId) {
          edges.push({
            id: `${table.id}-${column.id}-${targetTableId}`,
            source: table.id,
            target: targetTableId,
            sourceHandle: column.id,
            label: `${column.name} -> ${column.reference.column}`,
            type: 'smoothstep',
            animated: true,
          });
        }
      }
    }
  }

  return { nodes, edges };
}
