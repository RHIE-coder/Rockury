import { useState, useCallback, useMemo } from 'react';
import { buildInsertQuery, buildUpdateQuery, buildDeleteQuery } from './sqlBuilder';
import type { IColumn } from '~/shared/types/db';

type TDbType = 'mysql' | 'mariadb' | 'postgresql' | 'sqlite';
type TChangeType = 'insert' | 'update' | 'delete';

export interface IPendingChange {
  type: TChangeType;
  original: Record<string, unknown> | null;
  modified: Record<string, unknown>;
}

export function usePendingChanges(
  tableName: string,
  dbType: TDbType,
  pkColumns: string[],
  allColumns: string[],
  columnMeta?: IColumn[],
) {
  // Build column name → dataType map for type-aware SQL generation
  const columnTypes = useMemo(() => {
    if (!columnMeta) return undefined;
    const map: Record<string, string> = {};
    for (const col of columnMeta) map[col.name] = col.dataType;
    return map;
  }, [columnMeta]);
  const [changes, setChanges] = useState<Map<string, IPendingChange>>(new Map());

  const getRowKey = useCallback(
    (row: Record<string, unknown>) => {
      // Inserted rows carry a __tempKey marker — use it as the key
      if (typeof row.__tempKey === 'string') return row.__tempKey;
      return pkColumns.map((pk) => String(row[pk] ?? '')).join('::');
    },
    [pkColumns],
  );

  const updateCell = useCallback(
    (row: Record<string, unknown>, column: string, newValue: unknown) => {
      const key = getRowKey(row);
      setChanges((prev) => {
        const next = new Map(prev);
        const existing = next.get(key);
        if (existing) {
          // Create a new IPendingChange object (immutable update)
          next.set(key, {
            ...existing,
            modified: { ...existing.modified, [column]: newValue },
          });
        } else {
          next.set(key, {
            type: 'update',
            original: { ...row },
            modified: { ...row, [column]: newValue },
          });
        }
        return next;
      });
    },
    [getRowKey],
  );

  const insertRow = useCallback(
    () => {
      const tempKey = `__new_${Date.now()}`;
      const emptyRow: Record<string, unknown> = { __tempKey: tempKey };
      for (const col of allColumns) emptyRow[col] = null;
      setChanges((prev) => {
        const next = new Map(prev);
        next.set(tempKey, { type: 'insert', original: null, modified: emptyRow });
        return next;
      });
      return tempKey;
    },
    [allColumns],
  );

  const deleteRow = useCallback(
    (row: Record<string, unknown>) => {
      const key = getRowKey(row);
      setChanges((prev) => {
        const next = new Map(prev);
        const existing = next.get(key);
        if (existing?.type === 'insert') {
          next.delete(key);
        } else {
          next.set(key, { type: 'delete', original: { ...row }, modified: { ...row } });
        }
        return next;
      });
    },
    [getRowKey],
  );

  const discard = useCallback(() => setChanges(new Map()), []);

  const generateSql = useCallback((): string[] => {
    const statements: string[] = [];
    for (const [, change] of changes) {
      if (change.type === 'insert') {
        // Strip internal __tempKey before generating SQL
        const { __tempKey: _, ...values } = change.modified;
        statements.push(
          buildInsertQuery({ table: tableName, dbType, columns: allColumns, values, columnTypes }),
        );
      } else if (change.type === 'update' && change.original) {
        const changedCols: Record<string, unknown> = {};
        for (const col of allColumns) {
          if (change.modified[col] !== change.original[col]) {
            changedCols[col] = change.modified[col];
          }
        }
        if (Object.keys(changedCols).length > 0) {
          const pkValues: Record<string, unknown> = {};
          for (const pk of pkColumns) pkValues[pk] = change.original[pk];
          statements.push(
            buildUpdateQuery({ table: tableName, dbType, pkColumns, pkValues, changes: changedCols, columnTypes }),
          );
        }
      } else if (change.type === 'delete' && change.original) {
        const pkValues: Record<string, unknown> = {};
        for (const pk of pkColumns) pkValues[pk] = change.original[pk];
        statements.push(
          buildDeleteQuery({ table: tableName, dbType, pkColumns, pkValues }),
        );
      }
    }
    return statements;
  }, [changes, tableName, dbType, pkColumns, allColumns, columnTypes]);

  // Collect inserted rows as TRow[] for the grid to display
  const insertedRows = useMemo(() => {
    const rows: Record<string, unknown>[] = [];
    for (const [, change] of changes) {
      if (change.type === 'insert') {
        rows.push(change.modified);
      }
    }
    return rows;
  }, [changes]);

  return {
    changes,
    hasChanges: changes.size > 0,
    changeCount: changes.size,
    insertedRows,
    updateCell,
    insertRow,
    deleteRow,
    discard,
    generateSql,
    getRowKey,
  };
}
