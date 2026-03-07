import { seedRepository } from '#/repositories';
import { queryService } from './queryService';
import type { ISeedFile } from '~/shared/types/db';

export const seedService = {
  list(): ISeedFile[] {
    return seedRepository.list();
  },

  create(data: { name: string; description: string; dmlContent: string; targetTables: string[] }): ISeedFile {
    return seedRepository.create(data);
  },

  update(id: string, data: Partial<{ name: string; description: string; dmlContent: string; targetTables: string[] }>): ISeedFile {
    return seedRepository.update(id, data);
  },

  deleteById(id: string): void {
    seedRepository.deleteById(id);
  },

  async captureFromTable(
    connectionId: string,
    tableName: string,
    whereClause?: string,
    limit = 100,
  ): Promise<{ dml: string; rowCount: number }> {
    const selectSql = whereClause
      ? `SELECT * FROM ${tableName} WHERE ${whereClause} LIMIT ${limit}`
      : `SELECT * FROM ${tableName} LIMIT ${limit}`;

    const result = await queryService.executeQuery(connectionId, selectSql);

    if (result.rowCount === 0) {
      return { dml: `-- No rows found in ${tableName}`, rowCount: 0 };
    }

    const columns = result.columns;
    const insertStatements = result.rows.map((row) => {
      const values = columns.map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'number') return String(val);
        return `'${String(val).replace(/'/g, "''")}'`;
      });
      return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
    });

    return {
      dml: insertStatements.join('\n'),
      rowCount: result.rowCount,
    };
  },
};
