import { getDb } from '#/infrastructure';
import type { IMigration, TMigrationDirection, TMigrationStatus, IDiffResult } from '~/shared/types/db';

interface MigrationRow {
  id: string;
  diagram_id: string;
  connection_id: string;
  version_number: number;
  direction: string;
  diff_snapshot: string;
  migration_ddl: string;
  rollback_ddl: string | null;
  status: string;
  applied_at: string | null;
  created_at: string;
}

function toMigration(row: MigrationRow): IMigration {
  return {
    id: row.id,
    diagramId: row.diagram_id,
    connectionId: row.connection_id,
    versionNumber: row.version_number,
    direction: row.direction as TMigrationDirection,
    diffSnapshot: JSON.parse(row.diff_snapshot) as IDiffResult,
    migrationDdl: row.migration_ddl,
    rollbackDdl: row.rollback_ddl ?? undefined,
    status: row.status as TMigrationStatus,
    appliedAt: row.applied_at,
    createdAt: row.created_at,
  };
}

export const migrationRepository = {
  list(diagramId: string, connectionId?: string): IMigration[] {
    const db = getDb();
    if (connectionId) {
      const rows = db.prepare(
        'SELECT * FROM diagram_migrations WHERE diagram_id = ? AND connection_id = ? ORDER BY version_number DESC',
      ).all(diagramId, connectionId) as MigrationRow[];
      return rows.map(toMigration);
    }
    const rows = db.prepare(
      'SELECT * FROM diagram_migrations WHERE diagram_id = ? ORDER BY version_number DESC',
    ).all(diagramId) as MigrationRow[];
    return rows.map(toMigration);
  },

  getById(id: string): IMigration | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM diagram_migrations WHERE id = ?').get(id) as MigrationRow | undefined;
    return row ? toMigration(row) : null;
  },

  getLatestVersionNumber(diagramId: string, connectionId: string): number {
    const db = getDb();
    const row = db.prepare(
      'SELECT MAX(version_number) as max_version FROM diagram_migrations WHERE diagram_id = ? AND connection_id = ?',
    ).get(diagramId, connectionId) as { max_version: number | null } | undefined;
    return (row?.max_version ?? 0) + 1;
  },

  create(data: {
    diagramId: string;
    connectionId: string;
    direction: TMigrationDirection;
    diffSnapshot: IDiffResult;
    migrationDdl: string;
    rollbackDdl?: string;
  }): IMigration {
    const db = getDb();
    const id = crypto.randomUUID();
    const versionNumber = this.getLatestVersionNumber(data.diagramId, data.connectionId);
    db.prepare(
      `INSERT INTO diagram_migrations (id, diagram_id, connection_id, version_number, direction, diff_snapshot, migration_ddl, rollback_ddl)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      data.diagramId,
      data.connectionId,
      versionNumber,
      data.direction,
      JSON.stringify(data.diffSnapshot),
      data.migrationDdl,
      data.rollbackDdl ?? '',
    );
    return this.getById(id)!;
  },

  updateStatus(id: string, status: TMigrationStatus): IMigration {
    const db = getDb();
    const appliedAt = status === 'applied' ? new Date().toISOString() : null;
    db.prepare(
      'UPDATE diagram_migrations SET status = ?, applied_at = ? WHERE id = ?',
    ).run(status, appliedAt, id);
    return this.getById(id)!;
  },

  deleteById(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM diagram_migrations WHERE id = ?').run(id);
  },
};
