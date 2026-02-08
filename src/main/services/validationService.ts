import { diagramRepository } from '#/repositories';
import { schemaService } from './schemaService';
import type {
  IValidationReport, IValidationItem, TValidationSeverity,
  ITable, IColumn,
} from '~/shared/types/db';

/** Commonly compatible type mappings (virtual type -> acceptable real types) */
const TYPE_COMPATIBILITY: Record<string, string[]> = {
  'int': ['int', 'int4', 'integer', 'int(11)', 'bigint', 'smallint', 'tinyint', 'mediumint'],
  'integer': ['int', 'int4', 'integer', 'int(11)', 'bigint'],
  'bigint': ['bigint', 'int8', 'bigint(20)'],
  'varchar': ['varchar', 'character varying', 'text'],
  'text': ['text', 'longtext', 'mediumtext', 'varchar'],
  'boolean': ['boolean', 'bool', 'tinyint', 'tinyint(1)'],
  'timestamp': ['timestamp', 'timestamptz', 'datetime'],
  'datetime': ['datetime', 'timestamp', 'timestamptz'],
  'decimal': ['decimal', 'numeric'],
  'float': ['float', 'float4', 'real', 'double'],
  'double': ['double', 'float8', 'double precision'],
  'json': ['json', 'jsonb'],
  'uuid': ['uuid', 'char(36)', 'varchar(36)'],
};

function isTypeCompatible(virtualType: string, realType: string): boolean {
  const vLower = virtualType.toLowerCase().replace(/\(.*\)/, '').trim();
  const rLower = realType.toLowerCase().replace(/\(.*\)/, '').trim();

  if (vLower === rLower) return true;

  const compatible = TYPE_COMPATIBILITY[vLower];
  if (compatible) {
    return compatible.some(t => rLower.startsWith(t));
  }

  return false;
}

function validateTableStructure(
  virtualTable: ITable,
  realTable: ITable | undefined,
  items: IValidationItem[],
): void {
  if (!realTable) {
    items.push({
      severity: 'error',
      category: 'Missing Table',
      tableName: virtualTable.name,
      message: `Table "${virtualTable.name}" exists in virtual diagram but not in the real database.`,
      suggestion: 'Create the table in the target database or remove it from the diagram.',
    });
    return;
  }

  const realColMap = new Map(realTable.columns.map(c => [c.name.toLowerCase(), c]));

  for (const vCol of virtualTable.columns) {
    const rCol = realColMap.get(vCol.name.toLowerCase());

    if (!rCol) {
      items.push({
        severity: 'error',
        category: 'Missing Column',
        tableName: virtualTable.name,
        columnName: vCol.name,
        message: `Column "${vCol.name}" is missing in the real database table.`,
        suggestion: `Add column "${vCol.name}" to table "${virtualTable.name}".`,
      });
      continue;
    }

    // Type compatibility check
    if (!isTypeCompatible(vCol.dataType, rCol.dataType)) {
      items.push({
        severity: 'warning',
        category: 'Type Mismatch',
        tableName: virtualTable.name,
        columnName: vCol.name,
        message: `Type mismatch: virtual="${vCol.dataType}", real="${rCol.dataType}".`,
        suggestion: 'Verify type compatibility and update if needed.',
      });
    }

    // Nullable check
    if (vCol.nullable !== rCol.nullable) {
      items.push({
        severity: 'warning',
        category: 'Nullable Mismatch',
        tableName: virtualTable.name,
        columnName: vCol.name,
        message: `Nullable mismatch: virtual=${vCol.nullable}, real=${rCol.nullable}.`,
        suggestion: 'Align nullable setting between virtual and real schema.',
      });
    }

    // Key type check
    if (vCol.keyType && vCol.keyType !== rCol.keyType) {
      items.push({
        severity: 'warning',
        category: 'Key Mismatch',
        tableName: virtualTable.name,
        columnName: vCol.name,
        message: `Key type mismatch: virtual="${vCol.keyType}", real="${rCol.keyType ?? 'none'}".`,
      });
    }
  }

  // Check extra columns in real table
  const virtualColMap = new Map(virtualTable.columns.map(c => [c.name.toLowerCase(), c]));
  for (const rCol of realTable.columns) {
    if (!virtualColMap.has(rCol.name.toLowerCase())) {
      items.push({
        severity: 'info',
        category: 'Extra Column',
        tableName: virtualTable.name,
        columnName: rCol.name,
        message: `Column "${rCol.name}" exists in real database but not in the virtual diagram.`,
        suggestion: 'Consider adding this column to the virtual diagram if it is needed.',
      });
    }
  }
}

function validateForeignKeyIntegrity(
  virtualTables: ITable[],
  items: IValidationItem[],
): void {
  const tableNameSet = new Set(virtualTables.map(t => t.name.toLowerCase()));

  for (const table of virtualTables) {
    for (const col of table.columns) {
      if (!col.reference) continue;

      const refTable = col.reference.table.toLowerCase();
      if (!tableNameSet.has(refTable)) {
        items.push({
          severity: 'error',
          category: 'FK Integrity',
          tableName: table.name,
          columnName: col.name,
          message: `Foreign key references table "${col.reference.table}" which does not exist in the diagram.`,
          suggestion: 'Add the referenced table to the diagram or remove the foreign key reference.',
        });
      }
    }
  }
}

export const validationService = {
  async validate(
    virtualDiagramId: string,
    connectionId: string,
  ): Promise<IValidationReport> {
    const diagram = diagramRepository.getById(virtualDiagramId);
    if (!diagram) throw new Error(`Diagram not found: ${virtualDiagramId}`);

    const realTables = await schemaService.fetchRealSchema(connectionId);
    const realTableMap = new Map(realTables.map(t => [t.name.toLowerCase(), t]));

    const items: IValidationItem[] = [];

    // Validate each virtual table against real
    for (const vTable of diagram.tables) {
      const rTable = realTableMap.get(vTable.name.toLowerCase());
      validateTableStructure(vTable, rTable, items);
    }

    // Check tables in real but not in virtual
    const virtualTableSet = new Set(diagram.tables.map(t => t.name.toLowerCase()));
    for (const rTable of realTables) {
      if (!virtualTableSet.has(rTable.name.toLowerCase())) {
        items.push({
          severity: 'info',
          category: 'Extra Table',
          tableName: rTable.name,
          message: `Table "${rTable.name}" exists in the real database but not in the virtual diagram.`,
          suggestion: 'Consider adding this table to the diagram if relevant.',
        });
      }
    }

    // FK integrity checks within virtual diagram
    validateForeignKeyIntegrity(diagram.tables, items);

    const errors = items.filter(i => i.severity === 'error').length;
    const warnings = items.filter(i => i.severity === 'warning').length;
    const infos = items.filter(i => i.severity === 'info').length;

    return {
      items,
      summary: { errors, warnings, infos },
      validatedAt: new Date().toISOString(),
    };
  },
};
