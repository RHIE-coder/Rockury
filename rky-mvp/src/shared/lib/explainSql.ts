import type { TDbType } from '~/shared/types/db';

export type TQueryType = 'SELECT' | 'DML' | 'DDL';

export function classifyQueryType(sql: string): TQueryType {
  const stripped = sql.replace(/^\s*(--[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/g, '').trim();
  const upper = stripped.toUpperCase();

  if (/^(CREATE|ALTER|DROP|TRUNCATE|RENAME|GRANT|REVOKE|COMMENT\s+ON)\s/.test(upper)) return 'DDL';
  if (/^(INSERT|UPDATE|DELETE)\s/.test(upper)) return 'DML';
  return 'SELECT';
}

export function buildExplainSql(dbType: TDbType, sql: string): string {
  switch (dbType) {
    case 'postgresql': return `EXPLAIN (FORMAT JSON) ${sql}`;
    case 'mysql':
    case 'mariadb': return `EXPLAIN FORMAT=JSON ${sql}`;
    case 'sqlite': return `EXPLAIN QUERY PLAN ${sql}`;
    default: return `EXPLAIN ${sql}`;
  }
}

export function buildExplainAnalyzeSql(dbType: TDbType, sql: string, queryType: TQueryType): string {
  if (dbType === 'sqlite') return `EXPLAIN QUERY PLAN ${sql}`;
  if (queryType === 'DDL') return buildExplainSql(dbType, sql);

  switch (dbType) {
    case 'postgresql': return `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`;
    case 'mysql': return `EXPLAIN ANALYZE ${sql}`;
    case 'mariadb': return `ANALYZE FORMAT=JSON ${sql}`;
    default: return `EXPLAIN ANALYZE ${sql}`;
  }
}

export function parseExplainSummary(rows: Record<string, unknown>[], dbType: TDbType): string {
  if (!rows || rows.length === 0) return '';

  try {
    if (dbType === 'sqlite') {
      return rows.map((r) => String(r.detail ?? '')).filter(Boolean).join(' → ');
    }

    if (dbType === 'postgresql') {
      const raw = rows[0]?.['QUERY PLAN'];
      const plans = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : null);
      if (!plans?.[0]?.Plan) return JSON.stringify(rows[0]).slice(0, 120);

      const plan = plans[0].Plan;
      const parts: string[] = [];
      parts.push(plan['Node Type'] ?? '');
      if (plan['Relation Name']) parts.push(`on ${plan['Relation Name']}`);
      if (typeof plan['Actual Rows'] === 'number') parts.push(`${plan['Actual Rows']} rows`);
      if (typeof plan['Actual Total Time'] === 'number') parts.push(`${plan['Actual Total Time']}ms`);
      if (typeof plan['Rows Removed by Filter'] === 'number') parts.push(`Rows Removed: ${plan['Rows Removed by Filter']}`);
      return parts.filter(Boolean).join(' · ');
    }

    // MySQL / MariaDB
    const firstRow = rows[0];
    const jsonStr = Object.values(firstRow)[0];
    if (typeof jsonStr === 'string') {
      try {
        const parsed = JSON.parse(jsonStr);
        const table = parsed?.query_block?.table;
        if (table) {
          const parts: string[] = [];
          if (table.access_type) parts.push(table.access_type);
          if (table.table_name) parts.push(`on ${table.table_name}`);
          if (typeof table.rows_examined_per_scan === 'number') parts.push(`${table.rows_examined_per_scan} rows examined`);
          return parts.filter(Boolean).join(' · ');
        }
        return JSON.stringify(parsed).slice(0, 120);
      } catch { return String(jsonStr).slice(0, 120); }
    }
    return JSON.stringify(firstRow).slice(0, 120);
  } catch { return ''; }
}
