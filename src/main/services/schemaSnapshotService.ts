import crypto from 'node:crypto';
import { schemaSnapshotRepository, diagramVersionRepository } from '#/repositories';
import { connectionService } from './connectionService';
import { schemaService } from './schemaService';
import { diffService } from './diffService';
import type { ISchemaSnapshot, ITable, IValidationResult, TDbType } from '~/shared/types/db';

function generateChecksum(tables: ITable[]): string {
  const normalized = tables
    .map((t) => ({
      name: t.name.toLowerCase(),
      columns: t.columns
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => `${c.name}|${c.dataType}|${c.nullable}|${(c.keyTypes ?? []).join(',')}|${c.defaultValue ?? ''}`),
      constraints: (t.constraints ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => `${c.name}|${c.type}|${c.columns.join(',')}`),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export const schemaSnapshotService = {
  async create(connectionId: string, name?: string): Promise<ISchemaSnapshot> {
    const config = connectionService.getConnectionConfig(connectionId);
    const tables = await schemaService.fetchRealSchema(connectionId);
    const checksum = generateChecksum(tables);

    const snapshotName = name ?? `snapshot-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}`;

    return schemaSnapshotRepository.create({
      connectionId,
      name: snapshotName,
      tables,
      metadata: {
        dbType: config.dbType as TDbType,
        tableCount: tables.length,
        database: config.database,
      },
      checksum,
    });
  },

  list(connectionId: string): ISchemaSnapshot[] {
    return schemaSnapshotRepository.list(connectionId);
  },

  getById(id: string): ISchemaSnapshot | null {
    return schemaSnapshotRepository.getById(id);
  },

  rename(id: string, name: string): ISchemaSnapshot {
    return schemaSnapshotRepository.rename(id, name);
  },

  deleteById(id: string): void {
    schemaSnapshotRepository.deleteById(id);
  },

  async validate(snapshotId: string): Promise<IValidationResult> {
    const snapshot = schemaSnapshotRepository.getById(snapshotId);
    if (!snapshot) throw new Error(`Snapshot not found: ${snapshotId}`);

    const liveTables = await schemaService.fetchRealSchema(snapshot.connectionId);
    const diff = diffService.compareTableArrays(snapshot.tables, liveTables, {
      sourceName: snapshot.name,
      targetName: 'Live DB',
    });

    const isValid = diff.tableDiffs.length === 0;
    schemaSnapshotRepository.updateValidation(snapshotId, isValid);

    return {
      snapshotId,
      connectionId: snapshot.connectionId,
      isValid,
      matchedTables: liveTables.length,
      totalTables: Math.max(snapshot.tables.length, liveTables.length),
      diffs: diff.tableDiffs,
      checkedAt: new Date().toISOString(),
    };
  },

  async validateAgainstVersion(connectionId: string, versionId: string): Promise<IValidationResult> {
    const version = diagramVersionRepository.getById(versionId);
    if (!version) throw new Error(`Version not found: ${versionId}`);

    const liveTables = await schemaService.fetchRealSchema(connectionId);
    const versionTables = version.schemaSnapshot?.tables ?? [];
    const diff = diffService.compareTableArrays(versionTables, liveTables, {
      sourceName: version.name,
      targetName: 'Live DB',
    });

    const isValid = diff.tableDiffs.length === 0;

    return {
      snapshotId: '',
      connectionId,
      isValid,
      matchedTables: liveTables.length,
      totalTables: Math.max(versionTables.length, liveTables.length),
      diffs: diff.tableDiffs,
      checkedAt: new Date().toISOString(),
    };
  },

  generateChecksum,
};
