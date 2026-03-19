import { getDb } from '#/infrastructure';
import type { IQueryHistory, TQueryStatus, THistorySource, TDmlType } from '~/shared/types/db';

interface QueryHistoryRow {
  id: string;
  query_id: string | null;
  sql_content: string;
  execution_time_ms: number;
  row_count: number;
  status: string;
  error_message: string | null;
  connection_id: string | null;
  source: string | null;
  affected_tables: string | null;
  affected_rows: number | null;
  dml_type: string | null;
  executed_at: string;
}

function toQueryHistory(row: QueryHistoryRow): IQueryHistory {
  return {
    id: row.id,
    queryId: row.query_id,
    sqlContent: row.sql_content,
    executionTimeMs: row.execution_time_ms,
    rowCount: row.row_count,
    status: row.status as TQueryStatus,
    errorMessage: row.error_message,
    connectionId: row.connection_id ?? undefined,
    source: (row.source as THistorySource) ?? undefined,
    affectedTables: row.affected_tables ? JSON.parse(row.affected_tables) as string[] : undefined,
    affectedRows: row.affected_rows ?? undefined,
    dmlType: (row.dml_type as TDmlType) ?? undefined,
    executedAt: row.executed_at,
  };
}

export const queryHistoryRepository = {
  list(limit = 100): IQueryHistory[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM query_history ORDER BY executed_at DESC LIMIT ?',
    ).all(limit) as QueryHistoryRow[];
    return rows.map(toQueryHistory);
  },

  create(data: {
    queryId?: string;
    sqlContent: string;
    executionTimeMs: number;
    rowCount: number;
    status: TQueryStatus;
    errorMessage?: string;
  }): IQueryHistory {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO query_history (id, query_id, sql_content, execution_time_ms, row_count, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      data.queryId ?? null,
      data.sqlContent,
      data.executionTimeMs,
      data.rowCount,
      data.status,
      data.errorMessage ?? null,
    );

    const row = db.prepare('SELECT * FROM query_history WHERE id = ?').get(id) as QueryHistoryRow;
    return toQueryHistory(row);
  },

  listFiltered(filter: {
    connectionId?: string;
    source?: string;
    search?: string;
    page: number;
    pageSize: number;
  }): { items: IQueryHistory[]; total: number } {
    const db = getDb();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.connectionId) { conditions.push('connection_id = ?'); params.push(filter.connectionId); }
    if (filter.source) { conditions.push('source = ?'); params.push(filter.source); }
    if (filter.search) { conditions.push('sql_content LIKE ?'); params.push(`%${filter.search}%`); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = (db.prepare(`SELECT COUNT(*) as cnt FROM query_history ${where}`).get(...params) as { cnt: number }).cnt;
    const rows = db.prepare(
      `SELECT * FROM query_history ${where} ORDER BY executed_at DESC LIMIT ? OFFSET ?`,
    ).all(...params, filter.pageSize, filter.page * filter.pageSize) as QueryHistoryRow[];

    return { items: rows.map(toQueryHistory), total };
  },

  deleteById(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM query_history WHERE id = ?').run(id);
  },
};
