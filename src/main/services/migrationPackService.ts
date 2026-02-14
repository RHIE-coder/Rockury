import { migrationPackRepository, diagramVersionRepository } from '#/repositories';
import { connectionService } from './connectionService';
import { diffService } from './diffService';
import { schemaSnapshotService } from './schemaSnapshotService';
import { createMysqlConnection, closeMysqlConnection, createPgConnection, closePgConnection } from '#/infrastructure';
import type { IMigrationPack, IMigrationLog } from '~/shared/types/db';

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

async function executeStatement(
  connectionId: string,
  stmt: string,
): Promise<void> {
  const config = connectionService.getConnectionConfig(connectionId);
  const dbType = config.dbType;

  if (dbType === 'mysql' || dbType === 'mariadb') {
    const conn = await createMysqlConnection({
      host: config.host, port: config.port, database: config.database,
      username: config.username, password: config.password,
      sslEnabled: config.sslEnabled, sslConfig: config.sslConfig,
    });
    try {
      await conn.query(stmt);
    } finally {
      await closeMysqlConnection(conn);
    }
  } else if (dbType === 'postgresql') {
    const client = await createPgConnection({
      host: config.host, port: config.port, database: config.database,
      username: config.username, password: config.password,
      sslEnabled: config.sslEnabled, sslConfig: config.sslConfig,
    });
    try {
      await client.query(stmt);
    } finally {
      await closePgConnection(client);
    }
  } else {
    throw new Error(`Unsupported database type: ${dbType}`);
  }
}

export const migrationPackService = {
  create(
    connectionId: string,
    diagramId: string,
    sourceVersionId: string | null,
    targetVersionId: string,
  ): IMigrationPack {
    const sourceVersion = sourceVersionId ? diagramVersionRepository.getById(sourceVersionId) : null;
    const targetVersion = diagramVersionRepository.getById(targetVersionId);
    if (!targetVersion) throw new Error(`Target version not found: ${targetVersionId}`);

    const sourceTables = sourceVersion?.schemaSnapshot?.tables ?? [];
    const targetTables = targetVersion.schemaSnapshot?.tables ?? [];

    const diff = diffService.compareTableArrays(sourceTables, targetTables, {
      sourceName: sourceVersion?.name ?? '(empty)',
      targetName: targetVersion.name,
      sourceVersionId: sourceVersionId ?? undefined,
      targetVersionId,
    });

    return migrationPackRepository.create({
      connectionId,
      diagramId,
      sourceVersionId,
      targetVersionId,
      diff,
      updateDdl: diff.migrationDdl,
      seedDml: '',
      rollbackDdl: diff.rollbackDdl,
      status: 'draft',
    });
  },

  updateSeedDml(id: string, seedDml: string): IMigrationPack {
    return migrationPackRepository.update(id, { seedDml, status: 'reviewed' });
  },

  async execute(id: string): Promise<IMigrationPack> {
    const pack = migrationPackRepository.getById(id);
    if (!pack) throw new Error(`Migration pack not found: ${id}`);
    if (pack.status !== 'draft' && pack.status !== 'reviewed') {
      throw new Error(`Cannot execute pack in status: ${pack.status}`);
    }

    // Pre-apply snapshot
    const preSnapshot = await schemaSnapshotService.create(pack.connectionId, `pre-${id.slice(0, 8)}`);
    migrationPackRepository.update(id, { preSnapshotId: preSnapshot.id, status: 'executing' });

    const logs: IMigrationLog[] = [];

    // Phase 1: DDL
    const ddlStatements = splitStatements(pack.updateDdl);
    for (let i = 0; i < ddlStatements.length; i++) {
      const stmt = ddlStatements[i];
      const start = Date.now();
      try {
        await executeStatement(pack.connectionId, stmt);
        logs.push({
          statementIndex: i,
          sql: stmt,
          phase: 'ddl',
          status: 'success',
          durationMs: Date.now() - start,
          executedAt: new Date().toISOString(),
        });
      } catch (error) {
        logs.push({
          statementIndex: i,
          sql: stmt,
          phase: 'ddl',
          status: 'failed',
          durationMs: Date.now() - start,
          error: (error as Error).message,
          executedAt: new Date().toISOString(),
        });
        migrationPackRepository.update(id, { executionLog: logs, status: 'failed' });
        return migrationPackRepository.getById(id)!;
      }
    }

    // Phase 2: Seed DML
    if (pack.seedDml.trim()) {
      const dmlStatements = splitStatements(pack.seedDml);
      for (let j = 0; j < dmlStatements.length; j++) {
        const stmt = dmlStatements[j];
        const start = Date.now();
        try {
          await executeStatement(pack.connectionId, stmt);
          logs.push({
            statementIndex: ddlStatements.length + j,
            sql: stmt,
            phase: 'dml',
            status: 'success',
            durationMs: Date.now() - start,
            executedAt: new Date().toISOString(),
          });
        } catch (error) {
          logs.push({
            statementIndex: ddlStatements.length + j,
            sql: stmt,
            phase: 'dml',
            status: 'failed',
            durationMs: Date.now() - start,
            error: (error as Error).message,
            executedAt: new Date().toISOString(),
          });
          migrationPackRepository.update(id, { executionLog: logs, status: 'failed' });
          return migrationPackRepository.getById(id)!;
        }
      }
    }

    migrationPackRepository.update(id, {
      executionLog: logs,
      status: 'applied',
      appliedAt: new Date().toISOString(),
    });
    return migrationPackRepository.getById(id)!;
  },

  async rollback(id: string): Promise<IMigrationPack> {
    const pack = migrationPackRepository.getById(id);
    if (!pack) throw new Error(`Migration pack not found: ${id}`);
    if (pack.status !== 'applied' && pack.status !== 'failed') {
      throw new Error(`Cannot rollback pack in status: ${pack.status}`);
    }

    const logs: IMigrationLog[] = pack.executionLog ?? [];
    const rollbackStatements = splitStatements(pack.rollbackDdl);

    for (let i = 0; i < rollbackStatements.length; i++) {
      const stmt = rollbackStatements[i];
      const start = Date.now();
      try {
        await executeStatement(pack.connectionId, stmt);
        logs.push({
          statementIndex: i,
          sql: stmt,
          phase: 'rollback',
          status: 'success',
          durationMs: Date.now() - start,
          executedAt: new Date().toISOString(),
        });
      } catch (error) {
        logs.push({
          statementIndex: i,
          sql: stmt,
          phase: 'rollback',
          status: 'failed',
          durationMs: Date.now() - start,
          error: (error as Error).message,
          executedAt: new Date().toISOString(),
        });
        // Continue (best-effort rollback)
      }
    }

    migrationPackRepository.update(id, {
      executionLog: logs,
      status: 'rolled_back',
      rolledBackAt: new Date().toISOString(),
    });
    return migrationPackRepository.getById(id)!;
  },

  list(diagramId: string): IMigrationPack[] {
    return migrationPackRepository.list(diagramId);
  },

  getById(id: string): IMigrationPack | null {
    return migrationPackRepository.getById(id);
  },

  deleteById(id: string): void {
    migrationPackRepository.deleteById(id);
  },
};
