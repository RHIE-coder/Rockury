import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getConnectionConfig: vi.fn(),
  createMysqlConnection: vi.fn(),
  closeMysqlConnection: vi.fn(),
  createPgConnection: vi.fn(),
  closePgConnection: vi.fn(),
  createQueryHistory: vi.fn(),
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

vi.mock('#/repositories', () => ({
  queryRepository: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteById: vi.fn(),
  },
  queryHistoryRepository: {
    create: mocks.createQueryHistory,
    list: vi.fn(),
  },
}));

import { queryService } from './queryService';

describe('queryService.executeQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getConnectionConfig.mockReturnValue({
      dbType: 'mysql',
      host: 'localhost',
      port: 3306,
      database: 'app',
      username: 'root',
      password: 'pw',
      sslEnabled: false,
    });
  });

  it('executes SQL script statements sequentially for MySQL', async () => {
    const mysqlQuery = vi.fn()
      .mockResolvedValueOnce([{ affectedRows: 0 }, undefined])
      .mockResolvedValueOnce([{ affectedRows: 0 }, undefined]);

    mocks.createMysqlConnection.mockResolvedValue({ query: mysqlQuery });
    mocks.closeMysqlConnection.mockResolvedValue(undefined);

    await queryService.executeQuery(
      'conn-1',
      'CREATE TABLE a (id INT); CREATE TABLE b (id INT);',
    );

    expect(mysqlQuery).toHaveBeenCalledTimes(2);
    expect(mysqlQuery).toHaveBeenNthCalledWith(1, 'CREATE TABLE a (id INT)');
    expect(mysqlQuery).toHaveBeenNthCalledWith(2, 'CREATE TABLE b (id INT)');
    expect(mocks.createQueryHistory).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success' }),
    );
  });

  it('does not split semicolons inside strings', async () => {
    const mysqlQuery = vi.fn()
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([{ affectedRows: 0 }, undefined]);

    mocks.createMysqlConnection.mockResolvedValue({ query: mysqlQuery });
    mocks.closeMysqlConnection.mockResolvedValue(undefined);

    await queryService.executeQuery(
      'conn-1',
      "INSERT INTO logs(message) VALUES ('a; b'); CREATE TABLE c (id INT);",
    );

    expect(mysqlQuery).toHaveBeenCalledTimes(2);
    expect(mysqlQuery).toHaveBeenNthCalledWith(
      1,
      "INSERT INTO logs(message) VALUES ('a; b')",
    );
    expect(mysqlQuery).toHaveBeenNthCalledWith(2, 'CREATE TABLE c (id INT)');
  });
});
