import { describe, it, expect } from 'vitest';
import { buildExplainSql, buildExplainAnalyzeSql, classifyQueryType, parseExplainSummary } from './explainSql';

describe('classifyQueryType', () => {
  it('detects SELECT', () => {
    expect(classifyQueryType('SELECT * FROM users')).toBe('SELECT');
  });
  it('detects SELECT with leading comment', () => {
    expect(classifyQueryType('-- comment\nSELECT 1')).toBe('SELECT');
  });
  it('detects INSERT', () => {
    expect(classifyQueryType('INSERT INTO users (name) VALUES (1)')).toBe('DML');
  });
  it('detects UPDATE', () => {
    expect(classifyQueryType('UPDATE users SET name = 1')).toBe('DML');
  });
  it('detects DELETE', () => {
    expect(classifyQueryType('DELETE FROM users WHERE id = 1')).toBe('DML');
  });
  it('detects CREATE TABLE as DDL', () => {
    expect(classifyQueryType('CREATE TABLE t (id int)')).toBe('DDL');
  });
  it('detects DROP as DDL', () => {
    expect(classifyQueryType('DROP TABLE users')).toBe('DDL');
  });
});

describe('buildExplainSql', () => {
  const sql = 'SELECT * FROM users';
  it('postgresql', () => {
    expect(buildExplainSql('postgresql', sql)).toBe('EXPLAIN (FORMAT JSON) SELECT * FROM users');
  });
  it('mysql', () => {
    expect(buildExplainSql('mysql', sql)).toBe('EXPLAIN FORMAT=JSON SELECT * FROM users');
  });
  it('mariadb', () => {
    expect(buildExplainSql('mariadb', sql)).toBe('EXPLAIN FORMAT=JSON SELECT * FROM users');
  });
  it('sqlite', () => {
    expect(buildExplainSql('sqlite', sql)).toBe('EXPLAIN QUERY PLAN SELECT * FROM users');
  });
});

describe('buildExplainAnalyzeSql', () => {
  it('postgresql SELECT', () => {
    expect(buildExplainAnalyzeSql('postgresql', 'SELECT 1', 'SELECT'))
      .toBe('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT 1');
  });
  it('postgresql DDL falls back to EXPLAIN only', () => {
    expect(buildExplainAnalyzeSql('postgresql', 'CREATE TABLE t(id int)', 'DDL'))
      .toBe('EXPLAIN (FORMAT JSON) CREATE TABLE t(id int)');
  });
  it('mysql SELECT', () => {
    expect(buildExplainAnalyzeSql('mysql', 'SELECT 1', 'SELECT'))
      .toBe('EXPLAIN ANALYZE SELECT 1');
  });
  it('mariadb SELECT', () => {
    expect(buildExplainAnalyzeSql('mariadb', 'SELECT 1', 'SELECT'))
      .toBe('ANALYZE FORMAT=JSON SELECT 1');
  });
  it('sqlite always uses EXPLAIN QUERY PLAN', () => {
    expect(buildExplainAnalyzeSql('sqlite', 'SELECT 1', 'SELECT'))
      .toBe('EXPLAIN QUERY PLAN SELECT 1');
  });
});

describe('parseExplainSummary', () => {
  it('parses PG JSON plan', () => {
    const pgRows = [{ 'QUERY PLAN': [{ Plan: { 'Node Type': 'Seq Scan', 'Relation Name': 'users', 'Actual Rows': 12, 'Actual Total Time': 0.45 } }] }];
    const summary = parseExplainSummary(pgRows, 'postgresql');
    expect(summary).toContain('Seq Scan');
    expect(summary).toContain('users');
  });
  it('returns raw text for sqlite', () => {
    const sqliteRows = [{ id: 0, parent: 0, notused: 0, detail: 'SCAN users' }];
    const summary = parseExplainSummary(sqliteRows, 'sqlite');
    expect(summary).toContain('SCAN users');
  });
  it('returns fallback for empty rows', () => {
    const summary = parseExplainSummary([], 'postgresql');
    expect(summary).toBe('');
  });
});
