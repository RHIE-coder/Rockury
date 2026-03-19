type TDbType = 'mysql' | 'mariadb' | 'postgresql' | 'sqlite';

export function quoteIdentifier(name: string, dbType: TDbType): string {
  if (dbType === 'postgresql') {
    return `"${name.replace(/"/g, '""')}"`;
  }
  return `\`${name.replace(/`/g, '``')}\``;
}

const BOOL_TYPES = /^(boolean|bool|tinyint\(1\)|bit)$/i;
const NUMERIC_TYPES = /^(int|integer|bigint|smallint|tinyint|mediumint|serial|bigserial|real|float|double|decimal|numeric|money|smallmoney)/i;
const DATE_TYPES = /^(date|time|datetime|timestamp|timestamptz|timetz)/i;

export function escapeValue(value: unknown, dataType?: string): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';

  const str = String(value);
  if (str === '') return 'NULL';

  if (dataType) {
    // Boolean columns: 'true'/'false' strings → TRUE/FALSE
    if (BOOL_TYPES.test(dataType)) {
      return (str.toLowerCase() === 'true' || str === '1') ? 'TRUE' : 'FALSE';
    }
    // Numeric columns: pass through without quotes
    if (NUMERIC_TYPES.test(dataType) && !isNaN(Number(str))) {
      return str;
    }
    // Date/time columns: normalize ISO T-separator to space
    if (DATE_TYPES.test(dataType)) {
      const normalized = str.replace('T', ' ');
      return `'${normalized.replace(/'/g, "''")}'`;
    }
  }

  return `'${str.replace(/'/g, "''")}'`;
}

export interface IFilter {
  column: string;
  operator: string;
  value: string;
}

export interface ISelectParams {
  table: string;
  dbType: TDbType;
  limit: number;
  offset: number;
  orderBy?: { column: string; direction: 'ASC' | 'DESC' };
  filters?: IFilter[];
}

export function buildSelectQuery(params: ISelectParams): string {
  const { table, dbType, limit, offset, orderBy, filters } = params;
  const q = (name: string) => quoteIdentifier(name, dbType);

  let sql = `SELECT * FROM ${q(table)}`;

  if (filters && filters.length > 0) {
    const clauses = filters.map((f) => {
      if (f.operator === 'IS NULL') return `${q(f.column)} IS NULL`;
      if (f.operator === 'IS NOT NULL') return `${q(f.column)} IS NOT NULL`;
      return `${q(f.column)} ${f.operator} ${escapeValue(f.value)}`;
    });
    sql += ` WHERE ${clauses.join(' AND ')}`;
  }

  if (orderBy) {
    sql += ` ORDER BY ${q(orderBy.column)} ${orderBy.direction}`;
  }

  sql += ` LIMIT ${limit} OFFSET ${offset}`;
  return sql;
}

export interface IInsertParams {
  table: string;
  dbType: TDbType;
  columns: string[];
  values: Record<string, unknown>;
  columnTypes?: Record<string, string>;
}

export function buildInsertQuery(params: IInsertParams): string {
  const { table, dbType, columns, values, columnTypes } = params;
  const q = (name: string) => quoteIdentifier(name, dbType);
  const cols = columns.map(q).join(', ');
  const vals = columns.map((c) => escapeValue(values[c] ?? null, columnTypes?.[c])).join(', ');
  return `INSERT INTO ${q(table)} (${cols}) VALUES (${vals})`;
}

export interface IUpdateParams {
  table: string;
  dbType: TDbType;
  pkColumns: string[];
  pkValues: Record<string, unknown>;
  changes: Record<string, unknown>;
  columnTypes?: Record<string, string>;
}

export function buildUpdateQuery(params: IUpdateParams): string {
  const { table, dbType, pkColumns, pkValues, changes, columnTypes } = params;
  const q = (name: string) => quoteIdentifier(name, dbType);
  const setClauses = Object.entries(changes)
    .map(([col, val]) => `${q(col)} = ${escapeValue(val, columnTypes?.[col])}`)
    .join(', ');
  const whereClauses = pkColumns
    .map((pk) => `${q(pk)} = ${escapeValue(pkValues[pk], columnTypes?.[pk])}`)
    .join(' AND ');
  return `UPDATE ${q(table)} SET ${setClauses} WHERE ${whereClauses}`;
}

export interface IDeleteParams {
  table: string;
  dbType: TDbType;
  pkColumns: string[];
  pkValues: Record<string, unknown>;
}

export function buildDeleteQuery(params: IDeleteParams): string {
  const { table, dbType, pkColumns, pkValues } = params;
  const q = (name: string) => quoteIdentifier(name, dbType);
  const whereClauses = pkColumns
    .map((pk) => `${q(pk)} = ${escapeValue(pkValues[pk])}`)
    .join(' AND ');
  return `DELETE FROM ${q(table)} WHERE ${whereClauses}`;
}
