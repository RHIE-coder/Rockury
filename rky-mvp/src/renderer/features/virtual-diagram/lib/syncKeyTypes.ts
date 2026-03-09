import type { ITable, IColumn, TKeyType, IForeignKeyRef } from '~/shared/types/db';

/**
 * Derive column keyTypes, reference, and nullable from table.constraints (single source of truth).
 * Returns a new table with synced columns.
 */
export function syncKeyTypesFromConstraints(table: ITable): ITable {
  const columns = table.columns.map((col) => {
    const keyTypes: TKeyType[] = [];
    let reference: IForeignKeyRef | null = null;
    let nullable = col.nullable;

    for (const constraint of table.constraints) {
      if (!constraint.columns.includes(col.name)) continue;
      const kt = constraint.type;
      if ((kt === 'PK' || kt === 'FK' || kt === 'UK' || kt === 'IDX') && !keyTypes.includes(kt)) {
        keyTypes.push(kt);
      }
      if (kt === 'FK' && constraint.reference) {
        reference = constraint.reference;
      }
      if (kt === 'PK') {
        nullable = false;
      }
    }

    return { ...col, keyTypes, reference, nullable };
  });

  return { ...table, columns };
}
