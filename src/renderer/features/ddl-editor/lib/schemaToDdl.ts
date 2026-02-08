import type { ITable, IColumn, IConstraint } from '@/entities/table';
import type { TDbType } from '@/entities/connection';

/**
 * Convert ITable[] to CREATE TABLE DDL string.
 * Supports mysql and postgresql syntax differences.
 */
export function schemaToDdl(tables: ITable[], dbType: TDbType = 'mysql'): string {
  return tables.map((table) => tableToCreateDdl(table, dbType)).join('\n\n');
}

function quote(name: string, dbType: TDbType): string {
  return dbType === 'postgresql' ? `"${name}"` : `\`${name}\``;
}

function tableToCreateDdl(table: ITable, dbType: TDbType): string {
  const lines: string[] = [];
  const q = (name: string) => quote(name, dbType);

  // Column definitions
  for (const col of table.columns) {
    lines.push(`  ${columnToDdl(col, dbType)}`);
  }

  // Constraints
  const pkColumns = table.columns.filter((c) => c.keyType === 'PK');
  if (pkColumns.length > 0) {
    lines.push(`  PRIMARY KEY (${pkColumns.map((c) => q(c.name)).join(', ')})`);
  }

  for (const constraint of table.constraints) {
    const constraintDdl = constraintToDdl(constraint, dbType);
    if (constraintDdl) lines.push(`  ${constraintDdl}`);
  }

  // FK from column references
  for (const col of table.columns) {
    if (col.keyType === 'FK' && col.reference) {
      const fkName = `fk_${table.name}_${col.name}`;
      let fkDdl = `CONSTRAINT ${q(fkName)} FOREIGN KEY (${q(col.name)}) REFERENCES ${q(col.reference.table)} (${q(col.reference.column)})`;
      if (col.reference.onDelete) fkDdl += ` ON DELETE ${col.reference.onDelete}`;
      if (col.reference.onUpdate) fkDdl += ` ON UPDATE ${col.reference.onUpdate}`;
      lines.push(`  ${fkDdl}`);
    }
  }

  let ddl = `CREATE TABLE ${q(table.name)} (\n${lines.join(',\n')}\n)`;

  if (dbType === 'mysql' || dbType === 'mariadb') {
    if (table.engine) ddl += ` ENGINE=${table.engine}`;
    if (table.charset) ddl += ` DEFAULT CHARSET=${table.charset}`;
  }

  if (table.comment) {
    if (dbType === 'postgresql') {
      ddl += `;\n\nCOMMENT ON TABLE ${q(table.name)} IS '${escapeStr(table.comment)}'`;
    } else {
      ddl += ` COMMENT='${escapeStr(table.comment)}'`;
    }
  }

  return ddl + ';';
}

function columnToDdl(col: IColumn, dbType: TDbType): string {
  const q = (name: string) => quote(name, dbType);
  const parts: string[] = [q(col.name), col.dataType];

  if (!col.nullable) parts.push('NOT NULL');

  if (col.defaultValue !== null && col.defaultValue !== undefined) {
    parts.push(`DEFAULT ${quoteDefault(col.defaultValue)}`);
  }

  if (dbType !== 'postgresql' && col.comment) {
    parts.push(`COMMENT '${escapeStr(col.comment)}'`);
  }

  return parts.join(' ');
}

function constraintToDdl(constraint: IConstraint, dbType: TDbType): string | null {
  const q = (name: string) => quote(name, dbType);
  const cols = constraint.columns.map((c) => q(c)).join(', ');

  switch (constraint.type) {
    case 'UK':
      return `CONSTRAINT ${q(constraint.name)} UNIQUE (${cols})`;
    case 'IDX':
      return null; // INDEX is a separate statement, skip inline
    case 'CHECK':
      return constraint.checkExpression
        ? `CONSTRAINT ${q(constraint.name)} CHECK (${constraint.checkExpression})`
        : null;
    default:
      return null;
  }
}

function quoteDefault(value: string): string {
  if (/^\d+(\.\d+)?$/.test(value)) return value;
  if (value.toUpperCase() === 'NULL') return 'NULL';
  if (value.toUpperCase() === 'CURRENT_TIMESTAMP') return 'CURRENT_TIMESTAMP';
  return `'${escapeStr(value)}'`;
}

function escapeStr(value: string): string {
  return value.replace(/'/g, "''");
}
