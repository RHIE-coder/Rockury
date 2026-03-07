import { connectionService } from './connectionService';
import { createMysqlConnection, closeMysqlConnection } from '#/infrastructure';
import { createPgConnection, closePgConnection } from '#/infrastructure';
import { DIALECT_INFO } from '~/shared/types/db';
import type {
  ISchemaObjects, ISchemaView, IRoutine, ITrigger, IDbEvent,
  ICustomType, ISequence, ISchemaIndex, TSchemaObjectType, TDbType,
} from '~/shared/types/db';

// ─── MySQL / MariaDB row types ───

interface MysqlViewRow {
  TABLE_NAME: string;
  VIEW_DEFINITION: string;
}

interface MysqlRoutineRow {
  ROUTINE_NAME: string;
  ROUTINE_TYPE: string;
  ROUTINE_DEFINITION: string | null;
  DATA_TYPE: string;
  DTD_IDENTIFIER: string;
}

interface MysqlTriggerRow {
  TRIGGER_NAME: string;
  EVENT_OBJECT_TABLE: string;
  ACTION_TIMING: string;
  EVENT_MANIPULATION: string;
  ACTION_STATEMENT: string;
}

interface MysqlEventRow {
  EVENT_NAME: string;
  EVENT_DEFINITION: string;
  EXECUTE_AT: string | null;
  EVENT_TYPE: string;
  INTERVAL_VALUE: string | null;
  INTERVAL_FIELD: string | null;
  STATUS: string;
}

interface MysqlIndexRow {
  INDEX_NAME: string;
  TABLE_NAME: string;
  COLUMN_NAME: string;
  NON_UNIQUE: number;
  INDEX_TYPE: string;
}

// ─── PostgreSQL row types ───

interface PgViewRow {
  viewname: string;
  definition: string;
}

interface PgMatViewRow {
  matviewname: string;
  definition: string;
}

interface PgFunctionRow {
  proname: string;
  funcdef: string;
  prokind: string;
  lanname: string;
  return_type: string;
}

interface PgTriggerRow {
  tgname: string;
  relname: string;
  tgtype: number;
  tgdef: string;
}

interface PgTypeRow {
  typname: string;
  typtype: string;
  enum_values: string | null;
  attributes: string | null;
}

interface PgSequenceRow {
  sequencename: string;
  data_type: string;
  start_value: string;
  increment_by: string;
  min_value: string;
  max_value: string;
  cycle: boolean;
}

interface PgIndexRow {
  indexname: string;
  tablename: string;
  indexdef: string;
}

// ─── Helpers ───

function shouldFetch(types: TSchemaObjectType[] | undefined, ...targets: TSchemaObjectType[]): boolean {
  if (!types) return true;
  return targets.some((t) => types.includes(t));
}

function resolveTriggerTiming(tgtype: number): 'BEFORE' | 'AFTER' | 'INSTEAD OF' {
  // bit 1 = BEFORE, bit 6 = INSTEAD OF
  if (tgtype & 0x40) return 'INSTEAD OF';
  if (tgtype & 0x02) return 'BEFORE';
  return 'AFTER';
}

function resolveTriggerEvent(tgtype: number): 'INSERT' | 'UPDATE' | 'DELETE' {
  if (tgtype & 0x04) return 'INSERT';
  if (tgtype & 0x10) return 'UPDATE';
  return 'DELETE';
}

// ─── MySQL / MariaDB ───

async function fetchMysqlObjects(
  connectionId: string,
  database: string,
  objectTypes?: TSchemaObjectType[],
): Promise<Partial<ISchemaObjects>> {
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
    const result: Partial<ISchemaObjects> = {};

    // Views
    if (shouldFetch(objectTypes, 'view')) {
      const [rows] = await conn.query(
        `SELECT TABLE_NAME, VIEW_DEFINITION FROM information_schema.VIEWS WHERE TABLE_SCHEMA = ?`,
        [database],
      );
      result.views = (rows as MysqlViewRow[]).map((r) => ({
        name: r.TABLE_NAME,
        definition: r.VIEW_DEFINITION ?? '',
        isMaterialized: false,
        columns: [],
      }));
    }

    // Functions & Procedures
    if (shouldFetch(objectTypes, 'function', 'procedure')) {
      const [rows] = await conn.query(
        `SELECT ROUTINE_NAME, ROUTINE_TYPE, ROUTINE_DEFINITION, DATA_TYPE, DTD_IDENTIFIER
         FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ?`,
        [database],
      );
      const routines = rows as MysqlRoutineRow[];

      if (shouldFetch(objectTypes, 'function')) {
        result.functions = routines
          .filter((r) => r.ROUTINE_TYPE === 'FUNCTION')
          .map((r) => ({
            name: r.ROUTINE_NAME,
            type: 'function' as const,
            definition: r.ROUTINE_DEFINITION ?? '',
            returnType: r.DTD_IDENTIFIER,
            parameters: [],
          }));
      }
      if (shouldFetch(objectTypes, 'procedure')) {
        result.procedures = routines
          .filter((r) => r.ROUTINE_TYPE === 'PROCEDURE')
          .map((r) => ({
            name: r.ROUTINE_NAME,
            type: 'procedure' as const,
            definition: r.ROUTINE_DEFINITION ?? '',
            parameters: [],
          }));
      }
    }

    // Triggers
    if (shouldFetch(objectTypes, 'trigger')) {
      const [rows] = await conn.query(
        `SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE, ACTION_TIMING, EVENT_MANIPULATION, ACTION_STATEMENT
         FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ?`,
        [database],
      );
      result.triggers = (rows as MysqlTriggerRow[]).map((r) => ({
        name: r.TRIGGER_NAME,
        tableName: r.EVENT_OBJECT_TABLE,
        timing: r.ACTION_TIMING as ITrigger['timing'],
        event: r.EVENT_MANIPULATION as ITrigger['event'],
        definition: r.ACTION_STATEMENT,
      }));
    }

    // Events
    if (shouldFetch(objectTypes, 'event')) {
      const [rows] = await conn.query(
        `SELECT EVENT_NAME, EVENT_DEFINITION, EXECUTE_AT, EVENT_TYPE, INTERVAL_VALUE, INTERVAL_FIELD, STATUS
         FROM information_schema.EVENTS WHERE EVENT_SCHEMA = ?`,
        [database],
      );
      result.events = (rows as MysqlEventRow[]).map((r) => {
        let schedule = r.EVENT_TYPE;
        if (r.EXECUTE_AT) {
          schedule = `AT ${r.EXECUTE_AT}`;
        } else if (r.INTERVAL_VALUE && r.INTERVAL_FIELD) {
          schedule = `EVERY ${r.INTERVAL_VALUE} ${r.INTERVAL_FIELD}`;
        }
        return {
          name: r.EVENT_NAME,
          schedule,
          definition: r.EVENT_DEFINITION,
          status: r.STATUS === 'ENABLED' ? 'ENABLED' as const : 'DISABLED' as const,
        };
      });
    }

    // Indexes
    if (shouldFetch(objectTypes, 'index')) {
      const [rows] = await conn.query(
        `SELECT DISTINCT INDEX_NAME, TABLE_NAME, COLUMN_NAME, NON_UNIQUE, INDEX_TYPE
         FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = ? AND INDEX_NAME != 'PRIMARY'
         ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
        [database],
      );
      const indexRows = rows as MysqlIndexRow[];

      // Group by index name + table
      const indexMap = new Map<string, { tableName: string; columns: string[]; isUnique: boolean; type: string }>();
      for (const r of indexRows) {
        const key = `${r.TABLE_NAME}.${r.INDEX_NAME}`;
        if (!indexMap.has(key)) {
          indexMap.set(key, { tableName: r.TABLE_NAME, columns: [], isUnique: r.NON_UNIQUE === 0, type: r.INDEX_TYPE });
        }
        indexMap.get(key)!.columns.push(r.COLUMN_NAME);
      }

      result.indexes = Array.from(indexMap.entries()).map(([key, v]) => {
        const indexName = key.split('.')[1];
        return {
          name: indexName,
          tableName: v.tableName,
          columns: v.columns,
          isUnique: v.isUnique,
          type: v.type,
          definition: `CREATE${v.isUnique ? ' UNIQUE' : ''} INDEX \`${indexName}\` ON \`${v.tableName}\` (${v.columns.map((c) => `\`${c}\``).join(', ')})`,
        };
      });
    }

    return result;
  } finally {
    await closeMysqlConnection(conn);
  }
}

async function fetchMysqlObjectDdl(
  connectionId: string,
  objectType: TSchemaObjectType,
  objectName: string,
): Promise<string> {
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
    let ddl = '';

    switch (objectType) {
      case 'view': {
        const [rows] = await conn.query(`SHOW CREATE VIEW \`${objectName}\``);
        const row = (rows as Array<Record<string, string>>)[0];
        ddl = row?.['Create View'] ?? '';
        break;
      }
      case 'function': {
        const [rows] = await conn.query(`SHOW CREATE FUNCTION \`${objectName}\``);
        const row = (rows as Array<Record<string, string>>)[0];
        ddl = row?.['Create Function'] ?? '';
        break;
      }
      case 'procedure': {
        const [rows] = await conn.query(`SHOW CREATE PROCEDURE \`${objectName}\``);
        const row = (rows as Array<Record<string, string>>)[0];
        ddl = row?.['Create Procedure'] ?? '';
        break;
      }
      case 'trigger': {
        const [rows] = await conn.query(`SHOW CREATE TRIGGER \`${objectName}\``);
        const row = (rows as Array<Record<string, string>>)[0];
        ddl = row?.['SQL Original Statement'] ?? '';
        break;
      }
      case 'event': {
        const [rows] = await conn.query(`SHOW CREATE EVENT \`${objectName}\``);
        const row = (rows as Array<Record<string, string>>)[0];
        ddl = row?.['Create Event'] ?? '';
        break;
      }
      case 'table': {
        const [rows] = await conn.query(`SHOW CREATE TABLE \`${objectName}\``);
        const row = (rows as Array<Record<string, string>>)[0];
        ddl = row?.['Create Table'] ?? '';
        break;
      }
      default:
        throw new Error(`DDL not supported for object type: ${objectType}`);
    }

    return ddl;
  } finally {
    await closeMysqlConnection(conn);
  }
}

// ─── PostgreSQL ───

async function fetchPgObjects(
  connectionId: string,
  objectTypes?: TSchemaObjectType[],
): Promise<Partial<ISchemaObjects>> {
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
    const result: Partial<ISchemaObjects> = {};

    // Views
    if (shouldFetch(objectTypes, 'view', 'materialized_view')) {
      const views: ISchemaView[] = [];

      if (shouldFetch(objectTypes, 'view')) {
        const viewResult = await client.query<PgViewRow>(
          `SELECT viewname, definition FROM pg_views WHERE schemaname = 'public'`,
        );
        for (const r of viewResult.rows) {
          views.push({
            name: r.viewname,
            definition: r.definition ?? '',
            isMaterialized: false,
            columns: [],
          });
        }
      }

      if (shouldFetch(objectTypes, 'materialized_view')) {
        const matResult = await client.query<PgMatViewRow>(
          `SELECT matviewname, definition FROM pg_matviews WHERE schemaname = 'public'`,
        );
        for (const r of matResult.rows) {
          views.push({
            name: r.matviewname,
            definition: r.definition ?? '',
            isMaterialized: true,
            columns: [],
          });
        }
      }

      result.views = views;
    }

    // Functions & Procedures
    if (shouldFetch(objectTypes, 'function', 'procedure')) {
      const funcResult = await client.query<PgFunctionRow>(
        `SELECT p.proname,
                pg_get_functiondef(p.oid) AS funcdef,
                p.prokind,
                l.lanname,
                pg_catalog.format_type(p.prorettype, NULL) AS return_type
         FROM pg_proc p
         JOIN pg_namespace n ON p.pronamespace = n.oid
         JOIN pg_language l ON p.prolang = l.oid
         WHERE n.nspname = 'public'
           AND p.prokind IN ('f', 'p')`,
      );

      const functions: IRoutine[] = [];
      const procedures: IRoutine[] = [];

      for (const r of funcResult.rows) {
        const routine: IRoutine = {
          name: r.proname,
          type: r.prokind === 'p' ? 'procedure' : 'function',
          definition: r.funcdef ?? '',
          language: r.lanname,
          returnType: r.return_type,
          parameters: [],
        };

        if (routine.type === 'function' && shouldFetch(objectTypes, 'function')) {
          functions.push(routine);
        } else if (routine.type === 'procedure' && shouldFetch(objectTypes, 'procedure')) {
          procedures.push(routine);
        }
      }

      if (shouldFetch(objectTypes, 'function')) result.functions = functions;
      if (shouldFetch(objectTypes, 'procedure')) result.procedures = procedures;
    }

    // Triggers
    if (shouldFetch(objectTypes, 'trigger')) {
      const trigResult = await client.query<PgTriggerRow>(
        `SELECT t.tgname, c.relname, t.tgtype,
                pg_get_triggerdef(t.oid) AS tgdef
         FROM pg_trigger t
         JOIN pg_class c ON t.tgrelid = c.oid
         JOIN pg_namespace n ON c.relnamespace = n.oid
         WHERE n.nspname = 'public'
           AND NOT t.tgisinternal`,
      );
      result.triggers = trigResult.rows.map((r) => ({
        name: r.tgname,
        tableName: r.relname,
        timing: resolveTriggerTiming(r.tgtype),
        event: resolveTriggerEvent(r.tgtype),
        definition: r.tgdef ?? '',
      }));
    }

    // Types (enum / composite)
    if (shouldFetch(objectTypes, 'type')) {
      const typeResult = await client.query<PgTypeRow>(
        `SELECT t.typname,
                t.typtype,
                (SELECT string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder)
                 FROM pg_enum e WHERE e.enumtypid = t.oid) AS enum_values,
                (SELECT string_agg(a.attname || ':' || pg_catalog.format_type(a.atttypid, a.atttypmod), ',' ORDER BY a.attnum)
                 FROM pg_attribute a WHERE a.attrelid = t.typrelid AND a.attnum > 0 AND NOT a.attisdropped) AS attributes
         FROM pg_type t
         JOIN pg_namespace n ON t.typnamespace = n.oid
         WHERE n.nspname = 'public'
           AND t.typtype IN ('e', 'c')`,
      );
      result.types = typeResult.rows.map((r) => {
        const customType: ICustomType = {
          name: r.typname,
          type: r.typtype === 'e' ? 'enum' : 'composite',
          definition: '',
        };

        if (r.typtype === 'e' && r.enum_values) {
          customType.values = r.enum_values.split(',');
          customType.definition = `CREATE TYPE ${r.typname} AS ENUM (${customType.values.map((v) => `'${v}'`).join(', ')})`;
        }

        if (r.typtype === 'c' && r.attributes) {
          customType.attributes = r.attributes.split(',').map((a) => {
            const [name, dataType] = a.split(':');
            return { name: name.trim(), dataType: dataType?.trim() ?? '' };
          });
          const attrDefs = customType.attributes.map((a) => `${a.name} ${a.dataType}`).join(', ');
          customType.definition = `CREATE TYPE ${r.typname} AS (${attrDefs})`;
        }

        return customType;
      });
    }

    // Sequences
    if (shouldFetch(objectTypes, 'sequence')) {
      const seqResult = await client.query<PgSequenceRow>(
        `SELECT sequencename, data_type, start_value, increment_by, min_value, max_value, cycle
         FROM pg_sequences WHERE schemaname = 'public'`,
      );
      result.sequences = seqResult.rows.map((r) => ({
        name: r.sequencename,
        dataType: r.data_type,
        startValue: Number(r.start_value),
        increment: Number(r.increment_by),
        minValue: r.min_value ? Number(r.min_value) : undefined,
        maxValue: r.max_value ? Number(r.max_value) : undefined,
        isCyclic: r.cycle,
      }));
    }

    // Indexes
    if (shouldFetch(objectTypes, 'index')) {
      const idxResult = await client.query<PgIndexRow>(
        `SELECT indexname, tablename, indexdef
         FROM pg_indexes
         WHERE schemaname = 'public'
           AND indexname NOT IN (
             SELECT conname FROM pg_constraint WHERE contype = 'p'
           )`,
      );
      result.indexes = idxResult.rows.map((r) => {
        const isUnique = /CREATE\s+UNIQUE/i.test(r.indexdef);
        // Extract columns from indexdef: ... ON tablename (col1, col2)
        const colMatch = /\(([^)]+)\)\s*$/.exec(r.indexdef);
        const columns = colMatch
          ? colMatch[1].split(',').map((c) => c.trim().replace(/"/g, ''))
          : [];

        return {
          name: r.indexname,
          tableName: r.tablename,
          columns,
          isUnique,
          definition: r.indexdef,
        };
      });
    }

    return result;
  } finally {
    await closePgConnection(client);
  }
}

async function fetchPgObjectDdl(
  connectionId: string,
  objectType: TSchemaObjectType,
  objectName: string,
): Promise<string> {
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
    let ddl = '';

    switch (objectType) {
      case 'view': {
        const result = await client.query(
          `SELECT pg_get_viewdef(c.oid, true) AS def
           FROM pg_class c
           JOIN pg_namespace n ON c.relnamespace = n.oid
           WHERE n.nspname = 'public' AND c.relname = $1 AND c.relkind = 'v'`,
          [objectName],
        );
        const def = result.rows[0]?.def ?? '';
        ddl = `CREATE OR REPLACE VIEW "${objectName}" AS\n${def}`;
        break;
      }
      case 'materialized_view': {
        const result = await client.query(
          `SELECT definition FROM pg_matviews WHERE schemaname = 'public' AND matviewname = $1`,
          [objectName],
        );
        ddl = `CREATE MATERIALIZED VIEW "${objectName}" AS\n${result.rows[0]?.definition ?? ''}`;
        break;
      }
      case 'function':
      case 'procedure': {
        const result = await client.query(
          `SELECT pg_get_functiondef(p.oid) AS def
           FROM pg_proc p
           JOIN pg_namespace n ON p.pronamespace = n.oid
           WHERE n.nspname = 'public' AND p.proname = $1
           LIMIT 1`,
          [objectName],
        );
        ddl = result.rows[0]?.def ?? '';
        break;
      }
      case 'trigger': {
        const result = await client.query(
          `SELECT pg_get_triggerdef(t.oid) AS def
           FROM pg_trigger t
           JOIN pg_class c ON t.tgrelid = c.oid
           JOIN pg_namespace n ON c.relnamespace = n.oid
           WHERE n.nspname = 'public' AND t.tgname = $1
           LIMIT 1`,
          [objectName],
        );
        ddl = result.rows[0]?.def ?? '';
        break;
      }
      case 'sequence': {
        const result = await client.query(
          `SELECT sequencename, data_type, start_value, increment_by, min_value, max_value, cycle
           FROM pg_sequences WHERE schemaname = 'public' AND sequencename = $1`,
          [objectName],
        );
        const r = result.rows[0];
        if (r) {
          ddl = `CREATE SEQUENCE "${objectName}" AS ${r.data_type} START WITH ${r.start_value} INCREMENT BY ${r.increment_by}`;
          if (r.min_value) ddl += ` MINVALUE ${r.min_value}`;
          if (r.max_value) ddl += ` MAXVALUE ${r.max_value}`;
          if (r.cycle) ddl += ` CYCLE`;
        }
        break;
      }
      case 'type': {
        // Check if enum or composite
        const typeResult = await client.query(
          `SELECT typtype FROM pg_type t
           JOIN pg_namespace n ON t.typnamespace = n.oid
           WHERE n.nspname = 'public' AND t.typname = $1`,
          [objectName],
        );
        const typtype = typeResult.rows[0]?.typtype;
        if (typtype === 'e') {
          const enumResult = await client.query(
            `SELECT string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS vals
             FROM pg_enum e
             JOIN pg_type t ON e.enumtypid = t.oid
             JOIN pg_namespace n ON t.typnamespace = n.oid
             WHERE n.nspname = 'public' AND t.typname = $1`,
            [objectName],
          );
          ddl = `CREATE TYPE "${objectName}" AS ENUM (${(enumResult.rows[0]?.vals ?? '').split(', ').map((v: string) => `'${v}'`).join(', ')})`;
        } else {
          const attrResult = await client.query(
            `SELECT a.attname, pg_catalog.format_type(a.atttypid, a.atttypmod) AS datatype
             FROM pg_attribute a
             JOIN pg_type t ON a.attrelid = t.typrelid
             JOIN pg_namespace n ON t.typnamespace = n.oid
             WHERE n.nspname = 'public' AND t.typname = $1 AND a.attnum > 0 AND NOT a.attisdropped
             ORDER BY a.attnum`,
            [objectName],
          );
          const attrs = attrResult.rows.map((a: { attname: string; datatype: string }) => `${a.attname} ${a.datatype}`).join(', ');
          ddl = `CREATE TYPE "${objectName}" AS (${attrs})`;
        }
        break;
      }
      default:
        throw new Error(`DDL not supported for object type: ${objectType}`);
    }

    return ddl;
  } finally {
    await closePgConnection(client);
  }
}

// ─── Exported Service ───

export const schemaObjectsService = {
  async fetchObjects(connectionId: string, objectTypes?: TSchemaObjectType[]): Promise<Partial<ISchemaObjects>> {
    const config = connectionService.getConnectionConfig(connectionId);
    const dbType: TDbType = config.dbType;

    // If no specific types requested, use all supported by dialect
    const types = objectTypes ?? DIALECT_INFO[dbType]?.supportedObjects;

    if (dbType === 'mysql' || dbType === 'mariadb') {
      return fetchMysqlObjects(connectionId, config.database, types);
    }
    if (dbType === 'postgresql') {
      return fetchPgObjects(connectionId, types);
    }
    throw new Error(`Unsupported database type: ${dbType}`);
  },

  async fetchObjectDdl(connectionId: string, objectType: TSchemaObjectType, objectName: string): Promise<string> {
    const config = connectionService.getConnectionConfig(connectionId);
    const dbType: TDbType = config.dbType;

    if (dbType === 'mysql' || dbType === 'mariadb') {
      return fetchMysqlObjectDdl(connectionId, objectType, objectName);
    }
    if (dbType === 'postgresql') {
      return fetchPgObjectDdl(connectionId, objectType, objectName);
    }
    throw new Error(`Unsupported database type: ${dbType}`);
  },
};
