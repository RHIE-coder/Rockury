import { migrationRepository } from '#/repositories';
import { connectionService } from './connectionService';
import { createMysqlConnection, closeMysqlConnection, createPgConnection, closePgConnection } from '#/infrastructure';
import type { IMigration, TMigrationDirection, IDiffResult } from '~/shared/types/db';

export const migrationService = {
  list(diagramId: string, connectionId?: string): IMigration[] {
    return migrationRepository.list(diagramId, connectionId);
  },

  create(data: {
    diagramId: string;
    connectionId: string;
    direction: TMigrationDirection;
    diffSnapshot: IDiffResult;
    migrationDdl: string;
    rollbackDdl?: string;
  }): IMigration {
    return migrationRepository.create(data);
  },

  async apply(migrationId: string): Promise<IMigration> {
    const migration = migrationRepository.getById(migrationId);
    if (!migration) throw new Error(`Migration not found: ${migrationId}`);
    if (migration.status === 'applied') throw new Error('Migration already applied');

    const ddl = migration.migrationDdl.trim();
    if (!ddl) {
      return migrationRepository.updateStatus(migrationId, 'applied');
    }

    const statements = splitStatements(ddl);

    try {
      await executeStatements(migration.connectionId, statements);
      return migrationRepository.updateStatus(migrationId, 'applied');
    } catch (error) {
      migrationRepository.updateStatus(migrationId, 'failed');
      throw new Error(`Migration failed: ${(error as Error).message}`);
    }
  },

  async rollback(migrationId: string): Promise<IMigration> {
    const migration = migrationRepository.getById(migrationId);
    if (!migration) throw new Error(`Migration not found: ${migrationId}`);
    if (migration.status !== 'applied') throw new Error('Can only rollback applied migrations');

    const rollbackDdl = migration.rollbackDdl?.trim();
    if (!rollbackDdl) throw new Error('No rollback DDL available');

    const statements = splitStatements(rollbackDdl);

    try {
      await executeStatements(migration.connectionId, statements);
      return migrationRepository.updateStatus(migrationId, 'rolled_back');
    } catch (error) {
      throw new Error(`Rollback failed: ${(error as Error).message}`);
    }
  },

  delete(migrationId: string): void {
    const migration = migrationRepository.getById(migrationId);
    if (!migration) throw new Error(`Migration not found: ${migrationId}`);
    migrationRepository.deleteById(migrationId);
  },
};

async function executeStatements(connectionId: string, statements: string[]): Promise<void> {
  const config = connectionService.getConnectionConfig(connectionId);
  const dbType = config.dbType;

  if (dbType === 'mysql' || dbType === 'mariadb') {
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
      for (const stmt of statements) {
        if (!stmt.trim()) continue;
        await conn.query(stmt);
      }
    } finally {
      await closeMysqlConnection(conn);
    }
  } else if (dbType === 'postgresql') {
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
      for (const stmt of statements) {
        if (!stmt.trim()) continue;
        await client.query(stmt);
      }
    } finally {
      await closePgConnection(client);
    }
  } else {
    throw new Error(`Unsupported database type: ${dbType}`);
  }
}

function splitStatements(ddl: string): string[] {
  const statements: string[] = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < ddl.length; i++) {
    const ch = ddl[i];

    if (inString) {
      current += ch;
      if (ch === stringChar && ddl[i - 1] !== '\\') {
        inString = false;
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }

    if (ch === '(') depth++;
    if (ch === ')') depth--;

    if (ch === ';' && depth === 0) {
      if (current.trim()) statements.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}
