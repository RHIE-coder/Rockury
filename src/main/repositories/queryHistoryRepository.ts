import { getDb } from '#/infrastructure';
import type { IQueryHistory, TQueryStatus } from '~/shared/types/db';

interface QueryHistoryRow {
  id: string;
  query_id: string | null;
  sql_content: string;
  execution_time_ms: number;
  row_count: number;
  status: string;
  error_message: string | null;
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
};
