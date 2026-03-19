import type { TConstraintType, IForeignKeyRef } from '~/shared/types/db';
import { quoteIdentifier } from '../model/sqlBuilder';

type TDbType = 'mysql' | 'mariadb' | 'postgresql' | 'sqlite';
type TFkAction = IForeignKeyRef['onDelete'];

const FK_ACTIONS: TFkAction[] = ['CASCADE', 'SET NULL', 'SET DEFAULT', 'RESTRICT', 'NO ACTION'];
export { FK_ACTIONS };

export interface IConstraintDef {
  type: TConstraintType;
  name: string;
  columns: string[];
  reference?: {
    table: string;
    column: string;
    onDelete?: TFkAction;
    onUpdate?: TFkAction;
  };
  checkExpression?: string;
}

function q(name: string, dbType: TDbType): string {
  return quoteIdentifier(name, dbType);
}

// ─── DROP ───

export function buildDropConstraintSql(
  tableName: string,
  constraintName: string,
  constraintType: TConstraintType,
  dbType: TDbType,
): string {
  const tbl = q(tableName, dbType);

  if (dbType === 'sqlite') {
    // SQLite doesn't support DROP CONSTRAINT — requires table rebuild
    throw new Error('SQLite does not support DROP CONSTRAINT. Use table rebuild instead.');
  }

  if ((dbType === 'mysql' || dbType === 'mariadb') && constraintType === 'FK') {
    return `ALTER TABLE ${tbl} DROP FOREIGN KEY ${q(constraintName, dbType)}`;
  }

  if ((dbType === 'mysql' || dbType === 'mariadb') && constraintType === 'IDX') {
    return `DROP INDEX ${q(constraintName, dbType)} ON ${tbl}`;
  }

  if ((dbType === 'mysql' || dbType === 'mariadb') && constraintType === 'PK') {
    return `ALTER TABLE ${tbl} DROP PRIMARY KEY`;
  }

  if (dbType === 'postgresql' && constraintType === 'IDX') {
    return `DROP INDEX ${q(constraintName, dbType)}`;
  }

  // Generic: works for PK, UK, CHECK, NOT_NULL on PG; UK/CHECK on MySQL
  return `ALTER TABLE ${tbl} DROP CONSTRAINT ${q(constraintName, dbType)}`;
}

// ─── ADD ───

export function buildAddConstraintSql(
  tableName: string,
  def: IConstraintDef,
  dbType: TDbType,
): string {
  const tbl = q(tableName, dbType);
  const cols = def.columns.map((c) => q(c, dbType)).join(', ');

  if (dbType === 'sqlite') {
    throw new Error('SQLite does not support ADD CONSTRAINT. Use table rebuild instead.');
  }

  switch (def.type) {
    case 'PK':
      return `ALTER TABLE ${tbl} ADD CONSTRAINT ${q(def.name, dbType)} PRIMARY KEY (${cols})`;

    case 'FK': {
      if (!def.reference) throw new Error('FK constraint requires a reference');
      const ref = def.reference;
      let sql = `ALTER TABLE ${tbl} ADD CONSTRAINT ${q(def.name, dbType)} FOREIGN KEY (${cols}) REFERENCES ${q(ref.table, dbType)} (${q(ref.column, dbType)})`;
      if (ref.onDelete) sql += ` ON DELETE ${ref.onDelete}`;
      if (ref.onUpdate) sql += ` ON UPDATE ${ref.onUpdate}`;
      return sql;
    }

    case 'UK':
      return `ALTER TABLE ${tbl} ADD CONSTRAINT ${q(def.name, dbType)} UNIQUE (${cols})`;

    case 'IDX':
      return `CREATE INDEX ${q(def.name, dbType)} ON ${tbl} (${cols})`;

    case 'CHECK':
      if (!def.checkExpression) throw new Error('CHECK constraint requires an expression');
      return `ALTER TABLE ${tbl} ADD CONSTRAINT ${q(def.name, dbType)} CHECK (${def.checkExpression})`;

    case 'NOT_NULL':
      // NOT NULL is a column-level constraint — use ALTER COLUMN
      if (def.columns.length !== 1) throw new Error('NOT NULL applies to a single column');
      if (dbType === 'postgresql') {
        return `ALTER TABLE ${tbl} ALTER COLUMN ${q(def.columns[0], dbType)} SET NOT NULL`;
      }
      return `ALTER TABLE ${tbl} MODIFY COLUMN ${q(def.columns[0], dbType)} NOT NULL`;

    default:
      throw new Error(`Unsupported constraint type: ${def.type}`);
  }
}

// ─── RENAME ───

export function buildRenameConstraintSql(
  tableName: string,
  oldName: string,
  newName: string,
  constraintType: TConstraintType,
  dbType: TDbType,
): string {
  const tbl = q(tableName, dbType);

  if (dbType === 'sqlite') {
    throw new Error('SQLite does not support RENAME CONSTRAINT.');
  }

  if (dbType === 'postgresql') {
    if (constraintType === 'IDX') {
      return `ALTER INDEX ${q(oldName, dbType)} RENAME TO ${q(newName, dbType)}`;
    }
    return `ALTER TABLE ${tbl} RENAME CONSTRAINT ${q(oldName, dbType)} TO ${q(newName, dbType)}`;
  }

  // MySQL/MariaDB: rename via DROP + ADD is needed for most constraint types
  // Only MySQL 8.0+ supports RENAME KEY for indexes
  if (constraintType === 'IDX') {
    return `ALTER TABLE ${tbl} RENAME INDEX ${q(oldName, dbType)} TO ${q(newName, dbType)}`;
  }

  throw new Error(`MySQL/MariaDB does not support renaming ${constraintType} constraints directly. Use DROP + ADD instead.`);
}

// ─── ALTER COLUMNS (PK, UK, IDX) ───
// Implemented as DROP + ADD with new column list/order

export function buildAlterColumnsSql(
  tableName: string,
  constraintName: string,
  constraintType: TConstraintType,
  newColumns: string[],
  dbType: TDbType,
): string[] {
  return [
    buildDropConstraintSql(tableName, constraintName, constraintType, dbType),
    buildAddConstraintSql(tableName, {
      type: constraintType,
      name: constraintName,
      columns: newColumns,
    }, dbType),
  ];
}

// ─── ALTER FK ACTIONS ───
// Implemented as DROP + ADD

export function buildAlterFkActionsSql(
  tableName: string,
  constraintName: string,
  columns: string[],
  reference: NonNullable<IConstraintDef['reference']>,
  dbType: TDbType,
): string[] {
  return [
    buildDropConstraintSql(tableName, constraintName, 'FK', dbType),
    buildAddConstraintSql(tableName, {
      type: 'FK',
      name: constraintName,
      columns,
      reference,
    }, dbType),
  ];
}

// ─── ALTER CHECK EXPRESSION ───
// Implemented as DROP + ADD

export function buildAlterCheckSql(
  tableName: string,
  constraintName: string,
  newExpression: string,
  dbType: TDbType,
): string[] {
  return [
    buildDropConstraintSql(tableName, constraintName, 'CHECK', dbType),
    buildAddConstraintSql(tableName, {
      type: 'CHECK',
      name: constraintName,
      columns: [],
      checkExpression: newExpression,
    }, dbType),
  ];
}

// ─── VALIDATION QUERIES ───
// Pre-check queries that find data violations before applying constraints.
// Each returns { countSql, sampleSql, guidance }.

export interface IValidationQuery {
  /** SQL that returns a single row with `violation_count` column */
  countSql: string;
  /** SQL that returns sample violating rows (LIMIT 5) */
  sampleSql: string;
  /** Human-readable guidance on how to fix the data */
  guidance: string;
}

export function buildValidationQuery(
  tableName: string,
  def: IConstraintDef,
  dbType: TDbType,
): IValidationQuery | null {
  const tbl = q(tableName, dbType);

  switch (def.type) {
    case 'NOT_NULL': {
      if (def.columns.length !== 1) return null;
      const col = q(def.columns[0], dbType);
      return {
        countSql: `SELECT COUNT(*) AS violation_count FROM ${tbl} WHERE ${col} IS NULL`,
        sampleSql: `SELECT * FROM ${tbl} WHERE ${col} IS NULL LIMIT 5`,
        guidance: `Column "${def.columns[0]}" has NULL values. To add NOT NULL, either:\n• UPDATE ${tbl} SET ${col} = <default_value> WHERE ${col} IS NULL\n• DELETE rows where ${col} IS NULL`,
      };
    }

    case 'UK':
    case 'PK': {
      if (def.columns.length === 0) return null;
      const cols = def.columns.map((c) => q(c, dbType)).join(', ');
      const label = def.type === 'PK' ? 'PRIMARY KEY' : 'UNIQUE';
      return {
        countSql: `SELECT COUNT(*) AS violation_count FROM (SELECT ${cols}, COUNT(*) AS cnt FROM ${tbl} GROUP BY ${cols} HAVING COUNT(*) > 1) AS dups`,
        sampleSql: `SELECT ${cols}, COUNT(*) AS dup_count FROM ${tbl} GROUP BY ${cols} HAVING COUNT(*) > 1 LIMIT 5`,
        guidance: `Duplicate values exist in (${def.columns.join(', ')}). To add ${label}, either:\n• DELETE duplicate rows\n• UPDATE rows to make values unique`,
      };
    }

    case 'FK': {
      if (!def.reference || def.columns.length === 0) return null;
      const col = q(def.columns[0], dbType);
      const refTbl = q(def.reference.table, dbType);
      const refCol = q(def.reference.column, dbType);
      return {
        countSql: `SELECT COUNT(*) AS violation_count FROM ${tbl} t LEFT JOIN ${refTbl} r ON t.${col} = r.${refCol} WHERE r.${refCol} IS NULL AND t.${col} IS NOT NULL`,
        sampleSql: `SELECT t.* FROM ${tbl} t LEFT JOIN ${refTbl} r ON t.${col} = r.${refCol} WHERE r.${refCol} IS NULL AND t.${col} IS NOT NULL LIMIT 5`,
        guidance: `Column "${def.columns[0]}" has values that don't exist in ${def.reference.table}.${def.reference.column}. To add FK, either:\n• DELETE or UPDATE rows with orphaned references\n• INSERT missing reference rows into ${def.reference.table}`,
      };
    }

    case 'CHECK': {
      if (!def.checkExpression) return null;
      return {
        countSql: `SELECT COUNT(*) AS violation_count FROM ${tbl} WHERE NOT (${def.checkExpression})`,
        sampleSql: `SELECT * FROM ${tbl} WHERE NOT (${def.checkExpression}) LIMIT 5`,
        guidance: `Rows exist that violate CHECK (${def.checkExpression}). To add this constraint, either:\n• UPDATE violating rows to satisfy the expression\n• DELETE violating rows`,
      };
    }

    default:
      return null;
  }
}

// ─── ROLLBACK SQL ───
// Generate SQL to restore original constraint after a failed DROP+ADD.

export function buildRestoreConstraintSql(
  tableName: string,
  constraint: { type: TConstraintType; name: string; columns: unknown; reference?: { table: string; column: string; onDelete?: TFkAction; onUpdate?: TFkAction }; checkExpression?: string },
  dbType: TDbType,
): string | null {
  const cols = Array.isArray(constraint.columns) ? constraint.columns : [String(constraint.columns)];
  try {
    return buildAddConstraintSql(tableName, {
      type: constraint.type,
      name: constraint.name,
      columns: cols,
      reference: constraint.reference,
      checkExpression: constraint.checkExpression,
    }, dbType);
  } catch {
    return null;
  }
}

// ─── DROP NOT NULL ───

export function buildDropNotNullSql(
  tableName: string,
  columnName: string,
  dbType: TDbType,
): string {
  const tbl = q(tableName, dbType);
  if (dbType === 'sqlite') {
    throw new Error('SQLite does not support DROP NOT NULL.');
  }
  if (dbType === 'postgresql') {
    return `ALTER TABLE ${tbl} ALTER COLUMN ${q(columnName, dbType)} DROP NOT NULL`;
  }
  return `ALTER TABLE ${tbl} MODIFY COLUMN ${q(columnName, dbType)} NULL`;
}
