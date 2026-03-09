import { connectionRepository } from '#/repositories';
import { encrypt, decrypt } from '#/infrastructure';
import { createMysqlConnection, closeMysqlConnection } from '#/infrastructure';
import { createPgConnection, closePgConnection } from '#/infrastructure';
import type { IConnection, IConnectionFormData, IConnectionTestResult } from '~/shared/types/db';

export const connectionService = {
  list(): IConnection[] {
    return connectionRepository.list();
  },

  getById(id: string): IConnection {
    const conn = connectionRepository.getById(id);
    if (!conn) throw new Error(`Connection not found: ${id}`);
    return conn;
  },

  create(formData: IConnectionFormData): IConnection {
    const encryptedPassword = encrypt(formData.password);
    return connectionRepository.create({
      name: formData.name,
      dbType: formData.dbType,
      host: formData.host,
      port: formData.port,
      database: formData.database,
      username: formData.username,
      encryptedPassword,
      sslEnabled: formData.sslEnabled,
      sslConfig: formData.sslConfig,
    });
  },

  update(id: string, formData: Partial<IConnectionFormData>): IConnection {
    const existing = connectionRepository.getById(id);
    if (!existing) throw new Error(`Connection not found: ${id}`);

    const updateData: Parameters<typeof connectionRepository.update>[1] = {};

    if (formData.name !== undefined) updateData.name = formData.name;
    if (formData.dbType !== undefined) updateData.dbType = formData.dbType;
    if (formData.host !== undefined) updateData.host = formData.host;
    if (formData.port !== undefined) updateData.port = formData.port;
    if (formData.database !== undefined) updateData.database = formData.database;
    if (formData.username !== undefined) updateData.username = formData.username;
    if (formData.password !== undefined) updateData.encryptedPassword = encrypt(formData.password);
    if (formData.sslEnabled !== undefined) updateData.sslEnabled = formData.sslEnabled;
    if (formData.sslConfig !== undefined) updateData.sslConfig = formData.sslConfig;

    return connectionRepository.update(id, updateData);
  },

  deleteById(id: string): void {
    connectionRepository.deleteById(id);
  },

  async testConnection(formData: IConnectionFormData): Promise<IConnectionTestResult> {
    const start = Date.now();
    const dbType = formData.dbType;

    try {
      if (dbType === 'mysql' || dbType === 'mariadb') {
        const conn = await createMysqlConnection({
          host: formData.host,
          port: formData.port,
          database: formData.database,
          username: formData.username,
          password: formData.password,
          sslEnabled: formData.sslEnabled,
          sslConfig: formData.sslConfig,
        });

        const [rows] = await conn.query('SELECT VERSION() AS version');
        const version = (rows as Array<{ version: string }>)[0]?.version ?? 'unknown';
        await closeMysqlConnection(conn);

        return {
          success: true,
          message: 'Connection successful',
          latencyMs: Date.now() - start,
          serverVersion: version,
        };
      }

      if (dbType === 'postgresql') {
        const client = await createPgConnection({
          host: formData.host,
          port: formData.port,
          database: formData.database,
          username: formData.username,
          password: formData.password,
          sslEnabled: formData.sslEnabled,
          sslConfig: formData.sslConfig,
        });

        const result = await client.query('SELECT version()');
        const version = result.rows[0]?.version ?? 'unknown';
        await closePgConnection(client);

        return {
          success: true,
          message: 'Connection successful',
          latencyMs: Date.now() - start,
          serverVersion: version,
        };
      }

      return {
        success: false,
        message: `Unsupported database type: ${dbType}`,
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
        latencyMs: Date.now() - start,
      };
    }
  },

  /** Get connection config with decrypted password (for internal service use only) */
  getConnectionConfig(id: string) {
    const row = connectionRepository.getByIdWithPassword(id);
    if (!row) throw new Error(`Connection not found: ${id}`);
    return {
      ...row,
      password: decrypt(row.encryptedPassword),
    };
  },
};
