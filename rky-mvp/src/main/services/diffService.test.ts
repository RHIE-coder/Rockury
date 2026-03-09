import { describe, expect, it } from 'vitest';
import { diffService } from './diffService';
import type { ITable } from '~/shared/types/db';

function makeTable(overrides: Partial<ITable> = {}): ITable {
  return {
    id: 'tbl-1',
    name: 'tbl_member',
    comment: '',
    columns: [],
    constraints: [],
    ...overrides,
  };
}

describe('diffService.compareTableArrays', () => {
  it('does not treat keyTypes order differences as column modifications', () => {
    const source = makeTable({
      columns: [
        {
          id: 'c1',
          name: 'username',
          dataType: 'varchar(32)',
          keyTypes: ['PK', 'FK'],
          defaultValue: null,
          nullable: false,
          comment: '',
          reference: { table: 'tbl_member', column: 'username', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
          constraints: [],
          ordinalPosition: 1,
        },
      ],
      constraints: [
        {
          type: 'PK',
          name: 'PRIMARY',
          columns: ['username'],
        },
        {
          type: 'FK',
          name: 'FK_member_user',
          columns: ['username'],
          reference: { table: 'tbl_member', column: 'username', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
        },
      ],
    });

    const target = makeTable({
      columns: [
        {
          id: 'c1r',
          name: 'username',
          dataType: 'varchar(32)',
          keyTypes: ['FK', 'PK'],
          defaultValue: null,
          nullable: false,
          comment: '',
          reference: { table: 'tbl_member', column: 'username', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
          constraints: [],
          ordinalPosition: 1,
        },
      ],
      constraints: [
        {
          type: 'PK',
          name: 'PRIMARY',
          columns: ['username'],
        },
        {
          type: 'FK',
          name: 'FK_member_user',
          columns: ['username'],
          reference: { table: 'tbl_member', column: 'username', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
        },
      ],
    });

    const diff = diffService.compareTableArrays([source], [target]);
    expect(diff.hasDifferences).toBe(false);
    expect(diff.tableDiffs).toHaveLength(0);
    expect(diff.migrationDdl).toBe('');
  });

  it('keeps detecting real column shape differences', () => {
    const source = makeTable({
      columns: [
        {
          id: 'c1',
          name: 'id',
          dataType: 'bigint(20)',
          keyTypes: ['PK'],
          defaultValue: null,
          nullable: false,
          comment: '',
          reference: null,
          constraints: [],
          ordinalPosition: 1,
        },
      ],
    });

    const target = makeTable({
      columns: [
        {
          id: 'c1r',
          name: 'id',
          dataType: 'bigint(20) unsigned',
          keyTypes: ['PK'],
          defaultValue: null,
          nullable: false,
          comment: '',
          reference: null,
          constraints: [],
          ordinalPosition: 1,
        },
      ],
    });

    const diff = diffService.compareTableArrays([source], [target]);
    expect(diff.hasDifferences).toBe(true);
    expect(diff.migrationDdl).toContain('ALTER TABLE `tbl_member` MODIFY COLUMN `id` bigint(20) NOT NULL;');
  });
});
