import { connectionService } from './connectionService';
import { createMysqlConnection, closeMysqlConnection } from '#/infrastructure';
import { createPgConnection, closePgConnection } from '#/infrastructure';
import { createSqliteConnection, closeSqliteConnection } from '#/infrastructure';
import type { ITable, IColumn, IConstraint, IForeignKeyRef, TKeyType, TDbType } from '~/shared/types/db';

interface MysqlColumnRow {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  ORDINAL_POSITION: number;
  COLUMN_DEFAULT: string | null;
  IS_NULLABLE: string;
  DATA_TYPE: string;
  COLUMN_TYPE: string;
  COLUMN_KEY: string;
  COLUMN_COMMENT: string;
  EXTRA: string;
  GENERATION_EXPRESSION: string | null;
}

interface MysqlIndexRow {
  TABLE_NAME: string;
  INDEX_NAME: string;
  COLUMN_NAME: string;
  SEQ_IN_INDEX: number;
  NON_UNIQUE: number;
}

interface MysqlConstraintRow {
  TABLE_NAME: string;
  CONSTRAINT_NAME: string;
  CONSTRAINT_TYPE: string;
  COLUMN_NAME: string;
  REFERENCED_TABLE_NAME: string | null;
  REFERENCED_COLUMN_NAME: string | null;
  UPDATE_RULE: string | null;
  DELETE_RULE: string | null;
  CONSTRAINT_ORDINAL: number;
  REFERENCED_ORDINAL: number;
}

interface PgColumnRow {
  table_name: string;
  column_name: string;
  ordinal_position: number;
  column_default: string | null;
  is_nullable: string;
  data_type: string;
  udt_name: string;
  is_identity: string;
}

interface PgCheckRow {
  table_name: string;
  constraint_name: string;
  check_expression: string;
  column_names: string[];
}

interface PgConstraintRow {
  table_name: string;
  constraint_name: string;
  constraint_type: string;
  column_name: string;
  foreign_table_name: string | null;
  foreign_column_name: string | null;
  update_rule: string | null;
  delete_rule: string | null;
}

interface PgCommentRow {
  table_name: string;
  column_name: string | null;
  description: string | null;
}

function resolveKeyType(constraintType: string): TKeyType | null {
  switch (constraintType) {
    case 'PRIMARY KEY': return 'PK';
    case 'UNIQUE': return 'UK';
    case 'FOREIGN KEY': return 'FK';
    default: return null;
  }
}

function resolveRefAction(action: string | null): 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | undefined {
  if (!action) return undefined;
  const upper = action.toUpperCase();
  if (upper === 'CASCADE') return 'CASCADE';
  if (upper === 'SET NULL') return 'SET NULL';
  if (upper === 'RESTRICT') return 'RESTRICT';
  if (upper === 'NO ACTION') return 'NO ACTION';
  return undefined;
}

async function fetchMysqlSchema(connectionId: string): Promise<ITable[]> {
  const config = connectionService.getConnectionConfig(connectionId);
  const conn = await createMysqlConnection({
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
    password: config.password,
    sslEnabled: config.sslEnabled,
    sslConfig: config.sslConfig,
  });

  try {
    // Fetch columns
    const [columnRows] = await conn.query(
      `SELECT c.TABLE_NAME, c.COLUMN_NAME, c.ORDINAL_POSITION, c.COLUMN_DEFAULT,
              c.IS_NULLABLE, c.DATA_TYPE, c.COLUMN_TYPE, c.COLUMN_KEY, c.COLUMN_COMMENT, c.EXTRA,
              c.GENERATION_EXPRESSION
       FROM information_schema.COLUMNS c
       WHERE c.TABLE_SCHEMA = ?
       ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION`,
      [config.database],
    );

    // Fetch constraints with references
    const [constraintRows] = await conn.query(
      `SELECT tc.TABLE_NAME, tc.CONSTRAINT_NAME, tc.CONSTRAINT_TYPE,
              kcu.COLUMN_NAME, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME,
              rc.UPDATE_RULE, rc.DELETE_RULE,
              kcu.ORDINAL_POSITION AS CONSTRAINT_ORDINAL,
              COALESCE(kcu.POSITION_IN_UNIQUE_CONSTRAINT, kcu.ORDINAL_POSITION) AS REFERENCED_ORDINAL
       FROM information_schema.TABLE_CONSTRAINTS tc
       JOIN information_schema.KEY_COLUMN_USAGE kcu
         ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND tc.TABLE_NAME = kcu.TABLE_NAME
       LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
         ON tc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
       WHERE tc.TABLE_SCHEMA = ?
       ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_NAME, CONSTRAINT_ORDINAL`,
      [config.database],
    );

    // Fetch CHECK constraints (MySQL 8.0.16+ / MariaDB 10.2+)
    let checkRows: { TABLE_NAME: string; CONSTRAINT_NAME: string; CHECK_CLAUSE: string }[] = [];
    try {
      const [rows] = await conn.query(
        `SELECT cc.CONSTRAINT_NAME, tc.TABLE_NAME, cc.CHECK_CLAUSE
         FROM information_schema.CHECK_CONSTRAINTS cc
         JOIN information_schema.TABLE_CONSTRAINTS tc
           ON cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME AND cc.CONSTRAINT_SCHEMA = tc.TABLE_SCHEMA
         WHERE cc.CONSTRAINT_SCHEMA = ? AND tc.CONSTRAINT_TYPE = 'CHECK'`,
        [config.database],
      );
      checkRows = rows as typeof checkRows;
    } catch {
      // CHECK_CONSTRAINTS not available (older MySQL/MariaDB)
    }

    // Fetch non-constraint indexes (regular indexes, not PK/FK/UNIQUE)
    const [indexRows] = await conn.query(
      `SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX, NON_UNIQUE
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ?
         AND INDEX_NAME != 'PRIMARY'
       ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
      [config.database],
    );

    // Fetch view names to distinguish from regular tables
    const [viewRows] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'VIEW'`,
      [config.database],
    );
    const viewNames = new Set((viewRows as { TABLE_NAME: string }[]).map((r) => r.TABLE_NAME));

    return buildTablesFromMysql(
      columnRows as MysqlColumnRow[],
      constraintRows as MysqlConstraintRow[],
      checkRows,
      indexRows as MysqlIndexRow[],
      viewNames,
    );
  } finally {
    await closeMysqlConnection(conn);
  }
}

function buildTablesFromMysql(
  columnRows: MysqlColumnRow[],
  constraintRows: MysqlConstraintRow[],
  checkRows: { TABLE_NAME: string; CONSTRAINT_NAME: string; CHECK_CLAUSE: string }[] = [],
  indexRows: MysqlIndexRow[] = [],
  viewNames: Set<string> = new Set(),
): ITable[] {
  const tableMap = new Map<string, { columns: IColumn[]; constraints: IConstraint[] }>();

  // Build constraint lookup: tableName -> columnName -> constraints
  const constraintMap = new Map<string, Map<string, MysqlConstraintRow[]>>();
  for (const row of constraintRows) {
    if (!constraintMap.has(row.TABLE_NAME)) constraintMap.set(row.TABLE_NAME, new Map());
    const tbl = constraintMap.get(row.TABLE_NAME)!;
    if (!tbl.has(row.COLUMN_NAME)) tbl.set(row.COLUMN_NAME, []);
    tbl.get(row.COLUMN_NAME)!.push(row);
  }

  // Build columns per table
  for (const row of columnRows) {
    if (!tableMap.has(row.TABLE_NAME)) {
      tableMap.set(row.TABLE_NAME, { columns: [], constraints: [] });
    }
    const entry = tableMap.get(row.TABLE_NAME)!;

    // Determine key types from constraint rows
    const colConstraints = constraintMap.get(row.TABLE_NAME)?.get(row.COLUMN_NAME) ?? [];
    const keyTypes: TKeyType[] = [];
    let reference: IForeignKeyRef | null = null;

    for (const c of colConstraints) {
      const resolved = resolveKeyType(c.CONSTRAINT_TYPE);
      if (resolved === 'PK' && !keyTypes.includes('PK')) { keyTypes.push('PK'); }
      else if (resolved === 'FK') {
        if (!keyTypes.includes('FK')) keyTypes.push('FK');
        reference = {
          table: c.REFERENCED_TABLE_NAME!,
          column: c.REFERENCED_COLUMN_NAME ?? c.COLUMN_NAME,
          onDelete: resolveRefAction(c.DELETE_RULE),
          onUpdate: resolveRefAction(c.UPDATE_RULE),
        };
      } else if (resolved === 'UK' && !keyTypes.includes('UK')) {
        keyTypes.push('UK');
      }
    }

    const isGenerated = row.EXTRA?.toLowerCase().includes('generated') ?? false;

    // MariaDB stores JSON as longtext; use DATA_TYPE to detect and show 'json' instead
    let dataType = row.COLUMN_TYPE;
    if (row.DATA_TYPE === 'longtext' && row.COLUMN_TYPE === 'longtext') {
      // Check if MariaDB JSON alias: json_valid CHECK is auto-added
      const hasJsonCheck = checkRows.some(
        (cr) => cr.TABLE_NAME === row.TABLE_NAME && cr.CHECK_CLAUSE.toLowerCase().includes(`json_valid`) && cr.CHECK_CLAUSE.includes(row.COLUMN_NAME),
      );
      if (hasJsonCheck) dataType = 'json';
    }

    const column: IColumn = {
      id: crypto.randomUUID(),
      name: row.COLUMN_NAME,
      dataType,
      keyTypes,
      isAutoIncrement: row.EXTRA?.toLowerCase().includes('auto_increment'),
      isGenerated,
      generationExpression: isGenerated ? (row.GENERATION_EXPRESSION ?? undefined) : undefined,
      defaultValue: row.COLUMN_DEFAULT,
      nullable: row.IS_NULLABLE === 'YES',
      comment: row.COLUMN_COMMENT ?? '',
      reference,
      constraints: [],
      ordinalPosition: row.ORDINAL_POSITION,
    };

    entry.columns.push(column);
  }

  // Build table-level constraints
  const constraintGroupMap = new Map<string, Map<string, MysqlConstraintRow[]>>();
  for (const row of constraintRows) {
    if (!constraintGroupMap.has(row.TABLE_NAME)) constraintGroupMap.set(row.TABLE_NAME, new Map());
    const tbl = constraintGroupMap.get(row.TABLE_NAME)!;
    if (!tbl.has(row.CONSTRAINT_NAME)) tbl.set(row.CONSTRAINT_NAME, []);
    tbl.get(row.CONSTRAINT_NAME)!.push(row);
  }

  for (const [tableName, entry] of tableMap) {
    const tableConstraints = constraintGroupMap.get(tableName);
    if (!tableConstraints) continue;

    for (const [constraintName, rows] of tableConstraints) {
      const rowsByConstraintOrder = [...rows].sort(
        (a, b) => (a.CONSTRAINT_ORDINAL ?? 0) - (b.CONSTRAINT_ORDINAL ?? 0),
      );
      const first = rowsByConstraintOrder[0];
      const constraint: IConstraint = {
        type: resolveKeyType(first.CONSTRAINT_TYPE) ?? 'IDX',
        name: constraintName,
        columns: rowsByConstraintOrder.map(r => r.COLUMN_NAME),
      };

      if (first.CONSTRAINT_TYPE === 'FOREIGN KEY' && first.REFERENCED_TABLE_NAME) {
        constraint.reference = {
          table: first.REFERENCED_TABLE_NAME,
          // Keep referenced column order aligned with source FK column order.
          column: rowsByConstraintOrder
            .map((r) => r.REFERENCED_COLUMN_NAME ?? r.COLUMN_NAME)
            .filter((name): name is string => Boolean(name))
            .join(', '),
          onDelete: resolveRefAction(first.DELETE_RULE),
          onUpdate: resolveRefAction(first.UPDATE_RULE),
        };
      }

      entry.constraints.push(constraint);
    }
  }

  // Add CHECK constraints
  for (const row of checkRows) {
    const entry = tableMap.get(row.TABLE_NAME);
    if (!entry) continue;
    // MySQL CHECK expressions use backtick-quoted column names (e.g. `price` >= 0)
    // Use word boundary regex for unquoted fallback to avoid false positives
    // (e.g., "id" matching inside "json_valid")
    const referencedCols = entry.columns
      .filter((c) => {
        if (row.CHECK_CLAUSE.includes(`\`${c.name}\``)) return true;
        const escaped = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`\\b${escaped}\\b`).test(row.CHECK_CLAUSE);
      })
      .map((c) => c.name);
    entry.constraints.push({
      type: 'CHECK',
      name: row.CONSTRAINT_NAME,
      columns: referencedCols,
      checkExpression: row.CHECK_CLAUSE,
    });
    // Mark columns with CHECK constraint
    for (const col of entry.columns) {
      if (referencedCols.includes(col.name) && !col.constraints.some((c) => c.type === 'CHECK')) {
        col.constraints.push({ type: 'CHECK', name: row.CONSTRAINT_NAME, columns: [col.name], checkExpression: row.CHECK_CLAUSE });
      }
    }
  }

  // Add non-constraint indexes (IDX)
  console.log('[schemaService] indexRows count:', indexRows.length);
  const idxGroupMap = new Map<string, Map<string, MysqlIndexRow[]>>();
  for (const row of indexRows) {
    if (!idxGroupMap.has(row.TABLE_NAME)) idxGroupMap.set(row.TABLE_NAME, new Map());
    const tbl = idxGroupMap.get(row.TABLE_NAME)!;
    if (!tbl.has(row.INDEX_NAME)) tbl.set(row.INDEX_NAME, []);
    tbl.get(row.INDEX_NAME)!.push(row);
  }
  // Collect constraint names to skip (PK, FK, UK are already tracked)
  const constraintNames = new Set(constraintRows.map((r) => r.CONSTRAINT_NAME));
  console.log('[schemaService] constraintNames:', [...constraintNames]);
  for (const [tableName, idxMap] of idxGroupMap) {
    const entry = tableMap.get(tableName);
    if (!entry) continue;
    for (const [indexName, rows] of idxMap) {
      // Skip if this index is already a constraint (PK, FK, UNIQUE)
      if (constraintNames.has(indexName)) {
        console.log(`[schemaService] IDX skip (constraint): ${tableName}.${indexName}`);
        continue;
      }
      // Skip unique indexes — they're already captured as UK constraints
      // mysql2 may return NON_UNIQUE as string/BigInt, so use Number()
      if (Number(rows[0].NON_UNIQUE) === 0) {
        console.log(`[schemaService] IDX skip (unique): ${tableName}.${indexName}, NON_UNIQUE=${rows[0].NON_UNIQUE} (type: ${typeof rows[0].NON_UNIQUE})`);
        continue;
      }
      console.log(`[schemaService] IDX add: ${tableName}.${indexName}, cols=${rows.map(r => r.COLUMN_NAME).join(',')}`);
      const sortedRows = [...rows].sort((a, b) => a.SEQ_IN_INDEX - b.SEQ_IN_INDEX);
      const colNames = sortedRows.map((r) => r.COLUMN_NAME);
      entry.constraints.push({ type: 'IDX', name: indexName, columns: colNames });
      // Mark columns with IDX keyType
      for (const colName of colNames) {
        const col = entry.columns.find((c) => c.name === colName);
        if (col && !col.keyTypes.includes('IDX')) {
          col.keyTypes.push('IDX');
        }
      }
    }
  }

  // Build final ITable array
  const tables: ITable[] = [];
  for (const [tableName, entry] of tableMap) {
    tables.push({
      id: crypto.randomUUID(),
      name: tableName,
      comment: '',
      columns: entry.columns,
      constraints: entry.constraints,
      isView: viewNames.has(tableName),
    });
  }

  return tables;
}

async function fetchPgSchema(connectionId: string): Promise<ITable[]> {
  const config = connectionService.getConnectionConfig(connectionId);
  const client = await createPgConnection({
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
    password: config.password,
    sslEnabled: config.sslEnabled,
    sslConfig: config.sslConfig,
  });

  try {
    // Fetch columns
    const columnResult = await client.query<PgColumnRow>(
      `SELECT c.table_name, c.column_name, c.ordinal_position, c.column_default,
              c.is_nullable, c.data_type, c.udt_name, c.is_identity
       FROM information_schema.columns c
       WHERE c.table_schema = 'public'
       ORDER BY c.table_name, c.ordinal_position`,
    );

    // Fetch constraints
    const constraintResult = await client.query<PgConstraintRow>(
      `SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
              kcu.column_name,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name,
              rc.update_rule, rc.delete_rule
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       LEFT JOIN information_schema.constraint_column_usage ccu
         ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
       LEFT JOIN information_schema.referential_constraints rc
         ON tc.constraint_name = rc.constraint_name AND tc.constraint_schema = rc.constraint_schema
       WHERE tc.table_schema = 'public'
       ORDER BY tc.table_name, tc.constraint_name`,
    );

    // Fetch non-constraint indexes
    const indexResult = await client.query<{ table_name: string; index_name: string; column_name: string; is_unique: boolean }>(
      `SELECT
         t.relname AS table_name,
         i.relname AS index_name,
         a.attname AS column_name,
         ix.indisunique AS is_unique
       FROM pg_index ix
       JOIN pg_class t ON t.oid = ix.indrelid
       JOIN pg_class i ON i.oid = ix.indexrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       JOIN unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ord) ON TRUE
       JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
       WHERE n.nspname = 'public'
         AND NOT ix.indisprimary
         AND NOT EXISTS (
           SELECT 1 FROM pg_constraint c
           WHERE c.conindid = ix.indexrelid
         )
       ORDER BY t.relname, i.relname, k.ord`,
    );

    // Fetch CHECK constraints
    const checkResult = await client.query<PgCheckRow>(
      `SELECT
         c.relname AS table_name,
         con.conname AS constraint_name,
         pg_get_constraintdef(con.oid) AS check_expression,
         ARRAY(
           SELECT a.attname
           FROM unnest(con.conkey) AS k(col)
           JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.col
         ) AS column_names
       FROM pg_constraint con
       JOIN pg_class c ON c.oid = con.conrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND con.contype = 'c'
       ORDER BY c.relname, con.conname`,
    );

    // Fetch comments (include views: relkind IN ('r','v','m'))
    const commentResult = await client.query<PgCommentRow>(
      `SELECT
         c.relname AS table_name,
         a.attname AS column_name,
         d.description
       FROM pg_catalog.pg_class c
       LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0
       LEFT JOIN pg_catalog.pg_description d ON d.objoid = c.oid AND d.objsubid = a.attnum
       LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm')
       ORDER BY c.relname, a.attnum`,
    );

    // Fetch view/materialized view names
    const viewResult = await client.query<{ table_name: string; relkind: string }>(
      `SELECT c.relname AS table_name, c.relkind
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')`,
    );
    const viewMap = new Map<string, 'v' | 'm'>();
    for (const row of viewResult.rows) {
      viewMap.set(row.table_name, row.relkind as 'v' | 'm');
    }

    return buildTablesFromPg(
      columnResult.rows,
      constraintResult.rows,
      commentResult.rows,
      checkResult.rows,
      indexResult.rows,
      viewMap,
    );
  } finally {
    await closePgConnection(client);
  }
}

function buildTablesFromPg(
  columnRows: PgColumnRow[],
  constraintRows: PgConstraintRow[],
  commentRows: PgCommentRow[],
  checkRows: PgCheckRow[] = [],
  indexRows: { table_name: string; index_name: string; column_name: string; is_unique: boolean }[] = [],
  viewMap: Map<string, 'v' | 'm'> = new Map(),
): ITable[] {
  const tableMap = new Map<string, { columns: IColumn[]; constraints: IConstraint[] }>();

  // Build comment lookup
  const commentMap = new Map<string, Map<string | null, string>>();
  for (const row of commentRows) {
    if (!commentMap.has(row.table_name)) commentMap.set(row.table_name, new Map());
    if (row.description) {
      commentMap.get(row.table_name)!.set(row.column_name, row.description);
    }
  }

  // Build constraint lookup
  const constraintLookup = new Map<string, Map<string, PgConstraintRow[]>>();
  for (const row of constraintRows) {
    if (!constraintLookup.has(row.table_name)) constraintLookup.set(row.table_name, new Map());
    const tbl = constraintLookup.get(row.table_name)!;
    if (!tbl.has(row.column_name)) tbl.set(row.column_name, []);
    tbl.get(row.column_name)!.push(row);
  }

  // Build columns
  for (const row of columnRows) {
    if (!tableMap.has(row.table_name)) {
      tableMap.set(row.table_name, { columns: [], constraints: [] });
    }
    const entry = tableMap.get(row.table_name)!;

    const colConstraints = constraintLookup.get(row.table_name)?.get(row.column_name) ?? [];
    const keyTypes: TKeyType[] = [];
    let reference: IForeignKeyRef | null = null;

    for (const c of colConstraints) {
      const resolved = resolveKeyType(c.constraint_type);
      if (resolved === 'PK' && !keyTypes.includes('PK')) { keyTypes.push('PK'); }
      else if (resolved === 'FK') {
        if (!keyTypes.includes('FK')) keyTypes.push('FK');
        reference = {
          table: c.foreign_table_name!,
          column: c.foreign_column_name!,
          onDelete: resolveRefAction(c.delete_rule),
          onUpdate: resolveRefAction(c.update_rule),
        };
      } else if (resolved === 'UK' && !keyTypes.includes('UK')) {
        keyTypes.push('UK');
      }
    }

    const comment = commentMap.get(row.table_name)?.get(row.column_name) ?? '';

    const column: IColumn = {
      id: crypto.randomUUID(),
      name: row.column_name,
      dataType: row.udt_name,
      keyTypes,
      isAutoIncrement: row.is_identity === 'YES' || /^nextval\(/i.test(row.column_default ?? ''),
      defaultValue: row.column_default,
      nullable: row.is_nullable === 'YES',
      comment,
      reference,
      constraints: [],
      ordinalPosition: row.ordinal_position,
    };

    entry.columns.push(column);
  }

  // Build table-level constraints
  const constraintGroupMap = new Map<string, Map<string, PgConstraintRow[]>>();
  for (const row of constraintRows) {
    if (!constraintGroupMap.has(row.table_name)) constraintGroupMap.set(row.table_name, new Map());
    const tbl = constraintGroupMap.get(row.table_name)!;
    if (!tbl.has(row.constraint_name)) tbl.set(row.constraint_name, []);
    tbl.get(row.constraint_name)!.push(row);
  }

  for (const [tableName, entry] of tableMap) {
    const tableConstraints = constraintGroupMap.get(tableName);
    if (!tableConstraints) continue;

    for (const [constraintName, rows] of tableConstraints) {
      const first = rows[0];
      const constraint: IConstraint = {
        type: resolveKeyType(first.constraint_type) ?? 'IDX',
        name: constraintName,
        columns: rows.map(r => r.column_name),
      };

      if (first.constraint_type === 'FOREIGN KEY' && first.foreign_table_name) {
        constraint.reference = {
          table: first.foreign_table_name,
          column: first.foreign_column_name!,
          onDelete: resolveRefAction(first.delete_rule),
          onUpdate: resolveRefAction(first.update_rule),
        };
      }

      entry.constraints.push(constraint);
    }
  }

  // Add CHECK constraints
  for (const row of checkRows) {
    const entry = tableMap.get(row.table_name);
    if (!entry) continue;
    // Strip leading "CHECK " from pg_get_constraintdef output
    const expr = row.check_expression.replace(/^CHECK\s*/i, '');
    entry.constraints.push({
      type: 'CHECK',
      name: row.constraint_name,
      columns: row.column_names ?? [],
      checkExpression: expr,
    });
    // Mark columns with CHECK constraint
    for (const colName of (row.column_names ?? [])) {
      const col = entry.columns.find((c) => c.name === colName);
      if (col) {
        if (!col.constraints.some((c) => c.type === 'CHECK')) {
          col.constraints.push({ type: 'CHECK', name: row.constraint_name, columns: [colName], checkExpression: expr });
        }
      }
    }
  }

  // Add non-constraint indexes (IDX)
  const pgIdxGroupMap = new Map<string, Map<string, { table_name: string; index_name: string; column_name: string; is_unique: boolean }[]>>();
  for (const row of indexRows) {
    if (!pgIdxGroupMap.has(row.table_name)) pgIdxGroupMap.set(row.table_name, new Map());
    const tbl = pgIdxGroupMap.get(row.table_name)!;
    if (!tbl.has(row.index_name)) tbl.set(row.index_name, []);
    tbl.get(row.index_name)!.push(row);
  }
  for (const [tableName, idxMap] of pgIdxGroupMap) {
    const entry = tableMap.get(tableName);
    if (!entry) continue;
    for (const [indexName, rows] of idxMap) {
      // Skip unique indexes — they may already be captured as UK
      if (rows[0].is_unique) continue;
      const colNames = rows.map((r) => r.column_name);
      entry.constraints.push({ type: 'IDX', name: indexName, columns: colNames });
      for (const colName of colNames) {
        const col = entry.columns.find((c) => c.name === colName);
        if (col && !col.keyTypes.includes('IDX')) {
          col.keyTypes.push('IDX');
        }
      }
    }
  }

  // Build final ITable array
  const tables: ITable[] = [];
  for (const [tableName, entry] of tableMap) {
    const tableComment = commentMap.get(tableName)?.get(null) ?? '';
    const relkind = viewMap.get(tableName);
    tables.push({
      id: crypto.randomUUID(),
      name: tableName,
      comment: tableComment,
      columns: entry.columns,
      constraints: entry.constraints,
      isView: relkind === 'v' || relkind === 'm',
      isMaterialized: relkind === 'm',
    });
  }

  return tables;
}

interface SqliteColumnRow {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface SqliteForeignKeyRow {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
  on_update: string;
  on_delete: string;
}

interface SqliteIndexRow {
  name: string;
  unique: number;
}

interface SqliteIndexInfoRow {
  name: string;
}

function fetchSqliteSchema(connectionId: string): ITable[] {
  const config = connectionService.getConnectionConfig(connectionId);
  const db = createSqliteConnection({ database: config.database });

  try {
    // Get all table and view names
    const tableRows = db.prepare(
      `SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name`,
    ).all() as { name: string; type: string }[];

    const viewNames = new Set(tableRows.filter((r) => r.type === 'view').map((r) => r.name));
    const tables: ITable[] = [];

    for (const tableRow of tableRows) {
      const tableName = tableRow.name;

      // Fetch columns
      const columns = db.prepare(`PRAGMA table_info('${tableName}')`).all() as SqliteColumnRow[];

      // Fetch foreign keys
      const foreignKeys = db.prepare(`PRAGMA foreign_key_list('${tableName}')`).all() as SqliteForeignKeyRow[];
      const fkMap = new Map<string, SqliteForeignKeyRow>();
      for (const fk of foreignKeys) {
        fkMap.set(fk.from, fk);
      }

      // Fetch indexes for unique constraints
      const indexes = db.prepare(`PRAGMA index_list('${tableName}')`).all() as SqliteIndexRow[];
      const uniqueColumns = new Set<string>();
      for (const idx of indexes) {
        if (idx.unique) {
          const indexInfo = db.prepare(`PRAGMA index_info('${idx.name}')`).all() as SqliteIndexInfoRow[];
          for (const col of indexInfo) {
            uniqueColumns.add(col.name);
          }
        }
      }

      // Build IColumn[]
      const tableColumns: IColumn[] = columns.map((col) => {
        const keyTypes: TKeyType[] = [];
        let reference: IForeignKeyRef | null = null;

        if (col.pk > 0) keyTypes.push('PK');

        const fk = fkMap.get(col.name);
        if (fk) {
          keyTypes.push('FK');
          reference = {
            table: fk.table,
            column: fk.to,
            onDelete: resolveRefAction(fk.on_delete),
            onUpdate: resolveRefAction(fk.on_update),
          };
        }

        if (uniqueColumns.has(col.name) && !keyTypes.includes('PK')) {
          keyTypes.push('UK');
        }

        return {
          id: crypto.randomUUID(),
          name: col.name,
          dataType: col.type || 'TEXT',
          keyTypes,
          isAutoIncrement: col.pk === 1 && col.type.toUpperCase().includes('INTEGER'),
          defaultValue: col.dflt_value,
          nullable: col.notnull === 0,
          comment: '',
          reference,
          constraints: [],
          ordinalPosition: col.cid + 1,
        };
      });

      // Build table-level constraints
      const constraints: IConstraint[] = [];

      // PK constraint
      const pkCols = columns.filter((c) => c.pk > 0).map((c) => c.name);
      if (pkCols.length > 0) {
        constraints.push({ type: 'PK', name: `pk_${tableName}`, columns: pkCols });
      }

      // FK constraints
      for (const fk of foreignKeys) {
        constraints.push({
          type: 'FK',
          name: `fk_${tableName}_${fk.from}`,
          columns: [fk.from],
          reference: {
            table: fk.table,
            column: fk.to,
            onDelete: resolveRefAction(fk.on_delete),
            onUpdate: resolveRefAction(fk.on_update),
          },
        });
      }

      // Unique constraints & regular indexes
      for (const idx of indexes) {
        const indexInfo = db.prepare(`PRAGMA index_info('${idx.name}')`).all() as SqliteIndexInfoRow[];
        const colNames = indexInfo.map((c) => c.name);
        if (idx.unique) {
          constraints.push({ type: 'UK', name: idx.name, columns: colNames });
        } else {
          constraints.push({ type: 'IDX', name: idx.name, columns: colNames });
          // Mark columns with IDX keyType
          for (const colName of colNames) {
            const col = tableColumns.find((c) => c.name === colName);
            if (col && !col.keyTypes.includes('IDX')) {
              col.keyTypes.push('IDX');
            }
          }
        }
      }

      // CHECK constraints (parse from DDL)
      try {
        const ddlRow = db.prepare(
          `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`,
        ).get(tableName) as { sql: string } | undefined;
        if (ddlRow?.sql) {
          const checkRegex = /CONSTRAINT\s+(\w+)\s+CHECK\s*\(([^)]+)\)/gi;
          let match: RegExpExecArray | null;
          while ((match = checkRegex.exec(ddlRow.sql)) !== null) {
            const cName = match[1];
            const cExpr = match[2].trim();
            const referencedCols = tableColumns
              .filter((c) => {
                const escaped = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return new RegExp(`\\b${escaped}\\b`).test(cExpr);
              })
              .map((c) => c.name);
            constraints.push({
              type: 'CHECK',
              name: cName,
              columns: referencedCols,
              checkExpression: cExpr,
            });
            for (const col of tableColumns) {
              if (referencedCols.includes(col.name) && !col.constraints.some((c) => c.type === 'CHECK')) {
                col.constraints.push({ type: 'CHECK', name: cName, columns: [col.name], checkExpression: cExpr });
              }
            }
          }
          // Also catch inline CHECK (without CONSTRAINT keyword)
          const inlineCheckRegex = /CHECK\s*\(([^)]+)\)/gi;
          let inlineMatch: RegExpExecArray | null;
          while ((inlineMatch = inlineCheckRegex.exec(ddlRow.sql)) !== null) {
            const expr = inlineMatch[1].trim();
            // Skip if already captured by named constraint
            if (constraints.some((c) => c.type === 'CHECK' && c.checkExpression === expr)) continue;
            const refCols = tableColumns.filter((c) => {
              const escaped = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              return new RegExp(`\\b${escaped}\\b`).test(expr);
            }).map((c) => c.name);
            const autoName = `chk_${tableName}_${constraints.filter((c) => c.type === 'CHECK').length + 1}`;
            constraints.push({ type: 'CHECK', name: autoName, columns: refCols, checkExpression: expr });
            for (const col of tableColumns) {
              if (refCols.includes(col.name) && !col.constraints.some((c) => c.type === 'CHECK')) {
                col.constraints.push({ type: 'CHECK', name: autoName, columns: [col.name], checkExpression: expr });
              }
            }
          }
        }
      } catch {
        // DDL parsing failed — skip CHECK extraction
      }

      tables.push({
        id: crypto.randomUUID(),
        name: tableName,
        comment: '',
        columns: tableColumns,
        constraints,
        isView: viewNames.has(tableName),
      });
    }

    return tables;
  } finally {
    closeSqliteConnection(db);
  }
}

export const schemaService = {
  async fetchRealSchema(connectionId: string): Promise<ITable[]> {
    const config = connectionService.getConnectionConfig(connectionId);
    const dbType: TDbType = config.dbType;

    if (dbType === 'mysql' || dbType === 'mariadb') {
      return fetchMysqlSchema(connectionId);
    }

    if (dbType === 'postgresql') {
      return fetchPgSchema(connectionId);
    }

    if (dbType === 'sqlite') {
      return fetchSqliteSchema(connectionId);
    }

    throw new Error(`Unsupported database type: ${dbType}`);
  },
};
