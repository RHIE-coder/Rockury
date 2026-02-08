import { diagramRepository } from '#/repositories';
import type { IMockResult, IMockTableData, ITable, IColumn } from '~/shared/types/db';

function generateMockValue(column: IColumn, rowIndex: number): unknown {
  const typeLower = column.dataType.toLowerCase().replace(/\(.*\)/, '').trim();

  // If it has a FK reference, generate a plausible reference ID
  if (column.reference) {
    return rowIndex + 1;
  }

  switch (typeLower) {
    case 'int':
    case 'integer':
    case 'int4':
    case 'bigint':
    case 'int8':
    case 'smallint':
    case 'tinyint':
    case 'mediumint':
      return column.keyType === 'PK' ? rowIndex + 1 : Math.floor(Math.random() * 10000);

    case 'float':
    case 'float4':
    case 'double':
    case 'float8':
    case 'real':
    case 'decimal':
    case 'numeric':
      return Math.round(Math.random() * 10000) / 100;

    case 'boolean':
    case 'bool':
      return Math.random() > 0.5;

    case 'varchar':
    case 'character varying':
    case 'text':
    case 'longtext':
    case 'mediumtext':
    case 'char':
      return `${column.name}_${rowIndex + 1}`;

    case 'date':
      return new Date(2024, 0, 1 + rowIndex).toISOString().split('T')[0];

    case 'datetime':
    case 'timestamp':
    case 'timestamptz':
      return new Date(2024, 0, 1 + rowIndex, 12, 0, 0).toISOString();

    case 'json':
    case 'jsonb':
      return JSON.stringify({ key: `value_${rowIndex + 1}` });

    case 'uuid':
      return crypto.randomUUID();

    default:
      return `mock_${rowIndex + 1}`;
  }
}

function generateTableMockData(
  table: ITable,
  rowCount: number,
): IMockTableData {
  const columns = table.columns.map(c => c.name);
  const rows: Record<string, unknown>[] = [];

  for (let i = 0; i < rowCount; i++) {
    const row: Record<string, unknown> = {};
    for (const col of table.columns) {
      if (col.nullable && Math.random() < 0.1) {
        row[col.name] = null;
      } else {
        row[col.name] = generateMockValue(col, i);
      }
    }
    rows.push(row);
  }

  return { tableName: table.name, columns, rows };
}

function escapeValue(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

function toSql(mockResult: IMockResult): string {
  const lines: string[] = [];

  for (const table of mockResult.tables) {
    if (table.rows.length === 0) continue;

    const colList = table.columns.join(', ');
    for (const row of table.rows) {
      const values = table.columns.map(col => escapeValue(row[col])).join(', ');
      lines.push(`INSERT INTO ${table.tableName} (${colList}) VALUES (${values});`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function toCsv(mockResult: IMockResult): string {
  const parts: string[] = [];

  for (const table of mockResult.tables) {
    parts.push(`# Table: ${table.tableName}`);
    parts.push(table.columns.join(','));
    for (const row of table.rows) {
      const values = table.columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      parts.push(values.join(','));
    }
    parts.push('');
  }

  return parts.join('\n');
}

function toJson(mockResult: IMockResult): string {
  const output: Record<string, Record<string, unknown>[]> = {};
  for (const table of mockResult.tables) {
    output[table.tableName] = table.rows;
  }
  return JSON.stringify(output, null, 2);
}

export const mockingService = {
  generate(
    tableIds: string[],
    diagramId: string,
    rowCount: number,
  ): IMockResult {
    const diagram = diagramRepository.getById(diagramId);
    if (!diagram) throw new Error(`Diagram not found: ${diagramId}`);

    const tableIdSet = new Set(tableIds);
    const targetTables = diagram.tables.filter(t => tableIdSet.has(t.id));

    if (targetTables.length === 0) {
      throw new Error('No matching tables found for the provided table IDs.');
    }

    const tables: IMockTableData[] = targetTables.map(t =>
      generateTableMockData(t, rowCount),
    );

    return {
      tables,
      generatedAt: new Date().toISOString(),
    };
  },

  exportMock(
    mockResult: IMockResult,
    format: 'sql' | 'csv' | 'json',
  ): string {
    switch (format) {
      case 'sql': return toSql(mockResult);
      case 'csv': return toCsv(mockResult);
      case 'json': return toJson(mockResult);
      default: throw new Error(`Unsupported export format: ${format}`);
    }
  },
};
