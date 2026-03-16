import { quoteIdentifier, escapeValue } from '../model/sqlBuilder';

type TDbType = 'mysql' | 'mariadb' | 'postgresql' | 'sqlite';

export function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const header = columns.join(',');
  const lines = rows.map((row) =>
    columns.map((col) => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(','),
  );
  return [header, ...lines].join('\n');
}

export function toJson(rows: Record<string, unknown>[]): string {
  return JSON.stringify(rows, null, 2);
}

export function toSqlInsert(
  table: string,
  dbType: TDbType,
  columns: string[],
  rows: Record<string, unknown>[],
): string {
  const q = (name: string) => quoteIdentifier(name, dbType);
  const colList = columns.map(q).join(', ');
  return rows
    .map((row) => {
      const vals = columns.map((c) => escapeValue(row[c] ?? null)).join(', ');
      return `INSERT INTO ${q(table)} (${colList}) VALUES (${vals});`;
    })
    .join('\n');
}
