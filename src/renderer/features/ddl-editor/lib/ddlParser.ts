import type { ITable, IColumn, IConstraint, TKeyType, IForeignKeyRef } from '@/entities/table';

/**
 * Parse CREATE TABLE DDL statements into ITable[].
 * Supports basic column definitions, PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL, DEFAULT, COMMENT.
 */
export function parseDdl(ddl: string): ITable[] {
  const tables: ITable[] = [];
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*\(([\s\S]*?)\)\s*(?:ENGINE\s*=\s*(\w+))?\s*(?:DEFAULT\s+CHARSET\s*=\s*(\w+))?\s*(?:COMMENT\s*=?\s*'([^']*)')?\s*;/gi;

  let match: RegExpExecArray | null;
  while ((match = createTableRegex.exec(ddl)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const engine = match[3] || undefined;
    const charset = match[4] || undefined;
    const tableComment = match[5] || '';

    const { columns, constraints } = parseTableBody(body, tableName);

    tables.push({
      id: `tbl-${tableName}-${Date.now()}`,
      name: tableName,
      comment: tableComment,
      columns,
      constraints,
      engine,
      charset,
    });
  }

  return tables;
}

function parseTableBody(
  body: string,
  _tableName: string,
): { columns: IColumn[]; constraints: IConstraint[] } {
  const columns: IColumn[] = [];
  const constraints: IConstraint[] = [];

  const lines = splitColumnDefinitions(body);
  let ordinal = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for constraint lines
    if (/^\s*(PRIMARY\s+KEY|UNIQUE|INDEX|KEY|FOREIGN\s+KEY|CONSTRAINT|CHECK)/i.test(trimmed)) {
      const constraint = parseConstraintLine(trimmed);
      if (constraint) constraints.push(constraint);
      continue;
    }

    const column = parseColumnLine(trimmed, ordinal);
    if (column) {
      columns.push(column);
      ordinal++;
    }
  }

  // Apply constraints to columns as keyTypes
  for (const constraint of constraints) {
    if (constraint.type === 'PK') {
      for (const colName of constraint.columns) {
        const col = columns.find((c) => c.name === colName);
        if (col && !col.keyTypes.includes('PK')) col.keyTypes.push('PK');
      }
    }
    if (constraint.type === 'FK' && constraint.reference) {
      const colName = constraint.columns[0];
      const col = columns.find((c) => c.name === colName);
      if (col) {
        if (!col.keyTypes.includes('FK')) col.keyTypes.push('FK');
        col.reference = constraint.reference;
      }
    }
    if (constraint.type === 'UK') {
      for (const colName of constraint.columns) {
        const col = columns.find((c) => c.name === colName);
        if (col && !col.keyTypes.includes('UK')) col.keyTypes.push('UK');
      }
    }
  }

  return { columns, constraints };
}

function splitColumnDefinitions(body: string): string[] {
  const results: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of body) {
    if (char === '(') depth++;
    else if (char === ')') depth--;

    if (char === ',' && depth === 0) {
      results.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) results.push(current);

  return results;
}

function parseColumnLine(line: string, ordinal: number): IColumn | null {
  const colRegex = /^[`"']?(\w+)[`"']?\s+(\w+(?:\([^)]*\))?)/i;
  const match = colRegex.exec(line.trim());
  if (!match) return null;

  const name = match[1];
  const dataType = match[2];
  const upper = line.toUpperCase();

  const nullable = !upper.includes('NOT NULL');
  const keyTypes: TKeyType[] = upper.includes('PRIMARY KEY') ? ['PK'] : [];

  let defaultValue: string | null = null;
  const defaultMatch = /DEFAULT\s+('(?:[^']*)'|"(?:[^"]*)"|[^\s,]+)/i.exec(line);
  if (defaultMatch) {
    defaultValue = defaultMatch[1].replace(/^['"]|['"]$/g, '');
  }

  let comment = '';
  const commentMatch = /COMMENT\s+'([^']*)'/i.exec(line);
  if (commentMatch) {
    comment = commentMatch[1];
  }

  return {
    id: `col-${name}-${Date.now()}-${ordinal}`,
    name,
    dataType,
    keyTypes,
    defaultValue,
    nullable,
    comment,
    reference: null,
    constraints: [],
    ordinalPosition: ordinal,
  };
}

function parseConstraintLine(line: string): IConstraint | null {
  const upper = line.toUpperCase();

  // PRIMARY KEY
  if (upper.includes('PRIMARY KEY')) {
    const colMatch = /PRIMARY\s+KEY\s*\(([^)]+)\)/i.exec(line);
    if (colMatch) {
      const columns = colMatch[1].split(',').map((c) => c.trim().replace(/[`"']/g, ''));
      return { type: 'PK', name: 'PRIMARY', columns };
    }
  }

  // FOREIGN KEY
  if (upper.includes('FOREIGN KEY')) {
    const fkRegex =
      /(?:CONSTRAINT\s+[`"']?(\w+)[`"']?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+[`"']?(\w+)[`"']?\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/i;
    const match = fkRegex.exec(line);
    if (match) {
      const constraintName = match[1] || `fk_${match[2].trim().replace(/[`"']/g, '')}`;
      const columns = match[2].split(',').map((c) => c.trim().replace(/[`"']/g, ''));
      const refTable = match[3];
      const refColumn = match[4].trim().replace(/[`"']/g, '');
      const onDelete = match[5]?.replace(/\s+/g, ' ').toUpperCase() as IForeignKeyRef['onDelete'];
      const onUpdate = match[6]?.replace(/\s+/g, ' ').toUpperCase() as IForeignKeyRef['onUpdate'];

      return {
        type: 'FK',
        name: constraintName,
        columns,
        reference: { table: refTable, column: refColumn, onDelete, onUpdate },
      };
    }
  }

  // UNIQUE
  if (upper.includes('UNIQUE')) {
    const nameMatch = /(?:CONSTRAINT\s+[`"']?(\w+)[`"']?\s+)?UNIQUE\s*(?:KEY|INDEX)?\s*(?:[`"']?\w+[`"']?\s*)?\(([^)]+)\)/i.exec(line);
    if (nameMatch) {
      const columns = nameMatch[2].split(',').map((c) => c.trim().replace(/[`"']/g, ''));
      return {
        type: 'UK',
        name: nameMatch[1] || `uk_${columns.join('_')}`,
        columns,
      };
    }
  }

  // INDEX / KEY
  if (/^\s*(INDEX|KEY)\s/i.test(line)) {
    const idxMatch = /(?:INDEX|KEY)\s+[`"']?(\w+)[`"']?\s*\(([^)]+)\)/i.exec(line);
    if (idxMatch) {
      const columns = idxMatch[2].split(',').map((c) => c.trim().replace(/[`"']/g, ''));
      return { type: 'IDX', name: idxMatch[1], columns };
    }
  }

  return null;
}
