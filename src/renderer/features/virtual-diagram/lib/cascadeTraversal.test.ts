import { describe, it, expect } from 'vitest';
import { simulateCascade, getReferencedColumns } from './cascadeTraversal';
import type { ITable } from '~/shared/types/db';

function makeTable(id: string, name: string, columns: ITable['columns'] = []): ITable {
  return { id, name, comment: '', columns, constraints: [] };
}

function makeFkColumn(
  id: string,
  name: string,
  refTable: string,
  refColumn: string,
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION',
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION',
): ITable['columns'][0] {
  return {
    id,
    name,
    dataType: 'BIGINT',
    keyTypes: ['FK'],
    defaultValue: null,
    nullable: true,
    comment: '',
    reference: { table: refTable, column: refColumn, onDelete, onUpdate },
    constraints: [],
    ordinalPosition: 0,
  };
}

function makePkColumn(id: string, name: string): ITable['columns'][0] {
  return {
    id,
    name,
    dataType: 'BIGINT',
    keyTypes: ['PK'],
    defaultValue: null,
    nullable: false,
    comment: '',
    reference: null,
    constraints: [],
    ordinalPosition: 0,
  };
}

describe('simulateCascade', () => {
  it('returns empty result when source table has no references', () => {
    const tables: ITable[] = [
      makeTable('t1', 'users', [makePkColumn('c1', 'id')]),
      makeTable('t2', 'posts', [makePkColumn('c2', 'id')]),
    ];

    const result = simulateCascade(tables, 't1', 'DELETE');

    expect(result.sourceTableId).toBe('t1');
    expect(result.sourceTableName).toBe('users');
    expect(result.simulationType).toBe('DELETE');
    expect(result.affectedNodes).toHaveLength(0);
    expect(result.blockedNodes).toHaveLength(0);
    expect(result.isBlocked).toBe(false);
  });

  it('returns empty result for non-existent source table', () => {
    const result = simulateCascade([], 'nonexistent', 'DELETE');
    expect(result.sourceTableName).toBe('');
    expect(result.affectedNodes).toHaveLength(0);
  });

  it('detects CASCADE chain (DELETE)', () => {
    const tables: ITable[] = [
      makeTable('t1', 'users', [makePkColumn('c1', 'id')]),
      makeTable('t2', 'posts', [
        makePkColumn('c2', 'id'),
        makeFkColumn('c3', 'user_id', 'users', 'id', 'CASCADE'),
      ]),
      makeTable('t3', 'comments', [
        makePkColumn('c4', 'id'),
        makeFkColumn('c5', 'post_id', 'posts', 'id', 'CASCADE'),
      ]),
    ];

    const result = simulateCascade(tables, 't1', 'DELETE');

    expect(result.affectedNodes).toHaveLength(2);
    expect(result.isBlocked).toBe(false);

    const posts = result.affectedNodes.find((n) => n.tableName === 'posts');
    expect(posts).toBeDefined();
    expect(posts!.depth).toBe(1);
    expect(posts!.action).toBe('CASCADE');
    expect(posts!.propagates).toBe(true);

    const comments = result.affectedNodes.find((n) => n.tableName === 'comments');
    expect(comments).toBeDefined();
    expect(comments!.depth).toBe(2);
    expect(comments!.action).toBe('CASCADE');
    expect(comments!.parentTableId).toBe('t2');
  });

  it('detects SET NULL (stops chain)', () => {
    const tables: ITable[] = [
      makeTable('t1', 'users', [makePkColumn('c1', 'id')]),
      makeTable('t2', 'posts', [
        makePkColumn('c2', 'id'),
        makeFkColumn('c3', 'user_id', 'users', 'id', 'SET NULL'),
      ]),
      makeTable('t3', 'comments', [
        makePkColumn('c4', 'id'),
        makeFkColumn('c5', 'post_id', 'posts', 'id', 'CASCADE'),
      ]),
    ];

    const result = simulateCascade(tables, 't1', 'DELETE');

    expect(result.affectedNodes).toHaveLength(1);
    const posts = result.affectedNodes[0];
    expect(posts.action).toBe('SET NULL');
    expect(posts.propagates).toBe(false);

    // comments should NOT be reached because SET NULL stops the chain
    expect(result.affectedNodes.find((n) => n.tableName === 'comments')).toBeUndefined();
  });

  it('detects RESTRICT as blocked', () => {
    const tables: ITable[] = [
      makeTable('t1', 'users', [makePkColumn('c1', 'id')]),
      makeTable('t2', 'posts', [
        makePkColumn('c2', 'id'),
        makeFkColumn('c3', 'user_id', 'users', 'id', 'RESTRICT'),
      ]),
    ];

    const result = simulateCascade(tables, 't1', 'DELETE');

    expect(result.blockedNodes).toHaveLength(1);
    expect(result.isBlocked).toBe(true);
    expect(result.blockedNodes[0].action).toBe('RESTRICT');
    expect(result.blockedTableIds.has('t2')).toBe(true);
  });

  it('defaults missing onDelete to NO ACTION (blocked)', () => {
    const tables: ITable[] = [
      makeTable('t1', 'users', [makePkColumn('c1', 'id')]),
      makeTable('t2', 'posts', [
        makePkColumn('c2', 'id'),
        makeFkColumn('c3', 'user_id', 'users', 'id'), // no onDelete
      ]),
    ];

    const result = simulateCascade(tables, 't1', 'DELETE');

    expect(result.blockedNodes).toHaveLength(1);
    expect(result.blockedNodes[0].action).toBe('NO ACTION');
    expect(result.isBlocked).toBe(true);
  });

  it('simulates UPDATE type using onUpdate', () => {
    const tables: ITable[] = [
      makeTable('t1', 'users', [makePkColumn('c1', 'id')]),
      makeTable('t2', 'posts', [
        makePkColumn('c2', 'id'),
        makeFkColumn('c3', 'user_id', 'users', 'id', 'NO ACTION', 'CASCADE'),
      ]),
    ];

    const result = simulateCascade(tables, 't1', 'UPDATE');

    expect(result.affectedNodes).toHaveLength(1);
    expect(result.affectedNodes[0].action).toBe('CASCADE');
    expect(result.affectedNodes[0].propagates).toBe(true);
  });

  it('prevents infinite loops with circular references', () => {
    const tables: ITable[] = [
      makeTable('t1', 'a', [
        makePkColumn('c1', 'id'),
        makeFkColumn('c2', 'b_id', 'b', 'id', 'CASCADE'),
      ]),
      makeTable('t2', 'b', [
        makePkColumn('c3', 'id'),
        makeFkColumn('c4', 'a_id', 'a', 'id', 'CASCADE'),
      ]),
    ];

    const result = simulateCascade(tables, 't1', 'DELETE');

    // b references a → affected
    // a references b → but a is already visited, so no re-enqueue
    expect(result.affectedNodes).toHaveLength(1);
    expect(result.affectedNodes[0].tableName).toBe('b');
  });

  it('builds correct affectedEdgeIds', () => {
    const tables: ITable[] = [
      makeTable('t1', 'users', [makePkColumn('c1', 'id')]),
      makeTable('t2', 'posts', [
        makePkColumn('c2', 'id'),
        makeFkColumn('c3', 'user_id', 'users', 'id', 'CASCADE'),
      ]),
    ];

    const result = simulateCascade(tables, 't1', 'DELETE');

    // Edge format: ${sourceTableId}-${columnId}-${targetTableId}
    // posts.user_id -> users: t2-c3-t1
    expect(result.affectedEdgeIds.has('t2-c3-t1')).toBe(true);
  });

  it('builds correct affectedTableIds set', () => {
    const tables: ITable[] = [
      makeTable('t1', 'users', [makePkColumn('c1', 'id')]),
      makeTable('t2', 'posts', [
        makePkColumn('c2', 'id'),
        makeFkColumn('c3', 'user_id', 'users', 'id', 'CASCADE'),
      ]),
      makeTable('t3', 'tags', [
        makePkColumn('c4', 'id'),
        makeFkColumn('c5', 'user_id', 'users', 'id', 'SET NULL'),
      ]),
    ];

    const result = simulateCascade(tables, 't1', 'DELETE');

    expect(result.affectedTableIds.has('t2')).toBe(true);
    expect(result.affectedTableIds.has('t3')).toBe(true);
    expect(result.affectedTableIds.has('t1')).toBe(false); // source is not in affected
  });

  it('handles mixed CASCADE + RESTRICT in same level', () => {
    const tables: ITable[] = [
      makeTable('t1', 'users', [makePkColumn('c1', 'id')]),
      makeTable('t2', 'posts', [
        makePkColumn('c2', 'id'),
        makeFkColumn('c3', 'user_id', 'users', 'id', 'CASCADE'),
      ]),
      makeTable('t3', 'orders', [
        makePkColumn('c4', 'id'),
        makeFkColumn('c5', 'user_id', 'users', 'id', 'RESTRICT'),
      ]),
    ];

    const result = simulateCascade(tables, 't1', 'DELETE');

    expect(result.affectedNodes).toHaveLength(1);
    expect(result.affectedNodes[0].tableName).toBe('posts');
    expect(result.blockedNodes).toHaveLength(1);
    expect(result.blockedNodes[0].tableName).toBe('orders');
    expect(result.isBlocked).toBe(true);
  });

  it('stores sourceColumnName in result', () => {
    const tables: ITable[] = [
      makeTable('t1', 'users', [makePkColumn('c1', 'id')]),
    ];

    const result = simulateCascade(tables, 't1', 'UPDATE', 'id');
    expect(result.sourceColumnName).toBe('id');

    const result2 = simulateCascade(tables, 't1', 'DELETE');
    expect(result2.sourceColumnName).toBeNull();
  });

  it('UPDATE with column filters to only FKs referencing that column', () => {
    // users has id and email columns
    // posts references users.id (ON UPDATE CASCADE)
    // audit_logs references users.email (ON UPDATE CASCADE)
    const tables: ITable[] = [
      makeTable('t1', 'users', [
        makePkColumn('c1', 'id'),
        { id: 'c1b', name: 'email', dataType: 'VARCHAR', keyTypes: ['UK'], defaultValue: null, nullable: false, comment: '', reference: null, constraints: [], ordinalPosition: 1 },
      ]),
      makeTable('t2', 'posts', [
        makePkColumn('c2', 'id'),
        makeFkColumn('c3', 'user_id', 'users', 'id', 'NO ACTION', 'CASCADE'),
      ]),
      makeTable('t3', 'audit_logs', [
        makePkColumn('c4', 'id'),
        makeFkColumn('c5', 'user_email', 'users', 'email', 'NO ACTION', 'CASCADE'),
      ]),
    ];

    // UPDATE users.id → only posts affected
    const resultId = simulateCascade(tables, 't1', 'UPDATE', 'id');
    expect(resultId.affectedNodes).toHaveLength(1);
    expect(resultId.affectedNodes[0].tableName).toBe('posts');

    // UPDATE users.email → only audit_logs affected
    const resultEmail = simulateCascade(tables, 't1', 'UPDATE', 'email');
    expect(resultEmail.affectedNodes).toHaveLength(1);
    expect(resultEmail.affectedNodes[0].tableName).toBe('audit_logs');

    // DELETE → both affected (no column filter for DELETE)
    const resultDelete = simulateCascade(tables, 't1', 'DELETE');
    // Both have NO ACTION on delete, so they're blocked
    expect(resultDelete.blockedNodes).toHaveLength(2);
  });

  it('UPDATE without column shows all FKs (backward compat)', () => {
    const tables: ITable[] = [
      makeTable('t1', 'users', [makePkColumn('c1', 'id')]),
      makeTable('t2', 'posts', [
        makePkColumn('c2', 'id'),
        makeFkColumn('c3', 'user_id', 'users', 'id', 'NO ACTION', 'CASCADE'),
      ]),
    ];

    const result = simulateCascade(tables, 't1', 'UPDATE');
    expect(result.affectedNodes).toHaveLength(1);
    expect(result.sourceColumnName).toBeNull();
  });

  it('column-level UPDATE propagates changed column through BFS', () => {
    // users.id → posts.user_id (CASCADE)
    // posts.user_id → post_meta.post_user_id (CASCADE)
    // This tests that at depth 2, the filter uses the cascaded column name
    const tables: ITable[] = [
      makeTable('t1', 'users', [makePkColumn('c1', 'id')]),
      makeTable('t2', 'posts', [
        makePkColumn('c2', 'id'),
        makeFkColumn('c3', 'user_id', 'users', 'id', 'NO ACTION', 'CASCADE'),
      ]),
      makeTable('t3', 'post_meta', [
        makePkColumn('c4', 'id'),
        makeFkColumn('c5', 'post_user_id', 'posts', 'user_id', 'NO ACTION', 'CASCADE'),
      ]),
    ];

    const result = simulateCascade(tables, 't1', 'UPDATE', 'id');

    expect(result.affectedNodes).toHaveLength(2);
    expect(result.affectedNodes[0].tableName).toBe('posts');
    expect(result.affectedNodes[1].tableName).toBe('post_meta');
    expect(result.affectedNodes[1].depth).toBe(2);
  });
});

describe('resolveSteps', () => {
  it('returns single resolve step for single RESTRICT blocked node', () => {
    const tables: ITable[] = [
      makeTable('t1', 'users', [makePkColumn('c1', 'id')]),
      makeTable('t2', 'orders', [
        makePkColumn('c2', 'id'),
        makeFkColumn('c3', 'user_id', 'users', 'id', 'RESTRICT'),
      ]),
    ];

    const result = simulateCascade(tables, 't1', 'DELETE');

    expect(result.resolveSteps).toHaveLength(1);
    expect(result.resolveSteps[0]).toMatchObject({
      order: 1,
      tableName: 'orders',
      tableId: 't2',
      fkColumnName: 'user_id',
      referencedTableName: 'users',
      referencedTableId: 't1',
      depth: 1,
    });
  });

  it('orders multi-depth blocked nodes by depth descending', () => {
    // users → comments (CASCADE) → comment_likes (RESTRICT, depth 2)
    // users → orders (RESTRICT, depth 1)
    const tables: ITable[] = [
      makeTable('t1', 'users', [makePkColumn('c1', 'id')]),
      makeTable('t2', 'comments', [
        makePkColumn('c2', 'id'),
        makeFkColumn('c3', 'user_id', 'users', 'id', 'CASCADE'),
      ]),
      makeTable('t3', 'comment_likes', [
        makePkColumn('c4', 'id'),
        makeFkColumn('c5', 'comment_id', 'comments', 'id', 'RESTRICT'),
      ]),
      makeTable('t4', 'orders', [
        makePkColumn('c6', 'id'),
        makeFkColumn('c7', 'user_id', 'users', 'id', 'RESTRICT'),
      ]),
    ];

    const result = simulateCascade(tables, 't1', 'DELETE');

    expect(result.resolveSteps).toHaveLength(2);
    // Deepest first: comment_likes (depth 2) before orders (depth 1)
    expect(result.resolveSteps[0].tableName).toBe('comment_likes');
    expect(result.resolveSteps[0].order).toBe(1);
    expect(result.resolveSteps[0].depth).toBe(2);
    expect(result.resolveSteps[1].tableName).toBe('orders');
    expect(result.resolveSteps[1].order).toBe(2);
    expect(result.resolveSteps[1].depth).toBe(1);
  });

  it('returns empty resolveSteps when no blocked nodes', () => {
    const tables: ITable[] = [
      makeTable('t1', 'users', [makePkColumn('c1', 'id')]),
      makeTable('t2', 'posts', [
        makePkColumn('c2', 'id'),
        makeFkColumn('c3', 'user_id', 'users', 'id', 'CASCADE'),
      ]),
    ];

    const result = simulateCascade(tables, 't1', 'DELETE');

    expect(result.resolveSteps).toHaveLength(0);
  });

  it('sets canSetNull true when FK column is nullable', () => {
    const tables: ITable[] = [
      makeTable('t1', 'users', [makePkColumn('c1', 'id')]),
      makeTable('t2', 'orders', [
        makePkColumn('c2', 'id'),
        makeFkColumn('c3', 'user_id', 'users', 'id', 'RESTRICT'), // nullable: true (default in makeFkColumn)
      ]),
    ];

    const result = simulateCascade(tables, 't1', 'DELETE');

    expect(result.resolveSteps[0].canSetNull).toBe(true);
  });

  it('sets canSetNull false when FK column is not nullable', () => {
    const tables: ITable[] = [
      makeTable('t1', 'users', [makePkColumn('c1', 'id')]),
      makeTable('t2', 'orders', [
        makePkColumn('c2', 'id'),
        {
          ...makeFkColumn('c3', 'user_id', 'users', 'id', 'RESTRICT'),
          nullable: false,
        },
      ]),
    ];

    const result = simulateCascade(tables, 't1', 'DELETE');

    expect(result.resolveSteps[0].canSetNull).toBe(false);
  });
});

describe('getReferencedColumns', () => {
  it('returns columns referenced by other tables', () => {
    const tables: ITable[] = [
      makeTable('t1', 'users', [
        makePkColumn('c1', 'id'),
        { id: 'c1b', name: 'email', dataType: 'VARCHAR', keyTypes: ['UK'], defaultValue: null, nullable: false, comment: '', reference: null, constraints: [], ordinalPosition: 1 },
      ]),
      makeTable('t2', 'posts', [
        makePkColumn('c2', 'id'),
        makeFkColumn('c3', 'user_id', 'users', 'id', 'CASCADE'),
      ]),
      makeTable('t3', 'audit', [
        makePkColumn('c4', 'id'),
        makeFkColumn('c5', 'user_email', 'users', 'email', 'CASCADE'),
      ]),
    ];

    const cols = getReferencedColumns(tables, 't1');
    expect(cols).toContain('id');
    expect(cols).toContain('email');
    expect(cols).toHaveLength(2);
  });

  it('returns empty array when no references exist', () => {
    const tables: ITable[] = [
      makeTable('t1', 'users', [makePkColumn('c1', 'id')]),
      makeTable('t2', 'posts', [makePkColumn('c2', 'id')]),
    ];

    expect(getReferencedColumns(tables, 't1')).toHaveLength(0);
  });

  it('returns empty array for non-existent table', () => {
    expect(getReferencedColumns([], 'nonexistent')).toHaveLength(0);
  });
});
