import { queryRepository, queryHistoryRepository } from '#/repositories';
import { connectionService } from './connectionService';
import { createMysqlConnection, closeMysqlConnection } from '#/infrastructure';
import { createPgConnection, closePgConnection } from '#/infrastructure';
import type { IQuery, IQueryResult, IQueryHistory } from '~/shared/types/db';

export const queryService = {
  async executeQuery(connectionId: string, sql: string): Promise<IQueryResult> {
    const config = connectionService.getConnectionConfig(connectionId);
    const start = Date.now();

    try {
      let result: IQueryResult;

      if (config.dbType === 'mysql' || config.dbType === 'mariadb') {
        result = await executeMysqlQuery(config, sql);
      } else if (config.dbType === 'postgresql') {
        result = await executePgQuery(config, sql);
      } else {
        throw new Error(`Unsupported database type: ${config.dbType}`);
      }

      result.executionTimeMs = Date.now() - start;

      // Save to history
      queryHistoryRepository.create({
        sqlContent: sql,
        executionTimeMs: result.executionTimeMs,
        rowCount: result.rowCount,
        status: 'success',
      });

      return result;
    } catch (error) {
      const executionTimeMs = Date.now() - start;

      queryHistoryRepository.create({
        sqlContent: sql,
        executionTimeMs,
        rowCount: 0,
        status: 'error',
        errorMessage: (error as Error).message,
      });

      throw error;
    }
  },

  listQueries(): IQuery[] {
    return queryRepository.list();
  },

  saveQuery(data: {
    name: string;
    description: string;
    sqlContent: string;
    tags: string[];
  }): IQuery {
    return queryRepository.create(data);
  },

  updateQuery(
    id: string,
    data: Partial<{ name: string; description: string; sqlContent: string; tags: string[] }>,
  ): IQuery {
    return queryRepository.update(id, data);
  },

  deleteQuery(id: string): void {
    queryRepository.deleteById(id);
  },

  listHistory(limit?: number): IQueryHistory[] {
    return queryHistoryRepository.list(limit);
  },
};

async function executeMysqlQuery(
  config: { host: string; port: number; database: string; username: string; password: string; sslEnabled: boolean; sslConfig?: Record<string, unknown> },
  sql: string,
): Promise<IQueryResult> {
  const conn = await createMysqlConnection({
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
    password: config.password,
    sslEnabled: config.sslEnabled,
    sslConfig: config.sslConfig,
  });

  try {
    const [results, fields] = await conn.query(sql);

    // Handle SELECT vs non-SELECT
    if (Array.isArray(results)) {
      const rows = results as Record<string, unknown>[];
      const columns = fields
        ? (fields as Array<{ name: string }>).map(f => f.name)
        : (rows.length > 0 ? Object.keys(rows[0]) : []);

      return {
        columns,
        rows,
        rowCount: rows.length,
        executionTimeMs: 0,
      };
    }

    // Non-SELECT (INSERT, UPDATE, DELETE)
    const info = results as { affectedRows?: number };
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 0,
      affectedRows: info.affectedRows,
    };
  } finally {
    await closeMysqlConnection(conn);
  }
}

async function executePgQuery(
  config: { host: string; port: number; database: string; username: string; password: string; sslEnabled: boolean; sslConfig?: Record<string, unknown> },
  sql: string,
): Promise<IQueryResult> {
  const client = await createPgConnection({
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
    password: config.password,
    sslEnabled: config.sslEnabled,
    sslConfig: config.sslConfig,
  });

  try {
    const result = await client.query(sql);

    const columns = result.fields ? result.fields.map(f => f.name) : [];
    const rows = result.rows ?? [];

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs: 0,
      affectedRows: result.rowCount ?? undefined,
    };
  } finally {
    await closePgConnection(client);
  }
}
