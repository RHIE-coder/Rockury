import type { ITable } from '~/shared/types/db';

function isSyntheticDefaultTable(table: ITable): boolean {
  if (table.name !== 'new_table') return false;
  if (!/^tbl-\d+-\d+$/.test(table.id)) return false;
  if (table.constraints.length !== 0) return false;
  if (table.columns.length !== 1) return false;

  const col = table.columns[0];
  if (!/^col-\d+-\d+-0$/.test(col.id)) return false;
  if (col.name !== 'id') return false;
  if (col.dataType.toUpperCase() !== 'BIGINT') return false;
  if (col.nullable) return false;
  if (!col.keyTypes.includes('PK')) return false;
  if (!col.isAutoIncrement) return false;
  if (col.reference !== null) return false;
  if (col.comment !== 'Primary key') return false;

  return true;
}

export function sanitizeImportedTables(tables: ITable[]): ITable[] {
  return tables.filter((table) => !isSyntheticDefaultTable(table));
}
