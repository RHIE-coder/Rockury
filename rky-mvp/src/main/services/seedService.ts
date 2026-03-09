import { seedRepository } from '#/repositories';
import { queryService } from './queryService';
import { schemaService } from './schemaService';
import type { ISeedFile, ITable } from '~/shared/types/db';

/**
 * Build FK dependency graph and topologically sort tables.
 * Returns tables in insertion order (dependencies first).
 */
function topologicalSort(tables: ITable[], rootTable: string): string[] {
  const tableMap = new Map(tables.map((t) => [t.name.toLowerCase(), t]));
  const visited = new Set<string>();
  const result: string[] = [];

  function visit(name: string): void {
    const key = name.toLowerCase();
    if (visited.has(key)) return;
    visited.add(key);

    const table = tableMap.get(key);
    if (!table) return;

    // Visit FK dependencies first
    for (const col of table.columns) {
      if (col.reference) {
        visit(col.reference.table);
      }
    }

    result.push(table.name);
  }

  visit(rootTable);
  return result;
}

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

  async captureWithFkOrdering(
    connectionId: string,
    tableName: string,
    whereClause?: string,
    limit = 100,
    saveMode: 'append' | 'overwrite' | 'new' = 'new',
    targetSeedId?: string,
    newSeedName?: string,
  ): Promise<{ dml: string; rowCount: number; fkOrderedTables: string[]; seedId: string }> {
    // 1. Fetch FK dependencies from the schema
    const tables = await schemaService.fetchRealSchema(connectionId);
    const orderedTables = topologicalSort(tables, tableName);

    // 2. Capture data from each table in FK order
    let totalDml = '';
    let totalRowCount = 0;
    const allTargetTables: string[] = [];

    for (const tbl of orderedTables) {
      const clause = tbl === tableName ? whereClause : undefined;
      const captureResult = await this.captureFromTable(connectionId, tbl, clause, limit);
      if (captureResult.rowCount > 0) {
        totalDml += (totalDml ? '\n\n' : '') + `-- Table: ${tbl}\n${captureResult.dml}`;
        totalRowCount += captureResult.rowCount;
        allTargetTables.push(tbl);
      }
    }

    if (totalRowCount === 0) {
      totalDml = `-- No rows found for ${tableName} and its dependencies`;
    }

    // 3. Save based on mode
    let seedId: string;

    if (saveMode === 'append' && targetSeedId) {
      const existing = seedRepository.getById(targetSeedId);
      if (!existing) throw new Error(`Seed not found: ${targetSeedId}`);
      const updatedDml = existing.dmlContent + '\n\n' + totalDml;
      const mergedTables = Array.from(new Set([...existing.targetTables, ...allTargetTables]));
      seedRepository.update(targetSeedId, { dmlContent: updatedDml, targetTables: mergedTables });
      seedId = targetSeedId;
    } else if (saveMode === 'overwrite' && targetSeedId) {
      const existing = seedRepository.getById(targetSeedId);
      if (!existing) throw new Error(`Seed not found: ${targetSeedId}`);
      seedRepository.update(targetSeedId, { dmlContent: totalDml, targetTables: allTargetTables });
      seedId = targetSeedId;
    } else {
      const name = newSeedName ?? `seed-${tableName}-${Date.now()}`;
      const created = seedRepository.create({
        name,
        description: `FK-ordered capture from ${tableName}`,
        dmlContent: totalDml,
        targetTables: allTargetTables,
      });
      seedId = created.id;
    }

    return {
      dml: totalDml,
      rowCount: totalRowCount,
      fkOrderedTables: orderedTables,
      seedId,
    };
  },

  async applyToConnection(
    seedId: string,
    connectionId: string,
  ): Promise<{ appliedRows: number }> {
    const seed = seedRepository.getById(seedId);
    if (!seed) throw new Error(`Seed not found: ${seedId}`);

    if (!seed.dmlContent.trim()) {
      return { appliedRows: 0 };
    }

    const result = await queryService.executeQuery(connectionId, seed.dmlContent);
    return { appliedRows: result.affectedRows ?? result.rowCount };
  },
};
