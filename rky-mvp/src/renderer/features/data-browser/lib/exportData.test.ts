import { describe, it, expect } from 'vitest';
import { toCsv, toJson, toSqlInsert } from './exportData';

const columns = ['id', 'name', 'age'];
const rows = [
  { id: 1, name: 'John', age: 30 },
  { id: 2, name: "O'Brien", age: null },
];

describe('toCsv', () => {
  it('generates CSV with header', () => {
    const result = toCsv(columns, rows);
    expect(result).toBe('id,name,age\n1,John,30\n2,O\'Brien,');
  });
});

describe('toJson', () => {
  it('generates JSON array', () => {
    const result = toJson(rows);
    expect(JSON.parse(result)).toEqual(rows);
  });
});

describe('toSqlInsert', () => {
  it('generates INSERT statements', () => {
    const result = toSqlInsert('users', 'mysql', columns, rows);
    expect(result).toContain('INSERT INTO `users`');
    expect(result).toContain("'John'");
    expect(result).toContain('NULL');
  });
});
