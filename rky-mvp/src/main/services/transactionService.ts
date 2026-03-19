import { connectionService } from './connectionService';
import { createMysqlConnection, closeMysqlConnection, createPgConnection, closePgConnection } from '#/infrastructure';
import type { IQueryResult } from '~/shared/types/db';

interface ActiveTransaction {
  connection: any; // mysql2 Connection or pg Client
  dbType: 'mysql' | 'mariadb' | 'postgresql';
  connectionId: string;
  createdAt: number;
}

const activeTxMap = new Map<string, ActiveTransaction>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export const transactionService = {
  async begin(connectionId: string): Promise<string> {
    const config = connectionService.getConnectionConfig(connectionId);
    const txId = crypto.randomUUID();
    let connection: any;

    if (config.dbType === 'mysql' || config.dbType === 'mariadb') {
      connection = await createMysqlConnection(config);
      await connection.query('BEGIN');
    } else if (config.dbType === 'postgresql') {
      connection = await createPgConnection(config);
      await connection.query('BEGIN');
    } else {
      throw new Error(`Unsupported db type for transactions: ${config.dbType}`);
    }

    activeTxMap.set(txId, { connection, dbType: config.dbType, connectionId, createdAt: Date.now() });
    return txId;
  },

  async executeInTx(txId: string, sql: string): Promise<IQueryResult> {
    const tx = activeTxMap.get(txId);
    if (!tx) throw new Error(`Transaction ${txId} not found`);

    if (tx.dbType === 'mysql' || tx.dbType === 'mariadb') {
      const [results, fields] = await tx.connection.query(sql);

      if (Array.isArray(results)) {
        const rows = results as Record<string, unknown>[];
        const columns = fields
          ? (fields as Array<{ name: string }>).map((f: any) => f.name)
          : (rows.length > 0 ? Object.keys(rows[0]) : []);
        return { columns, rows, rowCount: rows.length, executionTimeMs: 0 };
      }

      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        affectedRows: (results as any).affectedRows,
      };
    } else {
      const result = await tx.connection.query(sql);
      const columns = result.fields ? result.fields.map((f: any) => f.name) : [];
      const rows = result.rows ?? [];
      return {
        columns,
        rows,
        rowCount: rows.length,
        executionTimeMs: 0,
        affectedRows: typeof result.rowCount === 'number' ? result.rowCount : undefined,
      };
    }
  },

  async commit(txId: string): Promise<void> {
    const tx = activeTxMap.get(txId);
    if (!tx) throw new Error(`Transaction ${txId} not found`);
    try {
      await tx.connection.query('COMMIT');
    } finally {
      await this._closeConnection(tx);
      activeTxMap.delete(txId);
    }
  },

  async rollback(txId: string): Promise<void> {
    const tx = activeTxMap.get(txId);
    if (!tx) throw new Error(`Transaction ${txId} not found`);
    try {
      await tx.connection.query('ROLLBACK');
    } finally {
      await this._closeConnection(tx);
      activeTxMap.delete(txId);
    }
  },

  startCleanup(): void {
    if (cleanupTimer) return;
    cleanupTimer = setInterval(() => { this._cleanupExpired(); }, 60_000);
  },

  async cleanupAll(): Promise<void> {
    if (cleanupTimer) { clearInterval(cleanupTimer); cleanupTimer = null; }
    for (const [txId] of activeTxMap) {
      try { await this.rollback(txId); } catch { /* ignore */ }
    }
  },

  async _cleanupExpired(): Promise<void> {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    for (const [txId, tx] of activeTxMap) {
      if (now - tx.createdAt > maxAge) {
        try { await this.rollback(txId); } catch { /* ignore */ }
      }
    }
  },

  async _closeConnection(tx: ActiveTransaction): Promise<void> {
    if (tx.dbType === 'mysql' || tx.dbType === 'mariadb') {
      await closeMysqlConnection(tx.connection);
    } else {
      await closePgConnection(tx.connection);
    }
  },
};
