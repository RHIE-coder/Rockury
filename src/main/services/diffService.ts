import { diagramRepository } from '#/repositories';
import { schemaService } from './schemaService';
import type {
  IDiagram, IDiffResult, ITableDiff, IColumnDiff, IConstraintDiff,
  ITable, IColumn, IConstraint, TDiffAction,
} from '~/shared/types/db';

function compareColumns(
  virtualCols: IColumn[],
  realCols: IColumn[],
): IColumnDiff[] {
  const diffs: IColumnDiff[] = [];
  const realColMap = new Map(realCols.map(c => [c.name.toLowerCase(), c]));
  const virtualColMap = new Map(virtualCols.map(c => [c.name.toLowerCase(), c]));

  // Added columns (in virtual, not in real)
  for (const vCol of virtualCols) {
    const key = vCol.name.toLowerCase();
    if (!realColMap.has(key)) {
      diffs.push({
        columnName: vCol.name,
        action: 'added',
        virtualValue: vCol,
      });
    }
  }

  // Removed columns (in real, not in virtual)
  for (const rCol of realCols) {
    const key = rCol.name.toLowerCase();
    if (!virtualColMap.has(key)) {
      diffs.push({
        columnName: rCol.name,
        action: 'removed',
        realValue: rCol,
      });
    }
  }

  // Modified columns (in both)
  for (const vCol of virtualCols) {
    const key = vCol.name.toLowerCase();
    const rCol = realColMap.get(key);
    if (!rCol) continue;

    const changes: string[] = [];
    if (vCol.dataType.toLowerCase() !== rCol.dataType.toLowerCase()) {
      changes.push(`dataType: ${rCol.dataType} -> ${vCol.dataType}`);
    }
    if (vCol.nullable !== rCol.nullable) {
      changes.push(`nullable: ${rCol.nullable} -> ${vCol.nullable}`);
    }
    if ((vCol.defaultValue ?? '') !== (rCol.defaultValue ?? '')) {
      changes.push(`defaultValue: ${rCol.defaultValue ?? 'NULL'} -> ${vCol.defaultValue ?? 'NULL'}`);
    }
    if (vCol.keyType !== rCol.keyType) {
      changes.push(`keyType: ${rCol.keyType ?? 'none'} -> ${vCol.keyType ?? 'none'}`);
    }

    if (changes.length > 0) {
      diffs.push({
        columnName: vCol.name,
        action: 'modified',
        virtualValue: vCol,
        realValue: rCol,
        changes,
      });
    }
  }

  return diffs;
}

function compareConstraints(
  virtualConstraints: IConstraint[],
  realConstraints: IConstraint[],
): IConstraintDiff[] {
  const diffs: IConstraintDiff[] = [];
  const realMap = new Map(realConstraints.map(c => [c.name.toLowerCase(), c]));
  const virtualMap = new Map(virtualConstraints.map(c => [c.name.toLowerCase(), c]));

  for (const vc of virtualConstraints) {
    if (!realMap.has(vc.name.toLowerCase())) {
      diffs.push({ constraintName: vc.name, action: 'added', virtualValue: vc });
    }
  }

  for (const rc of realConstraints) {
    if (!virtualMap.has(rc.name.toLowerCase())) {
      diffs.push({ constraintName: rc.name, action: 'removed', realValue: rc });
    }
  }

  return diffs;
}

function generateMigrationDdl(tableDiffs: ITableDiff[]): string {
  const lines: string[] = [];

  for (const td of tableDiffs) {
    if (td.action === 'added') {
      lines.push(`-- TODO: CREATE TABLE ${td.tableName}`);
    } else if (td.action === 'removed') {
      lines.push(`DROP TABLE IF EXISTS ${td.tableName};`);
    } else if (td.action === 'modified') {
      for (const cd of td.columnDiffs) {
        if (cd.action === 'added' && cd.virtualValue) {
          lines.push(`ALTER TABLE ${td.tableName} ADD COLUMN ${cd.columnName} ${cd.virtualValue.dataType}${cd.virtualValue.nullable ? '' : ' NOT NULL'}${cd.virtualValue.defaultValue ? ` DEFAULT ${cd.virtualValue.defaultValue}` : ''};`);
        } else if (cd.action === 'removed') {
          lines.push(`ALTER TABLE ${td.tableName} DROP COLUMN ${cd.columnName};`);
        } else if (cd.action === 'modified' && cd.virtualValue) {
          lines.push(`ALTER TABLE ${td.tableName} MODIFY COLUMN ${cd.columnName} ${cd.virtualValue.dataType}${cd.virtualValue.nullable ? '' : ' NOT NULL'}${cd.virtualValue.defaultValue ? ` DEFAULT ${cd.virtualValue.defaultValue}` : ''};`);
        }
      }
    }
  }

  return lines.join('\n');
}

function generateRollbackDdl(tableDiffs: ITableDiff[]): string {
  const lines: string[] = [];

  for (const td of tableDiffs) {
    if (td.action === 'added') {
      // Forward added a table → rollback drops it
      lines.push(`DROP TABLE IF EXISTS ${td.tableName};`);
    } else if (td.action === 'removed') {
      // Forward dropped a table → rollback recreates it (placeholder)
      lines.push(`-- TODO: CREATE TABLE ${td.tableName}`);
    } else if (td.action === 'modified') {
      for (const cd of td.columnDiffs) {
        if (cd.action === 'added') {
          // Forward added a column → rollback drops it
          lines.push(`ALTER TABLE ${td.tableName} DROP COLUMN ${cd.columnName};`);
        } else if (cd.action === 'removed' && cd.realValue) {
          // Forward dropped a column → rollback re-adds it
          lines.push(`ALTER TABLE ${td.tableName} ADD COLUMN ${cd.columnName} ${cd.realValue.dataType}${cd.realValue.nullable ? '' : ' NOT NULL'}${cd.realValue.defaultValue ? ` DEFAULT ${cd.realValue.defaultValue}` : ''};`);
        } else if (cd.action === 'modified' && cd.realValue) {
          // Forward modified a column → rollback reverts to real value
          lines.push(`ALTER TABLE ${td.tableName} MODIFY COLUMN ${cd.columnName} ${cd.realValue.dataType}${cd.realValue.nullable ? '' : ' NOT NULL'}${cd.realValue.defaultValue ? ` DEFAULT ${cd.realValue.defaultValue}` : ''};`);
        }
      }
    }
  }

  return lines.join('\n');
}

function compareTables(
  sourceTables: ITable[],
  targetTables: ITable[],
): ITableDiff[] {
  const sourceTableMap = new Map(sourceTables.map(t => [t.name.toLowerCase(), t]));
  const targetTableMap = new Map(targetTables.map(t => [t.name.toLowerCase(), t]));
  const tableDiffs: ITableDiff[] = [];

  // Tables in source, not in target (added)
  for (const st of sourceTables) {
    const key = st.name.toLowerCase();
    if (!targetTableMap.has(key)) {
      tableDiffs.push({
        tableName: st.name,
        action: 'added',
        columnDiffs: st.columns.map(c => ({
          columnName: c.name,
          action: 'added' as TDiffAction,
          virtualValue: c,
        })),
        constraintDiffs: st.constraints.map(c => ({
          constraintName: c.name,
          action: 'added' as TDiffAction,
          virtualValue: c,
        })),
      });
    }
  }

  // Tables in target, not in source (removed)
  for (const tt of targetTables) {
    const key = tt.name.toLowerCase();
    if (!sourceTableMap.has(key)) {
      tableDiffs.push({
        tableName: tt.name,
        action: 'removed',
        columnDiffs: tt.columns.map(c => ({
          columnName: c.name,
          action: 'removed' as TDiffAction,
          realValue: c,
        })),
        constraintDiffs: tt.constraints.map(c => ({
          constraintName: c.name,
          action: 'removed' as TDiffAction,
          realValue: c,
        })),
      });
    }
  }

  // Tables in both - compare
  for (const st of sourceTables) {
    const key = st.name.toLowerCase();
    const tt = targetTableMap.get(key);
    if (!tt) continue;

    const columnDiffs = compareColumns(st.columns, tt.columns);
    const constraintDiffs = compareConstraints(st.constraints, tt.constraints);

    if (columnDiffs.length > 0 || constraintDiffs.length > 0) {
      tableDiffs.push({
        tableName: st.name,
        action: 'modified',
        columnDiffs,
        constraintDiffs,
      });
    }
  }

  return tableDiffs;
}

export const diffService = {
  async applyRealToVirtual(
    virtualDiagramId: string,
    connectionId: string,
  ): Promise<IDiagram> {
    const diagram = diagramRepository.getById(virtualDiagramId);
    if (!diagram) throw new Error(`Diagram not found: ${virtualDiagramId}`);

    const realTables = await schemaService.fetchRealSchema(connectionId);
    return diagramRepository.update(virtualDiagramId, { tables: realTables });
  },

  async compareDiagrams(
    virtualDiagramId: string,
    connectionId: string,
  ): Promise<IDiffResult> {
    const diagram = diagramRepository.getById(virtualDiagramId);
    if (!diagram) throw new Error(`Diagram not found: ${virtualDiagramId}`);

    const realTables = await schemaService.fetchRealSchema(connectionId);
    const tableDiffs = compareTables(diagram.tables, realTables);
    const migrationDdl = generateMigrationDdl(tableDiffs);
    const rollbackDdl = generateRollbackDdl(tableDiffs);

    return {
      virtualDiagramId,
      realDiagramId: connectionId,
      tableDiffs,
      hasDifferences: tableDiffs.length > 0,
      migrationDdl,
      rollbackDdl,
      comparedAt: new Date().toISOString(),
      mode: 'virtual_vs_real',
      sourceName: diagram.name,
      targetName: 'Real DB',
    };
  },

  compareVirtualDiagrams(
    sourceDiagramId: string,
    targetDiagramId: string,
  ): IDiffResult {
    const source = diagramRepository.getById(sourceDiagramId);
    if (!source) throw new Error(`Source diagram not found: ${sourceDiagramId}`);
    const target = diagramRepository.getById(targetDiagramId);
    if (!target) throw new Error(`Target diagram not found: ${targetDiagramId}`);

    const tableDiffs = compareTables(source.tables, target.tables);
    const migrationDdl = generateMigrationDdl(tableDiffs);
    const rollbackDdl = generateRollbackDdl(tableDiffs);

    return {
      virtualDiagramId: sourceDiagramId,
      realDiagramId: targetDiagramId,
      tableDiffs,
      hasDifferences: tableDiffs.length > 0,
      migrationDdl,
      rollbackDdl,
      comparedAt: new Date().toISOString(),
      mode: 'virtual_vs_virtual',
      sourceName: source.name,
      targetName: target.name,
    };
  },
};
