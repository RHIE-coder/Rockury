type TDbType = 'mysql' | 'mariadb' | 'postgresql' | 'sqlite';

export function quoteIdentifier(name: string, dbType: TDbType): string {
  if (dbType === 'postgresql') {
    return `"${name.replace(/"/g, '""')}"`;
  }
  return `\`${name.replace(/`/g, '``')}\``;
}

export function escapeValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  const str = String(value);
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
