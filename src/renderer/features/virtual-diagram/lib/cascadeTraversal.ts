import type { ITable } from '~/shared/types/db';

export type TCascadeAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
export type TSimulationType = 'DELETE' | 'UPDATE';

export interface ICascadeNode {
  tableId: string;
  tableName: string;
  depth: number;
  action: TCascadeAction;
  fkColumnName: string;
  parentTableId: string;
  propagates: boolean;
}

export interface IResolveStep {
  order: number;
  tableName: string;
  tableId: string;
  fkColumnName: string;
  referencedTableName: string;
  referencedTableId: string;
  canSetNull: boolean;
  depth: number;
}

export interface ICascadeResult {
  sourceTableId: string;
  sourceTableName: string;
  sourceColumnName: string | null;
  simulationType: TSimulationType;
  affectedNodes: ICascadeNode[];
  blockedNodes: ICascadeNode[];
  isBlocked: boolean;
  affectedTableIds: Set<string>;
  blockedTableIds: Set<string>;
  affectedEdgeIds: Set<string>;
  resolveSteps: IResolveStep[];
}

interface FkEntry {
  sourceTableId: string;
  sourceTableName: string;
  columnId: string;
  columnName: string;
  targetColumnName: string;
  onDelete: TCascadeAction;
  onUpdate: TCascadeAction;
}

/**
 * Find column names in `tableId` that are referenced by FK columns in other tables.
 * Used to populate the UPDATE simulation column picker.
 */
export function getReferencedColumns(tables: ITable[], tableId: string): string[] {
  const table = tables.find((t) => t.id === tableId);
  if (!table) return [];

  const referenced = new Set<string>();
  for (const t of tables) {
    for (const col of t.columns) {
      if (col.reference && col.reference.table === table.name) {
        referenced.add(col.reference.column);
      }
    }
  }
  return [...referenced];
}

/**
 * BFS-based cascade chain traversal.
 *
 * For DELETE: all FKs referencing the source table are checked (row is deleted).
 * For UPDATE with sourceColumnName: only FKs referencing that specific column
 * are checked at each BFS level (column-aware propagation).
 */
export function simulateCascade(
  tables: ITable[],
  sourceTableId: string,
  type: TSimulationType,
  sourceColumnName?: string | null,
): ICascadeResult {
  const tableById = new Map(tables.map((t) => [t.id, t]));
  const tableByName = new Map(tables.map((t) => [t.name, t]));
  const sourceTable = tableById.get(sourceTableId);

  if (!sourceTable) {
    return {
      sourceTableId,
      sourceTableName: '',
      sourceColumnName: sourceColumnName ?? null,
      simulationType: type,
      affectedNodes: [],
      blockedNodes: [],
      isBlocked: false,
      affectedTableIds: new Set(),
      blockedTableIds: new Set(),
      affectedEdgeIds: new Set(),
      resolveSteps: [],
    };
  }

  // Build reverse FK map: targetTableName -> FkEntry[]
  const reverseFkMap = new Map<string, FkEntry[]>();
  for (const table of tables) {
    for (const column of table.columns) {
      if (column.reference) {
        const targetName = column.reference.table;
        const entries = reverseFkMap.get(targetName) ?? [];
        entries.push({
          sourceTableId: table.id,
          sourceTableName: table.name,
          columnId: column.id,
          columnName: column.name,
          targetColumnName: column.reference.column,
          onDelete: column.reference.onDelete ?? 'NO ACTION',
          onUpdate: column.reference.onUpdate ?? 'NO ACTION',
        });
        reverseFkMap.set(targetName, entries);
      }
    }
  }

  const affectedNodes: ICascadeNode[] = [];
  const blockedNodes: ICascadeNode[] = [];
  const visited = new Set<string>([sourceTableId]);

  // BFS queue: [tableId, depth, changedColumnName]
  // changedColumnName: for UPDATE, the column that was modified in this table.
  // At level 0 it's sourceColumnName; at deeper levels it's the FK column that cascaded.
  const columnFilter = type === 'UPDATE' && sourceColumnName ? sourceColumnName : undefined;
  const queue: [string, number, string | undefined][] = [[sourceTableId, 0, columnFilter]];

  while (queue.length > 0) {
    const [currentId, depth, changedColumn] = queue.shift()!;
    const currentTable = tableById.get(currentId);
    if (!currentTable) continue;

    const allFkEntries = reverseFkMap.get(currentTable.name) ?? [];

    // For UPDATE with column filtering: only FKs referencing the changed column
    const fkEntries = changedColumn
      ? allFkEntries.filter((fk) => fk.targetColumnName === changedColumn)
      : allFkEntries;

    for (const fk of fkEntries) {
      if (visited.has(fk.sourceTableId)) continue;

      const action = type === 'DELETE' ? fk.onDelete : fk.onUpdate;
      const propagates = action === 'CASCADE';
      const isBlocking = action === 'RESTRICT' || action === 'NO ACTION';

      const node: ICascadeNode = {
        tableId: fk.sourceTableId,
        tableName: fk.sourceTableName,
        depth: depth + 1,
        action,
        fkColumnName: fk.columnName,
        parentTableId: currentId,
        propagates,
      };

      if (isBlocking) {
        blockedNodes.push(node);
      } else {
        affectedNodes.push(node);
      }

      visited.add(fk.sourceTableId);

      // Only continue BFS for CASCADE (chain continues)
      // For UPDATE: next level filters by the FK column that just cascaded
      // For DELETE: no column filter (entire row is gone, all FKs affected)
      if (propagates) {
        const nextColumn = type === 'UPDATE' ? fk.columnName : undefined;
        queue.push([fk.sourceTableId, depth + 1, nextColumn]);
      }
    }
  }

  // Build convenience sets
  const affectedTableIds = new Set(affectedNodes.map((n) => n.tableId));
  const blockedTableIds = new Set(blockedNodes.map((n) => n.tableId));

  // Build affected edge IDs using the edge format: ${sourceTableId}-${columnId}-${targetTableId}
  const affectedEdgeIds = new Set<string>();
  for (const node of [...affectedNodes, ...blockedNodes]) {
    const refTable = tableById.get(node.tableId);
    if (!refTable) continue;
    for (const col of refTable.columns) {
      if (col.name === node.fkColumnName && col.reference) {
        const targetTable = tableByName.get(col.reference.table);
        if (targetTable) {
          affectedEdgeIds.add(`${node.tableId}-${col.id}-${targetTable.id}`);
        }
      }
    }
  }

  // Compute resolve steps: blocked nodes sorted by depth descending (deepest first)
  const resolveSteps: IResolveStep[] = [...blockedNodes]
    .sort((a, b) => b.depth - a.depth)
    .map((node, idx) => {
      const refTable = tableById.get(node.tableId);
      const fkCol = refTable?.columns.find((c) => c.name === node.fkColumnName);
      const parentTable = tableById.get(node.parentTableId);
      return {
        order: idx + 1,
        tableName: node.tableName,
        tableId: node.tableId,
        fkColumnName: node.fkColumnName,
        referencedTableName: parentTable?.name ?? '',
        referencedTableId: node.parentTableId,
        canSetNull: fkCol?.nullable ?? false,
        depth: node.depth,
      };
    });

  return {
    sourceTableId,
    sourceTableName: sourceTable.name,
    sourceColumnName: sourceColumnName ?? null,
    simulationType: type,
    affectedNodes,
    blockedNodes,
    isBlocked: blockedNodes.length > 0,
    affectedTableIds,
    blockedTableIds,
    affectedEdgeIds,
    resolveSteps,
  };
}
