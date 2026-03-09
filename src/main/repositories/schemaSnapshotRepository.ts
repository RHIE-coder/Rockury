import { getDb } from '#/infrastructure';
import type { ISchemaSnapshot, ITable, TDbType } from '~/shared/types/db';

interface SchemaSnapshotRow {
  id: string;
  connection_id: string;
  name: string;
  tables_json: string;
  metadata_json: string;
  checksum: string;
  validated_at: string | null;
  is_valid: number;
  created_at: string;
}

function toSchemaSnapshot(row: SchemaSnapshotRow): ISchemaSnapshot {
  return {
    id: row.id,
    connectionId: row.connection_id,
    name: row.name,
    tables: JSON.parse(row.tables_json) as ITable[],
    metadata: JSON.parse(row.metadata_json) as ISchemaSnapshot['metadata'],
    checksum: row.checksum,
    validatedAt: row.validated_at ?? undefined,
    isValid: row.is_valid === 1 ? true : row.is_valid === 0 && row.validated_at ? false : undefined,
    createdAt: row.created_at,
  };
}

export const schemaSnapshotRepository = {
  list(connectionId: string): ISchemaSnapshot[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM schema_snapshots WHERE connection_id = ? ORDER BY created_at DESC',
    ).all(connectionId) as SchemaSnapshotRow[];
    return rows.map(toSchemaSnapshot);
  },

  getById(id: string): ISchemaSnapshot | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM schema_snapshots WHERE id = ?').get(id) as SchemaSnapshotRow | undefined;
    return row ? toSchemaSnapshot(row) : null;
  },

  create(data: {
    connectionId: string;
    name: string;
    tables: ITable[];
    metadata: { dbType: TDbType; serverVersion?: string; tableCount: number; database: string };
    checksum: string;
  }): ISchemaSnapshot {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO schema_snapshots (id, connection_id, name, tables_json, metadata_json, checksum)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      data.connectionId,
      data.name,
      JSON.stringify(data.tables),
      JSON.stringify(data.metadata),
      data.checksum,
    );
    return this.getById(id)!;
  },

  updateValidation(id: string, isValid: boolean): void {
    const db = getDb();
    db.prepare(
      `UPDATE schema_snapshots SET is_valid = ?, validated_at = datetime('now') WHERE id = ?`,
    ).run(isValid ? 1 : 0, id);
  },

  rename(id: string, name: string): ISchemaSnapshot {
    const db = getDb();
    db.prepare('UPDATE schema_snapshots SET name = ? WHERE id = ?').run(name, id);
    return this.getById(id)!;
  },

  deleteById(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM schema_snapshots WHERE id = ?').run(id);
  },
};
