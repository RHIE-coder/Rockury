import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getConnectionConfig: vi.fn(),
  createMysqlConnection: vi.fn(),
  closeMysqlConnection: vi.fn(),
  createPgConnection: vi.fn(),
  closePgConnection: vi.fn(),
}));

vi.mock('./connectionService', () => ({
  connectionService: {
    getConnectionConfig: mocks.getConnectionConfig,
  },
}));

vi.mock('#/infrastructure', () => ({
  createMysqlConnection: mocks.createMysqlConnection,
  closeMysqlConnection: mocks.closeMysqlConnection,
  createPgConnection: mocks.createPgConnection,
  closePgConnection: mocks.closePgConnection,
}));

import { schemaService } from './schemaService';

describe('schemaService.fetchRealSchema (mysql)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConnectionConfig.mockReturnValue({
      dbType: 'mysql',
      host: 'localhost',
      port: 3306,
      database: 'app',
      username: 'root',
      password: 'pw',
      sslEnabled: false,
    });
  });

  it('preserves composite FK ref-column mapping and detects auto increment', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[
        {
          TABLE_NAME: 'tbl_operation_record_self_measurement',
          COLUMN_NAME: 'biz_site_code',
          ORDINAL_POSITION: 1,
          COLUMN_DEFAULT: null,
          IS_NULLABLE: 'NO',
          DATA_TYPE: 'char',
          COLUMN_TYPE: 'char(7)',
          COLUMN_KEY: 'PRI',
          COLUMN_COMMENT: '',
          EXTRA: '',
        },
        {
          TABLE_NAME: 'tbl_operation_record_self_measurement',
          COLUMN_NAME: 'measured_date',
          ORDINAL_POSITION: 2,
          COLUMN_DEFAULT: null,
          IS_NULLABLE: 'NO',
          DATA_TYPE: 'date',
          COLUMN_TYPE: 'date',
          COLUMN_KEY: 'PRI',
          COLUMN_COMMENT: '',
          EXTRA: '',
        },
        {
          TABLE_NAME: 'tbl_operation_record_self_measurement_detail',
          COLUMN_NAME: 'id',
          ORDINAL_POSITION: 1,
          COLUMN_DEFAULT: null,
          IS_NULLABLE: 'NO',
          DATA_TYPE: 'int',
          COLUMN_TYPE: 'int(11)',
          COLUMN_KEY: 'PRI',
          COLUMN_COMMENT: '',
          EXTRA: 'auto_increment',
        },
        {
          TABLE_NAME: 'tbl_operation_record_self_measurement_detail',
          COLUMN_NAME: 'biz_site_code',
          ORDINAL_POSITION: 2,
          COLUMN_DEFAULT: null,
          IS_NULLABLE: 'NO',
          DATA_TYPE: 'char',
          COLUMN_TYPE: 'char(7)',
          COLUMN_KEY: 'MUL',
          COLUMN_COMMENT: '',
          EXTRA: '',
        },
        {
          TABLE_NAME: 'tbl_operation_record_self_measurement_detail',
          COLUMN_NAME: 'measured_date',
          ORDINAL_POSITION: 3,
          COLUMN_DEFAULT: null,
          IS_NULLABLE: 'NO',
          DATA_TYPE: 'date',
          COLUMN_TYPE: 'date',
          COLUMN_KEY: 'MUL',
          COLUMN_COMMENT: '',
          EXTRA: '',
        },
      ], undefined])
      .mockResolvedValueOnce([[
        {
          TABLE_NAME: 'tbl_operation_record_self_measurement',
          CONSTRAINT_NAME: 'PRIMARY',
          CONSTRAINT_TYPE: 'PRIMARY KEY',
          COLUMN_NAME: 'biz_site_code',
          REFERENCED_TABLE_NAME: null,
          REFERENCED_COLUMN_NAME: null,
          UPDATE_RULE: null,
          DELETE_RULE: null,
          CONSTRAINT_ORDINAL: 1,
          REFERENCED_ORDINAL: 1,
        },
        {
          TABLE_NAME: 'tbl_operation_record_self_measurement',
          CONSTRAINT_NAME: 'PRIMARY',
          CONSTRAINT_TYPE: 'PRIMARY KEY',
          COLUMN_NAME: 'measured_date',
          REFERENCED_TABLE_NAME: null,
          REFERENCED_COLUMN_NAME: null,
          UPDATE_RULE: null,
          DELETE_RULE: null,
          CONSTRAINT_ORDINAL: 2,
          REFERENCED_ORDINAL: 2,
        },
        {
          TABLE_NAME: 'tbl_operation_record_self_measurement_detail',
          CONSTRAINT_NAME: 'PRIMARY',
          CONSTRAINT_TYPE: 'PRIMARY KEY',
          COLUMN_NAME: 'id',
          REFERENCED_TABLE_NAME: null,
          REFERENCED_COLUMN_NAME: null,
          UPDATE_RULE: null,
          DELETE_RULE: null,
          CONSTRAINT_ORDINAL: 1,
          REFERENCED_ORDINAL: 1,
        },
        {
          TABLE_NAME: 'tbl_operation_record_self_measurement_detail',
          CONSTRAINT_NAME: 'FK_operation_record_self_measurement_detail',
          CONSTRAINT_TYPE: 'FOREIGN KEY',
          COLUMN_NAME: 'biz_site_code',
          REFERENCED_TABLE_NAME: 'tbl_operation_record_self_measurement',
          REFERENCED_COLUMN_NAME: 'biz_site_code',
          UPDATE_RULE: 'CASCADE',
          DELETE_RULE: 'CASCADE',
          CONSTRAINT_ORDINAL: 1,
          REFERENCED_ORDINAL: 1,
        },
        {
          TABLE_NAME: 'tbl_operation_record_self_measurement_detail',
          CONSTRAINT_NAME: 'FK_operation_record_self_measurement_detail',
          CONSTRAINT_TYPE: 'FOREIGN KEY',
          COLUMN_NAME: 'measured_date',
          REFERENCED_TABLE_NAME: 'tbl_operation_record_self_measurement',
          REFERENCED_COLUMN_NAME: null,
          UPDATE_RULE: 'CASCADE',
          DELETE_RULE: 'CASCADE',
          CONSTRAINT_ORDINAL: 2,
          REFERENCED_ORDINAL: 2,
        },
      ], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined]);

    mocks.createMysqlConnection.mockResolvedValue({ query });
    mocks.closeMysqlConnection.mockResolvedValue(undefined);

    const tables = await schemaService.fetchRealSchema('conn-1');

    const detail = tables.find((t) => t.name === 'tbl_operation_record_self_measurement_detail');
    expect(detail).toBeDefined();

    const idCol = detail!.columns.find((c) => c.name === 'id');
    expect(idCol?.isAutoIncrement).toBe(true);

    const fk = detail!.constraints.find((c) => c.name === 'FK_operation_record_self_measurement_detail');
    expect(fk?.reference?.column).toBe('biz_site_code, measured_date');
  });
});

describe('schemaService.fetchRealSchema (postgresql)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConnectionConfig.mockReturnValue({
      dbType: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'app',
      username: 'postgres',
      password: 'pw',
      sslEnabled: false,
    });
  });

  it('deduplicates partition foreign keys and preserves composite references', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({
        rows: [
          {
            table_name: 'payments',
            column_name: 'id',
            ordinal_position: 1,
            column_default: 'uuid_generate_v4()',
            is_nullable: 'NO',
            data_type: 'uuid',
            udt_name: 'uuid',
            is_identity: 'NO',
          },
          {
            table_name: 'payments',
            column_name: 'order_id',
            ordinal_position: 2,
            column_default: null,
            is_nullable: 'NO',
            data_type: 'uuid',
            udt_name: 'uuid',
            is_identity: 'NO',
          },
          {
            table_name: 'payments',
            column_name: 'order_created_at',
            ordinal_position: 3,
            column_default: null,
            is_nullable: 'NO',
            data_type: 'timestamp with time zone',
            udt_name: 'timestamptz',
            is_identity: 'NO',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            table_name: 'payments',
            constraint_name: 'payments_pkey',
            constraint_type: 'PRIMARY KEY',
            column_name: 'id',
            foreign_table_name: null,
            foreign_column_name: null,
            update_rule: null,
            delete_rule: null,
          },
          {
            table_name: 'payments',
            constraint_name: 'payments_order_id_order_created_at_fkey',
            constraint_type: 'FOREIGN KEY',
            column_name: 'order_id',
            foreign_table_name: 'orders',
            foreign_column_name: 'id',
            update_rule: 'RESTRICT',
            delete_rule: 'RESTRICT',
          },
          {
            table_name: 'payments',
            constraint_name: 'payments_order_id_order_created_at_fkey',
            constraint_type: 'FOREIGN KEY',
            column_name: 'order_created_at',
            foreign_table_name: 'orders',
            foreign_column_name: 'created_at',
            update_rule: 'RESTRICT',
            delete_rule: 'RESTRICT',
          },
          {
            table_name: 'payments',
            constraint_name: 'payments_order_id_order_created_at_fkey4',
            constraint_type: 'FOREIGN KEY',
            column_name: 'order_id',
            foreign_table_name: 'orders_default',
            foreign_column_name: 'id',
            update_rule: 'RESTRICT',
            delete_rule: 'RESTRICT',
          },
          {
            table_name: 'payments',
            constraint_name: 'payments_order_id_order_created_at_fkey4',
            constraint_type: 'FOREIGN KEY',
            column_name: 'order_created_at',
            foreign_table_name: 'orders_default',
            foreign_column_name: 'created_at',
            update_rule: 'RESTRICT',
            delete_rule: 'RESTRICT',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            child_table: 'orders_default',
            parent_table: 'orders',
          },
        ],
      });

    mocks.createPgConnection.mockResolvedValue({ query });
    mocks.closePgConnection.mockResolvedValue(undefined);

    const tables = await schemaService.fetchRealSchema('conn-pg');

    const payments = tables.find((t) => t.name === 'payments');
    expect(payments).toBeDefined();

    const fkConstraints = payments!.constraints.filter((c) => c.type === 'FK');
    expect(fkConstraints).toHaveLength(1);
    expect(fkConstraints[0]).toMatchObject({
      name: 'payments_order_id_order_created_at_fkey',
      columns: ['order_id', 'order_created_at'],
      reference: {
        table: 'orders',
        column: 'id, created_at',
      },
    });

    expect(payments!.columns.find((c) => c.name === 'order_id')?.reference).toMatchObject({
      table: 'orders',
      column: 'id',
    });
    expect(payments!.columns.find((c) => c.name === 'order_created_at')?.reference).toMatchObject({
      table: 'orders',
      column: 'created_at',
    });
  });
});
