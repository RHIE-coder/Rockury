import { describe, it, expect } from 'vitest';
import { extractKeywords, extractKeywordsFromMultiple, replaceKeywords, hasKeywords } from './keywords';

describe('extractKeywords', () => {
  it('extracts single keyword', () => {
    expect(extractKeywords('SELECT * FROM users WHERE id = {{user_id}}')).toEqual(['user_id']);
  });
  it('extracts multiple keywords', () => {
    expect(extractKeywords('SELECT * FROM orders WHERE date > {{start}} AND date < {{end}}')).toEqual(['start', 'end']);
  });
  it('deduplicates', () => {
    expect(extractKeywords('{{id}} AND {{id}}')).toEqual(['id']);
  });
  it('returns empty for no keywords', () => {
    expect(extractKeywords('SELECT 1')).toEqual([]);
  });
  it('excludes single-quoted keywords', () => {
    expect(extractKeywords("WHERE name = '{{name}}' AND id = {{id}}")).toEqual(['id']);
  });
  it('excludes double-quoted keywords', () => {
    expect(extractKeywords('WHERE name = "{{name}}"')).toEqual([]);
  });
});

describe('extractKeywordsFromMultiple', () => {
  it('collects from multiple sqls deduped', () => {
    const result = extractKeywordsFromMultiple([
      'SELECT * WHERE id = {{user_id}}',
      'DELETE WHERE id = {{user_id}} AND date = {{date}}',
    ]);
    expect(result).toEqual(['user_id', 'date']);
  });
});

describe('replaceKeywords', () => {
  it('auto-quotes string values', () => {
    const result = replaceKeywords('WHERE id = {{user_id}}', { user_id: 'c4ded0b8-59cd-4f' });
    expect(result).toBe("WHERE id = 'c4ded0b8-59cd-4f'");
  });
  it('keeps numbers bare', () => {
    const result = replaceKeywords('WHERE id = {{user_id}}', { user_id: '42' });
    expect(result).toBe('WHERE id = 42');
  });
  it('keeps NULL bare', () => {
    const result = replaceKeywords('WHERE id = {{val}}', { val: 'NULL' });
    expect(result).toBe('WHERE id = NULL');
  });
  it('preserves quoted keywords as literal text', () => {
    const result = replaceKeywords("WHERE name = '{{name}}'", { name: "anything" });
    expect(result).toBe("WHERE name = '{{name}}'");
  });
  it('preserves double-quoted keywords as literal text', () => {
    const result = replaceKeywords('WHERE name = "{{name}}"', { name: "anything" });
    expect(result).toBe('WHERE name = "{{name}}"');
  });
  it('leaves unmatched keywords', () => {
    const result = replaceKeywords('{{a}} and {{b}}', { a: '1' });
    expect(result).toBe('1 and {{b}}');
  });
  it('handles multiple occurrences', () => {
    const result = replaceKeywords('{{x}} + {{x}}', { x: '5' });
    expect(result).toBe('5 + 5');
  });
  it('escapes single quotes in auto-quoted values', () => {
    const result = replaceKeywords('WHERE name = {{name}}', { name: "it's" });
    expect(result).toBe("WHERE name = 'it''s'");
  });
});

describe('hasKeywords', () => {
  it('returns true if keywords exist', () => {
    expect(hasKeywords('SELECT {{id}}')).toBe(true);
  });
  it('returns false if no keywords', () => {
    expect(hasKeywords('SELECT 1')).toBe(false);
  });
});
