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
      ], undefined]);

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
