import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getConnectionConfig: vi.fn(),
  createMysqlConnection: vi.fn(),
  closeMysqlConnection: vi.fn(),
  createPgConnection: vi.fn(),
  closePgConnection: vi.fn(),
  randomUUID: vi.fn(),
}));

vi.mock('./connectionService', () => ({
  connectionService: {
    getConnectionConfig: mocks.getConnectionConfig,
  },
}));

vi.mock('#/infrastructure', () => ({
  createMysqlConnection: mocks.createMysqlConnection,
  closeMysqlConnection: mocks.closeMysqlConnection,
  createPgConnection: mocks.createPgConnection,
  closePgConnection: mocks.closePgConnection,
}));

// Mock crypto.randomUUID
vi.stubGlobal('crypto', { randomUUID: mocks.randomUUID });

import { transactionService } from './transactionService';

describe('transactionService', () => {
  const mysqlConfig = {
    dbType: 'mysql' as const,
    host: 'localhost',
    port: 3306,
    database: 'app',
    username: 'root',
    password: 'pw',
    sslEnabled: false,
  };

  const pgConfig = {
    dbType: 'postgresql' as const,
    host: 'localhost',
    port: 5432,
    database: 'app',
    username: 'pg',
    password: 'pw',
    sslEnabled: false,
  };

  let mysqlQuery: ReturnType<typeof vi.fn>;
  let pgQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.randomUUID.mockReturnValue('tx-uuid-1');

    mysqlQuery = vi.fn().mockResolvedValue([{ affectedRows: 0 }, undefined]);
    pgQuery = vi.fn().mockResolvedValue({ fields: [], rows: [], rowCount: 0 });

    mocks.createMysqlConnection.mockResolvedValue({ query: mysqlQuery });
    mocks.createPgConnection.mockResolvedValue({ query: pgQuery });
    mocks.closeMysqlConnection.mockResolvedValue(undefined);
    mocks.closePgConnection.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    // Clean up any remaining transactions
    try { await transactionService.cleanupAll(); } catch { /* ignore */ }
  });

  describe('begin', () => {
    it('creates MySQL connection and runs BEGIN, returns txId', async () => {
      // Arrange
      mocks.getConnectionConfig.mockReturnValue(mysqlConfig);

      // Act
      const txId = await transactionService.begin('conn-1');

      // Assert
      expect(txId).toBe('tx-uuid-1');
      expect(mocks.createMysqlConnection).toHaveBeenCalledWith(mysqlConfig);
      expect(mysqlQuery).toHaveBeenCalledWith('BEGIN');
    });

    it('creates PostgreSQL connection and runs BEGIN, returns txId', async () => {
      // Arrange
      mocks.getConnectionConfig.mockReturnValue(pgConfig);

      // Act
      const txId = await transactionService.begin('conn-2');

      // Assert
      expect(txId).toBe('tx-uuid-1');
      expect(mocks.createPgConnection).toHaveBeenCalledWith(pgConfig);
      expect(pgQuery).toHaveBeenCalledWith('BEGIN');
    });

    it('throws for unsupported db type', async () => {
      // Arrange
      mocks.getConnectionConfig.mockReturnValue({ dbType: 'sqlite' });

      // Act & Assert
      await expect(transactionService.begin('conn-3')).rejects.toThrow(
        'Unsupported db type for transactions: sqlite',
      );
    });
  });

  describe('executeInTx', () => {
    it('runs SQL on the held MySQL connection with SELECT results', async () => {
      // Arrange
      mocks.getConnectionConfig.mockReturnValue(mysqlConfig);
      const txId = await transactionService.begin('conn-1');
      const rows = [{ id: 1, name: 'test' }];
      const fields = [{ name: 'id' }, { name: 'name' }];
      mysqlQuery.mockResolvedValueOnce([rows, fields]);

      // Act
      const result = await transactionService.executeInTx(txId, 'SELECT * FROM users');

      // Assert
      expect(result.columns).toEqual(['id', 'name']);
      expect(result.rows).toEqual(rows);
      expect(result.rowCount).toBe(1);
    });

    it('runs SQL on the held MySQL connection with DML results', async () => {
      // Arrange
      mocks.getConnectionConfig.mockReturnValue(mysqlConfig);
      const txId = await transactionService.begin('conn-1');
      mysqlQuery.mockResolvedValueOnce([{ affectedRows: 3 }, undefined]);

      // Act
      const result = await transactionService.executeInTx(txId, 'UPDATE users SET active = 1');

      // Assert
      expect(result.affectedRows).toBe(3);
      expect(result.rows).toEqual([]);
    });

    it('runs SQL on the held PostgreSQL connection', async () => {
      // Arrange
      mocks.getConnectionConfig.mockReturnValue(pgConfig);
      const txId = await transactionService.begin('conn-2');
      pgQuery.mockResolvedValueOnce({
        fields: [{ name: 'id' }],
        rows: [{ id: 1 }],
        rowCount: 1,
      });

      // Act
      const result = await transactionService.executeInTx(txId, 'SELECT * FROM users');

      // Assert
      expect(result.columns).toEqual(['id']);
      expect(result.rows).toEqual([{ id: 1 }]);
      expect(result.rowCount).toBe(1);
    });

    it('throws for invalid txId', async () => {
      await expect(
        transactionService.executeInTx('nonexistent', 'SELECT 1'),
      ).rejects.toThrow('Transaction nonexistent not found');
    });
  });

  describe('commit', () => {
    it('runs COMMIT and closes MySQL connection', async () => {
      // Arrange
      mocks.getConnectionConfig.mockReturnValue(mysqlConfig);
      const txId = await transactionService.begin('conn-1');

      // Act
      await transactionService.commit(txId);

      // Assert
      expect(mysqlQuery).toHaveBeenCalledWith('COMMIT');
      expect(mocks.closeMysqlConnection).toHaveBeenCalled();
    });

    it('runs COMMIT and closes PostgreSQL connection', async () => {
      // Arrange
      mocks.getConnectionConfig.mockReturnValue(pgConfig);
      const txId = await transactionService.begin('conn-2');

      // Act
      await transactionService.commit(txId);

      // Assert
      expect(pgQuery).toHaveBeenCalledWith('COMMIT');
      expect(mocks.closePgConnection).toHaveBeenCalled();
    });

    it('throws for invalid txId', async () => {
      await expect(transactionService.commit('nonexistent')).rejects.toThrow(
        'Transaction nonexistent not found',
      );
    });
  });

  describe('rollback', () => {
    it('runs ROLLBACK and closes MySQL connection', async () => {
      // Arrange
      mocks.getConnectionConfig.mockReturnValue(mysqlConfig);
      const txId = await transactionService.begin('conn-1');

      // Act
      await transactionService.rollback(txId);

      // Assert
      expect(mysqlQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mocks.closeMysqlConnection).toHaveBeenCalled();
    });

    it('throws for invalid txId', async () => {
      await expect(transactionService.rollback('nonexistent')).rejects.toThrow(
        'Transaction nonexistent not found',
      );
    });
  });

  describe('_cleanupExpired', () => {
    it('rollbacks transactions older than 5 minutes', async () => {
      // Arrange
      mocks.getConnectionConfig.mockReturnValue(mysqlConfig);
      const txId = await transactionService.begin('conn-1');

      // Manually age the transaction by mocking Date.now
      const originalNow = Date.now;
      vi.spyOn(Date, 'now').mockReturnValue(originalNow() + 6 * 60 * 1000);

      // Act
      await transactionService._cleanupExpired();

      // Assert
      expect(mysqlQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mocks.closeMysqlConnection).toHaveBeenCalled();

      vi.restoreAllMocks();
    });
  });

  describe('cleanupAll', () => {
    it('rollbacks all active transactions', async () => {
      // Arrange
      mocks.getConnectionConfig.mockReturnValue(mysqlConfig);
      mocks.randomUUID.mockReturnValueOnce('tx-1').mockReturnValueOnce('tx-2');
      await transactionService.begin('conn-1');
      await transactionService.begin('conn-1');

      // Act
      await transactionService.cleanupAll();

      // Assert — ROLLBACK called for each transaction
      const rollbackCalls = mysqlQuery.mock.calls.filter(
        (call: string[]) => call[0] === 'ROLLBACK',
      );
      expect(rollbackCalls.length).toBe(2);
    });
  });
});
