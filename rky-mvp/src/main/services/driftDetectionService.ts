import { schemaService } from './schemaService';
import { schemaSnapshotService } from './schemaSnapshotService';
import { diffService } from './diffService';
import type { ITable, ISchemaChange, IDriftCheckResult } from '~/shared/types/db';

function computeLightweightHash(tables: ITable[]): string {
  const sorted = tables
    .map((t) => t.name.toLowerCase())
    .sort()
    .join('|');
  return `${tables.length}:${sorted}`;
}

function tableDiffsToSchemaChanges(
  diff: ReturnType<typeof diffService.compareTableArrays>,
): ISchemaChange[] {
  return diff.tableDiffs.map((td) => ({
    tableName: td.tableName,
    action: td.action,
    columnChanges: td.columnDiffs.map((cd) => ({
      columnName: cd.columnName,
      action: cd.action,
      field: cd.changes?.[0]?.split(':')[0],
      oldValue: cd.realValue?.dataType,
      newValue: cd.virtualValue?.dataType,
    })),
  }));
}

// In-memory hash cache per connection
const hashCache = new Map<string, string>();

export const driftDetectionService = {
  async lightweightCheck(connectionId: string): Promise<IDriftCheckResult> {
    const tables = await schemaService.fetchRealSchema(connectionId);
    const currentHash = computeLightweightHash(tables);
    const previousHash = hashCache.get(connectionId);
    const hasDrift = previousHash !== undefined && previousHash !== currentHash;

    hashCache.set(connectionId, currentHash);

    return {
      connectionId,
      hasDrift,
      checkType: 'lightweight',
      lightweightHash: currentHash,
      previousHash,
      changes: [],
      correspondingDdl: '',
      checkedAt: new Date().toISOString(),
    };
  },

  async fullCheck(connectionId: string): Promise<IDriftCheckResult> {
    const snapshots = schemaSnapshotService.list(connectionId);
    const latestSnapshot = snapshots[0];
    const liveTables = await schemaService.fetchRealSchema(connectionId);

    // Update hash cache
    hashCache.set(connectionId, computeLightweightHash(liveTables));

    if (!latestSnapshot) {
      return {
        connectionId,
        hasDrift: false,
        checkType: 'full',
        changes: [],
        correspondingDdl: '',
        checkedAt: new Date().toISOString(),
      };
    }

    const diff = diffService.compareTableArrays(latestSnapshot.tables, liveTables, {
      sourceName: latestSnapshot.name,
      targetName: 'Live DB',
    });

    const changes = tableDiffsToSchemaChanges(diff);

    return {
      connectionId,
      hasDrift: diff.hasDifferences,
      checkType: 'full',
      changes,
      correspondingDdl: diff.migrationDdl,
      checkedAt: new Date().toISOString(),
    };
  },

  clearCache(connectionId: string): void {
    hashCache.delete(connectionId);
  },
};
