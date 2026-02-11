import type { ITable, IDiagramFilter } from '~/shared/types/db';
import type { Node, Edge } from '@xyflow/react';
import type { TableNodeData } from '../ui/TableNode';

const TABLE_WIDTH = 250;
const TABLE_HEIGHT_BASE = 40;
const COLUMN_ROW_HEIGHT = 22;
const CONSTRAINT_ROW_HEIGHT = 18;
const GRID_GAP_X = 320;
const GRID_GAP_Y = 40;
const COLUMNS_PER_ROW = 4;

function estimateNodeHeight(table: ITable, filter: IDiagramFilter): number {
  let height = TABLE_HEIGHT_BASE;
  if (filter.showColumns) {
    height += table.columns.length * COLUMN_ROW_HEIGHT;
  }
  if (filter.showConstraints && table.constraints.length > 0) {
    height += table.constraints.length * CONSTRAINT_ROW_HEIGHT + 8;
  }
  return height;
}

interface SchemaToNodesOptions {
  positions?: Record<string, { x: number; y: number }>;
  filter?: IDiagramFilter;
  highlightedTableIds?: string[];
  selectedTableId?: string | null;
  onTableUpdate?: (table: ITable) => void;
  hiddenTableIds?: string[];
  tableColors?: Record<string, string>;
  lockedNodeIds?: string[];
  onNodeLockToggle?: (id: string) => void;
}

/**
 * Convert ITable[] to React Flow nodes and edges.
 * Tables are arranged in a grid if no positions provided.
 * FK references become edges.
 */
export function schemaToNodes(
  tables: ITable[],
  options: SchemaToNodesOptions = {},
): { nodes: Node[]; edges: Edge[] } {
  const {
    positions,
    filter = {
      showColumns: true,
      showDataTypes: true,
      showKeyIcons: true,
      showNullable: true,
      showComments: false,
      showConstraints: false,
      preset: 'full',
    },
    highlightedTableIds = [],
    selectedTableId = null,
    onTableUpdate,
    hiddenTableIds = [],
    tableColors = {},
    lockedNodeIds = [],
    onNodeLockToggle,
  } = options;

  const highlightedSet = new Set(highlightedTableIds);
  const hiddenSet = new Set(hiddenTableIds);
  const lockedSet = new Set(lockedNodeIds);

  // Filter out hidden tables
  const visibleTables = tables.filter((t) => !hiddenSet.has(t.id));

  const nodes: Node[] = visibleTables.map((table, index) => {
    const col = index % COLUMNS_PER_ROW;
    const row = Math.floor(index / COLUMNS_PER_ROW);
    const nodeHeight = estimateNodeHeight(table, filter);
    const defaultPosition = {
      x: col * GRID_GAP_X,
      y: row * (nodeHeight + GRID_GAP_Y),
    };
    const position = positions?.[table.id] ?? defaultPosition;

    const isLocked = lockedSet.has(table.id);

    return {
      id: table.id,
      type: 'tableNode',
      position,
      draggable: !isLocked,
      data: {
        table,
        label: table.name,
        filter,
        isHighlighted: highlightedSet.has(table.id),
        isSelected: table.id === selectedTableId,
        onTableUpdate,
        color: tableColors[table.id],
        isLocked,
        onLockToggle: onNodeLockToggle,
      } satisfies TableNodeData,
      style: { width: TABLE_WIDTH },
      width: TABLE_WIDTH,
      height: nodeHeight,
    };
  });

  const edges: Edge[] = [];
  const tableNameToId = new Map(visibleTables.map((t) => [t.name, t.id]));

  for (const table of visibleTables) {
    for (const column of table.columns) {
      if (column.reference) {
        const targetTableId = tableNameToId.get(column.reference.table);
        if (targetTableId) {
          edges.push({
            id: `${table.id}-${column.id}-${targetTableId}`,
            source: table.id,
            target: targetTableId,
            sourceHandle: column.id,
            label: `${column.name} → ${column.reference.column}`,
            type: 'relationEdge',
            animated: true,
            data: {
              nullable: column.nullable,
              onDelete: column.reference.onDelete,
              onUpdate: column.reference.onUpdate,
            },
          });
        }
      }
    }
  }

  return { nodes, edges };
}
