import type { ITable, IColumn } from '~/shared/types/db';

export type TDiffAction = 'added' | 'removed' | 'modified' | 'unchanged';

export interface ICompareResult {
  /** Map: tableId -> diff action */
  actionMap: Map<string, TDiffAction>;
  /** Removed tables (exist in target but not current) - needed for ghost nodes */
  removedTables: ITable[];
}

/** Check whether two columns differ in any meaningful way */
function columnsEqual(a: IColumn, b: IColumn): boolean {
  if (a.dataType.toLowerCase() !== b.dataType.toLowerCase()) return false;
  if (a.nullable !== b.nullable) return false;
  if ((a.defaultValue ?? '') !== (b.defaultValue ?? '')) return false;
  const aKeys = (a.keyTypes ?? []).join(',');
  const bKeys = (b.keyTypes ?? []).join(',');
  if (aKeys !== bKeys) return false;
  return true;
}

/** Check whether a table's column set differs from another */
function tableColumnsModified(current: ITable, target: ITable): boolean {
  const targetMap = new Map(target.columns.map((c) => [c.name.toLowerCase(), c]));
  const currentMap = new Map(current.columns.map((c) => [c.name.toLowerCase(), c]));

  // Any column added?
  for (const col of current.columns) {
    if (!targetMap.has(col.name.toLowerCase())) return true;
  }
  // Any column removed?
  for (const col of target.columns) {
    if (!currentMap.has(col.name.toLowerCase())) return true;
  }
  // Any column modified?
  for (const col of current.columns) {
    const targetCol = targetMap.get(col.name.toLowerCase());
    if (targetCol && !columnsEqual(col, targetCol)) return true;
  }

  return false;
}

/**
 * Compare current diagram tables against a target (older) version's tables.
 * Match by table name (case-insensitive).
 */
export function compareVersionTables(
  currentTables: ITable[],
  targetTables: ITable[],
): ICompareResult {
  const actionMap = new Map<string, TDiffAction>();
  const removedTables: ITable[] = [];

  const targetByName = new Map(targetTables.map((t) => [t.name.toLowerCase(), t]));
  const currentByName = new Map(currentTables.map((t) => [t.name.toLowerCase(), t]));

  // Process current tables
  for (const table of currentTables) {
    const key = table.name.toLowerCase();
    const targetTable = targetByName.get(key);

    if (!targetTable) {
      actionMap.set(table.id, 'added');
    } else if (tableColumnsModified(table, targetTable)) {
      actionMap.set(table.id, 'modified');
    } else {
      actionMap.set(table.id, 'unchanged');
    }
  }

  // Find removed tables (in target but not in current)
  // Note: don't add to actionMap with target ID - it could collide with a current table's ID.
  // Ghost nodes have hardcoded compareAction: 'removed' in schemaToNodes.
  for (const table of targetTables) {
    const key = table.name.toLowerCase();
    if (!currentByName.has(key)) {
      removedTables.push(table);
    }
  }

  return { actionMap, removedTables };
}
