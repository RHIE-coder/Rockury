import { describe, expect, it } from 'vitest';
import type { ITable } from '~/shared/types/db';
import { buildFkSelectionValues, resolveFkLookupConfig } from './fkLookup';

function makePaymentsTable(): ITable {
  return {
    id: 'payments',
    name: 'payments',
    comment: '',
    columns: [
      {
        id: 'payments-id',
        name: 'id',
        dataType: 'uuid',
        keyTypes: ['PK'],
        defaultValue: null,
        nullable: false,
        comment: '',
        reference: null,
        constraints: [],
        ordinalPosition: 1,
      },
      {
        id: 'payments-order-id',
        name: 'order_id',
        dataType: 'uuid',
        keyTypes: ['FK'],
        defaultValue: null,
        nullable: false,
        comment: '',
        reference: {
          table: 'orders',
          column: 'id',
        },
        constraints: [],
        ordinalPosition: 2,
      },
      {
        id: 'payments-order-created-at',
        name: 'order_created_at',
        dataType: 'timestamptz',
        keyTypes: ['FK'],
        defaultValue: null,
        nullable: false,
        comment: '',
        reference: {
          table: 'orders',
          column: 'created_at',
        },
        constraints: [],
        ordinalPosition: 3,
      },
    ],
    constraints: [
      {
        type: 'FK',
        name: 'payments_order_id_order_created_at_fkey',
        columns: ['order_id', 'order_created_at'],
        reference: {
          table: 'orders',
          column: 'id, created_at',
        },
      },
    ],
  };
}

describe('fkLookup helpers', () => {
  it('resolves composite FK lookup config from a participating column', () => {
    const config = resolveFkLookupConfig(makePaymentsTable(), 'order_id');

    expect(config).toEqual({
      refTable: 'orders',
      sourceColumns: ['order_id', 'order_created_at'],
      refColumns: ['id', 'created_at'],
      activeSourceColumn: 'order_id',
      activeRefColumn: 'id',
    });
  });

  it('maps a selected reference row back to every source FK column', () => {
    const config = resolveFkLookupConfig(makePaymentsTable(), 'order_id');
    expect(config).not.toBeNull();

    expect(
      buildFkSelectionValues(config!, {
        id: '20000000-0000-0000-0000-000000000001',
        created_at: '2025-01-25 10:00:00+00',
        status: 'confirmed',
      }),
    ).toEqual({
      order_id: '20000000-0000-0000-0000-000000000001',
      order_created_at: '2025-01-25 10:00:00+00',
    });
  });
});
