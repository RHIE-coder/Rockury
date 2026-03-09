import { getDb } from '#/infrastructure';
import type { IMigrationPack, IDiffResult, IMigrationLog, TMigrationPackStatus } from '~/shared/types/db';

interface MigrationPackRow {
  id: string;
  connection_id: string;
  diagram_id: string;
  source_version_id: string | null;
  target_version_id: string;
  pre_snapshot_id: string | null;
  diff_json: string;
  update_ddl: string;
  seed_dml: string;
  rollback_ddl: string;
  status: string;
  execution_log_json: string | null;
  applied_at: string | null;
  rolled_back_at: string | null;
  post_snapshot_id: string | null;
  created_at: string;
}

function toMigrationPack(row: MigrationPackRow): IMigrationPack {
  return {
    id: row.id,
    connectionId: row.connection_id,
    diagramId: row.diagram_id,
    sourceVersionId: row.source_version_id,
    targetVersionId: row.target_version_id,
    preSnapshotId: row.pre_snapshot_id ?? undefined,
    diff: JSON.parse(row.diff_json) as IDiffResult,
    updateDdl: row.update_ddl,
    seedDml: row.seed_dml,
    rollbackDdl: row.rollback_ddl,
    status: row.status as TMigrationPackStatus,
    executionLog: row.execution_log_json ? JSON.parse(row.execution_log_json) as IMigrationLog[] : undefined,
    appliedAt: row.applied_at ?? undefined,
    rolledBackAt: row.rolled_back_at ?? undefined,
    postSnapshotId: row.post_snapshot_id ?? undefined,
    createdAt: row.created_at,
  };
}

export const migrationPackRepository = {
  list(diagramId: string): IMigrationPack[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM migration_packs WHERE diagram_id = ? ORDER BY created_at DESC',
    ).all(diagramId) as MigrationPackRow[];
    return rows.map(toMigrationPack);
  },

  getById(id: string): IMigrationPack | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM migration_packs WHERE id = ?').get(id) as MigrationPackRow | undefined;
    return row ? toMigrationPack(row) : null;
  },

  create(data: {
    connectionId: string;
    diagramId: string;
    sourceVersionId: string | null;
    targetVersionId: string;
    diff: IDiffResult;
    updateDdl: string;
    seedDml: string;
    rollbackDdl: string;
    status: TMigrationPackStatus;
  }): IMigrationPack {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO migration_packs (id, connection_id, diagram_id, source_version_id, target_version_id, diff_json, update_ddl, seed_dml, rollback_ddl, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      data.connectionId,
      data.diagramId,
      data.sourceVersionId,
      data.targetVersionId,
      JSON.stringify(data.diff),
      data.updateDdl,
      data.seedDml,
      data.rollbackDdl,
      data.status,
    );
    return this.getById(id)!;
  },

  update(id: string, data: Partial<{
    preSnapshotId: string;
    postSnapshotId: string;
    seedDml: string;
    status: TMigrationPackStatus;
    executionLog: IMigrationLog[];
    appliedAt: string;
    rolledBackAt: string;
  }>): IMigrationPack {
    const db = getDb();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (data.preSnapshotId !== undefined) { sets.push('pre_snapshot_id = ?'); values.push(data.preSnapshotId); }
    if (data.postSnapshotId !== undefined) { sets.push('post_snapshot_id = ?'); values.push(data.postSnapshotId); }
    if (data.seedDml !== undefined) { sets.push('seed_dml = ?'); values.push(data.seedDml); }
    if (data.status !== undefined) { sets.push('status = ?'); values.push(data.status); }
    if (data.executionLog !== undefined) { sets.push('execution_log_json = ?'); values.push(JSON.stringify(data.executionLog)); }
    if (data.appliedAt !== undefined) { sets.push('applied_at = ?'); values.push(data.appliedAt); }
    if (data.rolledBackAt !== undefined) { sets.push('rolled_back_at = ?'); values.push(data.rolledBackAt); }

    if (sets.length === 0) return this.getById(id)!;

    values.push(id);
    db.prepare(`UPDATE migration_packs SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(id)!;
  },

  deleteById(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM migration_packs WHERE id = ?').run(id);
  },
};
