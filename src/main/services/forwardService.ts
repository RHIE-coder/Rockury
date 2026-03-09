import { diagramVersionRepository } from '#/repositories';
import { connectionService } from './connectionService';
import { schemaSnapshotService } from './schemaSnapshotService';
import { migrationPackService } from './migrationPackService';
import { diffService } from './diffService';
import { queryService } from './queryService';
import { schemaService } from './schemaService';
import type { IDiffResult, IMigrationLog, IMigrationPack } from '~/shared/types/db';

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

export const forwardService = {
  async preCheck(
    connectionId: string,
    diagramId: string,
    targetVersionId: string,
  ): Promise<{
    preSnapshotId: string;
    checksum: string;
    diff: IDiffResult;
    migrationStatements: string[];
  }> {
    // 1. Create pre-snapshot of current live state
    const preSnapshot = await schemaSnapshotService.create(connectionId, `pre-forward-${Date.now()}`);

    // 2. Get target version schema
    const targetVersion = diagramVersionRepository.getById(targetVersionId);
    if (!targetVersion) throw new Error(`Target version not found: ${targetVersionId}`);
    const targetTables = targetVersion.schemaSnapshot?.tables ?? [];

    // 3. Get live tables for comparison
    const liveTables = await schemaService.fetchRealSchema(connectionId);

    // 4. Compute diff between target version and current live state
    const diff = diffService.compareTableArrays(targetTables, liveTables, {
      sourceName: targetVersion.name,
      targetName: 'Live DB',
      targetVersionId,
    });

    // 5. Parse migration DDL into individual statements
    const migrationStatements = splitStatements(diff.migrationDdl);

    return {
      preSnapshotId: preSnapshot.id,
      checksum: preSnapshot.checksum,
      diff,
      migrationStatements,
    };
  },

  async executeStep(
    connectionId: string,
    migrationPackId: string,
    statementIndex: number,
    expectedChecksum: string,
  ): Promise<{
    log: IMigrationLog;
    currentChecksum: string;
    checksumMatch: boolean;
  }> {
    // 1. Get the migration pack
    const pack = migrationPackService.getById(migrationPackId);
    if (!pack) throw new Error(`Migration pack not found: ${migrationPackId}`);

    // 2. Lightweight drift check via checksum
    const liveTables = await schemaService.fetchRealSchema(connectionId);
    const currentChecksum = schemaSnapshotService.generateChecksum(liveTables);
    const checksumMatch = currentChecksum === expectedChecksum;

    // 3. Execute the single statement
    const statements = splitStatements(pack.updateDdl);
    if (statementIndex >= statements.length) {
      throw new Error(`Statement index out of range: ${statementIndex} >= ${statements.length}`);
    }

    const stmt = statements[statementIndex];
    const start = Date.now();
    let log: IMigrationLog;

    try {
      await queryService.executeQuery(connectionId, stmt);
      log = {
        statementIndex,
        sql: stmt,
        phase: 'ddl',
        status: 'success',
        durationMs: Date.now() - start,
        executedAt: new Date().toISOString(),
      };
    } catch (error) {
      log = {
        statementIndex,
        sql: stmt,
        phase: 'ddl',
        status: 'failed',
        durationMs: Date.now() - start,
        error: (error as Error).message,
        executedAt: new Date().toISOString(),
      };
    }

    // 4. Re-compute checksum after execution
    const postTables = await schemaService.fetchRealSchema(connectionId);
    const postChecksum = schemaSnapshotService.generateChecksum(postTables);

    return {
      log,
      currentChecksum: postChecksum,
      checksumMatch,
    };
  },

  async rollback(migrationPackId: string): Promise<IMigrationPack> {
    return migrationPackService.rollback(migrationPackId);
  },
};
