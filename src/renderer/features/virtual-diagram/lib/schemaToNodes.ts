import type { ITable, IDiagramFilter } from '~/shared/types/db';
import type { Node, Edge } from '@xyflow/react';
import type { TableNodeData } from '../ui/TableNode';
import type { ICascadeResult } from './cascadeTraversal';
import type { ICompareResult } from './compareVersions';
import { syncKeyTypesFromConstraints } from './syncKeyTypes';

export type TSimulationNodeRole = 'source' | 'cascade' | 'setNull' | 'blocked' | 'unaffected' | null;
export type TSimulationEdgeRole = 'active' | 'unaffected' | null;

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
  cascadeSimulation?: ICascadeResult | null;
  compareResult?: ICompareResult | null;
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
    cascadeSimulation = null,
    compareResult = null,
  } = options;

  const highlightedSet = new Set(highlightedTableIds);
  const hiddenSet = new Set(hiddenTableIds);
  const lockedSet = new Set(lockedNodeIds);

  // Build cascade action lookup: tableId -> action
  const cascadeActionMap = new Map<string, 'CASCADE' | 'SET NULL'>();
  if (cascadeSimulation) {
    for (const node of cascadeSimulation.affectedNodes) {
      if (node.action === 'CASCADE') cascadeActionMap.set(node.tableId, 'CASCADE');
      else if (node.action === 'SET NULL') cascadeActionMap.set(node.tableId, 'SET NULL');
    }
  }

  // Build cascade depth lookup for animation delay
  const cascadeDepthMap = new Map<string, number>();
  if (cascadeSimulation) {
    for (const node of [...cascadeSimulation.affectedNodes, ...cascadeSimulation.blockedNodes]) {
      cascadeDepthMap.set(node.tableId, node.depth);
    }
  }

  function getNodeSimulationRole(tableId: string): TSimulationNodeRole {
    if (!cascadeSimulation) return null;
    if (tableId === cascadeSimulation.sourceTableId) return 'source';
    if (cascadeSimulation.blockedTableIds.has(tableId)) return 'blocked';
    const action = cascadeActionMap.get(tableId);
    if (action === 'CASCADE') return 'cascade';
    if (action === 'SET NULL') return 'setNull';
    return 'unaffected';
  }

  function getEdgeSimulationRole(edgeId: string): TSimulationEdgeRole {
    if (!cascadeSimulation) return null;
    return cascadeSimulation.affectedEdgeIds.has(edgeId) ? 'active' : 'unaffected';
  }

  // Deduplicate tables by ID (defensive against snapshot/DDL corruption)
  const deduped: ITable[] = [];
  const seenTableIds = new Set<string>();
  for (const t of tables) {
    if (!seenTableIds.has(t.id)) {
      seenTableIds.add(t.id);
      deduped.push(t);
    }
  }

  // Filter out hidden tables, then sync keyTypes from constraints
  const visibleTables = deduped.filter((t) => !hiddenSet.has(t.id)).map(syncKeyTypesFromConstraints);

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

    const simulationRole = getNodeSimulationRole(table.id);
    const simulationDepth = cascadeDepthMap.get(table.id) ?? 0;

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
        simulationRole,
        simulationDepth,
        simulationType: cascadeSimulation?.simulationType ?? null,
        compareAction: compareResult?.actionMap.get(table.id) ?? undefined,
      } satisfies TableNodeData,
      style: { width: TABLE_WIDTH },
      width: TABLE_WIDTH,
      height: nodeHeight,
    };
  });

  // Append ghost nodes for removed tables (compare mode)
  // Place in a grid to the right of existing nodes
  if (compareResult?.removedTables.length) {
    const existingNodeIds = new Set(nodes.map((n) => n.id));

    // Compute bounding box of existing nodes
    let maxX = 0;
    let minY = 0;
    for (const node of nodes) {
      const right = node.position.x + TABLE_WIDTH;
      if (right > maxX) maxX = right;
      if (node.position.y < minY) minY = node.position.y;
    }
    const ghostStartX = maxX + GRID_GAP_X * 1.5;
    const GHOST_COLS = Math.min(COLUMNS_PER_ROW, Math.max(2, Math.ceil(Math.sqrt(compareResult.removedTables.length))));

    let col = 0;
    let rowY = minY;
    let rowMaxHeight = 0;

    for (const rawTable of compareResult.removedTables) {
      const table = syncKeyTypesFromConstraints(rawTable);
      const ghostId = `ghost-${table.id}`;
      if (existingNodeIds.has(ghostId)) continue;
      existingNodeIds.add(ghostId);

      const nodeHeight = estimateNodeHeight(table, filter);

      nodes.push({
        id: ghostId,
        type: 'tableNode',
        position: { x: ghostStartX + col * GRID_GAP_X, y: rowY },
        draggable: false,
        connectable: false,
        selectable: false,
        data: {
          table,
          label: table.name,
          filter,
          isHighlighted: false,
          isSelected: false,
          onTableUpdate: undefined,
          compareAction: 'removed',
        } satisfies TableNodeData,
        style: { width: TABLE_WIDTH },
        width: TABLE_WIDTH,
        height: nodeHeight,
      });

      if (nodeHeight > rowMaxHeight) rowMaxHeight = nodeHeight;
      col++;
      if (col >= GHOST_COLS) {
        col = 0;
        rowY += rowMaxHeight + GRID_GAP_Y;
        rowMaxHeight = 0;
      }
    }
  }

  const edges: Edge[] = [];
  const tableNameToId = new Map(visibleTables.map((t) => [t.name, t.id]));

  for (const table of visibleTables) {
    for (const column of table.columns) {
      if (column.reference) {
        const targetTableId = tableNameToId.get(column.reference.table);
        if (targetTableId) {
          const onDelete = column.reference.onDelete ?? 'NO ACTION';
          const onUpdate = column.reference.onUpdate ?? 'NO ACTION';

          // Edge constraint filter: skip edges whose actions are unchecked
          if (!filter.edgeOnDelete?.[onDelete] || !filter.edgeOnUpdate?.[onUpdate]) continue;

          const edgeId = `${table.id}-${column.id}-${targetTableId}`;
          const isUnique = column.keyTypes.includes('UK') || column.keyTypes.includes('PK');
          edges.push({
            id: edgeId,
            source: table.id,
            target: targetTableId,
            sourceHandle: column.id,
            label: `${column.name} → ${column.reference.column}`,
            type: 'relationEdge',
            animated: !cascadeSimulation,
            data: {
              nullable: column.nullable,
              isUnique,
              onDelete: column.reference.onDelete,
              onUpdate: column.reference.onUpdate,
              showPolicies: filter.showEdgePolicies ?? true,
              simulationRole: getEdgeSimulationRole(edgeId),
              sourceTableName: table.name,
              targetTableName: column.reference.table,
            },
          });
        }
      }
    }
  }

  return { nodes, edges };
}
