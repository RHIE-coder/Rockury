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
    // Load virtual diagram
    const diagram = diagramRepository.getById(virtualDiagramId);
    if (!diagram) throw new Error(`Diagram not found: ${virtualDiagramId}`);

    // Fetch real schema
    const realTables = await schemaService.fetchRealSchema(connectionId);

    // Compare
    const virtualTableMap = new Map(diagram.tables.map(t => [t.name.toLowerCase(), t]));
    const realTableMap = new Map(realTables.map(t => [t.name.toLowerCase(), t]));

    const tableDiffs: ITableDiff[] = [];

    // Tables added in virtual (not in real)
    for (const vt of diagram.tables) {
      const key = vt.name.toLowerCase();
      if (!realTableMap.has(key)) {
        tableDiffs.push({
          tableName: vt.name,
          action: 'added',
          columnDiffs: vt.columns.map(c => ({
            columnName: c.name,
            action: 'added' as TDiffAction,
            virtualValue: c,
          })),
          constraintDiffs: vt.constraints.map(c => ({
            constraintName: c.name,
            action: 'added' as TDiffAction,
            virtualValue: c,
          })),
        });
      }
    }

    // Tables removed from virtual (in real, not in virtual)
    for (const rt of realTables) {
      const key = rt.name.toLowerCase();
      if (!virtualTableMap.has(key)) {
        tableDiffs.push({
          tableName: rt.name,
          action: 'removed',
          columnDiffs: rt.columns.map(c => ({
            columnName: c.name,
            action: 'removed' as TDiffAction,
            realValue: c,
          })),
          constraintDiffs: rt.constraints.map(c => ({
            constraintName: c.name,
            action: 'removed' as TDiffAction,
            realValue: c,
          })),
        });
      }
    }

    // Tables in both - compare columns and constraints
    for (const vt of diagram.tables) {
      const key = vt.name.toLowerCase();
      const rt = realTableMap.get(key);
      if (!rt) continue;

      const columnDiffs = compareColumns(vt.columns, rt.columns);
      const constraintDiffs = compareConstraints(vt.constraints, rt.constraints);

      if (columnDiffs.length > 0 || constraintDiffs.length > 0) {
        tableDiffs.push({
          tableName: vt.name,
          action: 'modified',
          columnDiffs,
          constraintDiffs,
        });
      }
    }

    const migrationDdl = generateMigrationDdl(tableDiffs);

    return {
      virtualDiagramId,
      realDiagramId: connectionId,
      tableDiffs,
      hasDifferences: tableDiffs.length > 0,
      migrationDdl,
      comparedAt: new Date().toISOString(),
    };
  },
};
