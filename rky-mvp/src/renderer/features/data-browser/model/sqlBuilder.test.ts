import { describe, it, expect } from 'vitest';
import { buildSelectQuery, quoteIdentifier, escapeValue } from './sqlBuilder';

describe('quoteIdentifier', () => {
  it('quotes with backtick for mysql', () => {
    expect(quoteIdentifier('users', 'mysql')).toBe('`users`');
  });
  it('quotes with double-quote for postgresql', () => {
    expect(quoteIdentifier('users', 'postgresql')).toBe('"users"');
  });
  it('escapes embedded backtick', () => {
    expect(quoteIdentifier('my`table', 'mysql')).toBe('`my``table`');
  });
  it('defaults to backtick for mariadb', () => {
    expect(quoteIdentifier('t', 'mariadb')).toBe('`t`');
  });
});

describe('escapeValue', () => {
  it('returns NULL for null', () => {
    expect(escapeValue(null)).toBe('NULL');
  });
  it('escapes single quotes in strings', () => {
    expect(escapeValue("it's")).toBe("'it''s'");
  });
  it('returns numbers as-is', () => {
    expect(escapeValue(42)).toBe('42');
  });
  it('returns booleans as 1/0', () => {
    expect(escapeValue(true)).toBe('1');
    expect(escapeValue(false)).toBe('0');
  });
});

describe('buildSelectQuery', () => {
  const dbType = 'mysql' as const;

  it('builds basic SELECT', () => {
    expect(buildSelectQuery({ table: 'users', dbType, limit: 50, offset: 0 }))
      .toBe('SELECT * FROM `users` LIMIT 50 OFFSET 0');
  });

  it('adds ORDER BY', () => {
    expect(buildSelectQuery({
      table: 'users', dbType, limit: 50, offset: 0,
      orderBy: { column: 'name', direction: 'ASC' },
    })).toBe('SELECT * FROM `users` ORDER BY `name` ASC LIMIT 50 OFFSET 0');
  });

  it('adds WHERE filters', () => {
    expect(buildSelectQuery({
      table: 'users', dbType, limit: 50, offset: 0,
      filters: [{ column: 'name', operator: 'LIKE', value: '%john%' }],
    })).toBe("SELECT * FROM `users` WHERE `name` LIKE '%john%' LIMIT 50 OFFSET 0");
  });

  it('combines multiple filters with AND', () => {
    expect(buildSelectQuery({
      table: 'users', dbType, limit: 50, offset: 0,
      filters: [
        { column: 'age', operator: '>', value: '18' },
        { column: 'active', operator: '=', value: '1' },
      ],
    })).toBe("SELECT * FROM `users` WHERE `age` > '18' AND `active` = '1' LIMIT 50 OFFSET 0");
  });

  it('handles IS NULL filter', () => {
    expect(buildSelectQuery({
      table: 'users', dbType, limit: 50, offset: 0,
      filters: [{ column: 'deleted_at', operator: 'IS NULL', value: '' }],
    })).toBe('SELECT * FROM `users` WHERE `deleted_at` IS NULL LIMIT 50 OFFSET 0');
  });
});
