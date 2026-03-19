import { describe, it, expect } from 'vitest';
import { isDdl } from './ddlDetection';

describe('isDdl', () => {
  it('detects CREATE TABLE', () => expect(isDdl('CREATE TABLE users (id INT)')).toBe(true));
  it('detects ALTER TABLE', () => expect(isDdl('ALTER TABLE users ADD COLUMN name TEXT')).toBe(true));
  it('detects DROP TABLE', () => expect(isDdl('DROP TABLE users')).toBe(true));
  it('detects TRUNCATE', () => expect(isDdl('TRUNCATE TABLE users')).toBe(true));
  it('detects RENAME', () => expect(isDdl('RENAME TABLE users TO users_old')).toBe(true));
  it('detects GRANT', () => expect(isDdl('GRANT SELECT ON users TO role')).toBe(true));
  it('detects REVOKE', () => expect(isDdl('REVOKE SELECT ON users FROM role')).toBe(true));
  it('detects COMMENT ON', () => expect(isDdl('COMMENT ON TABLE users IS \'desc\'')).toBe(true));
  it('ignores leading -- comments', () => expect(isDdl('-- note\nDROP TABLE users')).toBe(true));
  it('ignores leading /* */ comments', () => expect(isDdl('/* note */\nDROP TABLE users')).toBe(true));
  it('ignores multiple leading comments', () => expect(isDdl('-- a\n-- b\n/* c */\nCREATE INDEX idx ON t(c)')).toBe(true));
  it('returns false for SELECT', () => expect(isDdl('SELECT * FROM users')).toBe(false));
  it('returns false for INSERT', () => expect(isDdl('INSERT INTO users VALUES (1)')).toBe(false));
  it('returns false for UPDATE', () => expect(isDdl('UPDATE users SET name = \'a\'')).toBe(false));
  it('returns false for DELETE', () => expect(isDdl('DELETE FROM users WHERE id = 1')).toBe(false));
  it('returns false for empty string', () => expect(isDdl('')).toBe(false));
  it('handles whitespace-only', () => expect(isDdl('   ')).toBe(false));
  it('case insensitive', () => expect(isDdl('create table t (id int)')).toBe(true));
});
