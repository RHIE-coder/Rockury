/**
 * Keyword template syntax: {{keyword_name}}
 * Extracts unique keyword names from SQL and replaces them with values.
 */

const KEYWORD_REGEX = /\{\{(\w+)\}\}/g;

/** Extract unique keyword names from SQL */
export function extractKeywords(sql: string): string[] {
  const keywords = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(KEYWORD_REGEX.source, 'g');
  while ((match = regex.exec(sql)) !== null) {
    keywords.add(match[1]);
  }
  return [...keywords];
}

/** Extract keywords from multiple SQL strings (deduped) */
export function extractKeywordsFromMultiple(sqls: string[]): string[] {
  const keywords = new Set<string>();
  for (const sql of sqls) {
    for (const kw of extractKeywords(sql)) {
      keywords.add(kw);
    }
  }
  return [...keywords];
}

/** Replace {{keyword}} with corresponding values. Unmatched keywords are left as-is. */
export function replaceKeywords(sql: string, values: Record<string, string>): string {
  return sql.replace(KEYWORD_REGEX, (full, name) => {
    return name in values ? values[name] : full;
  });
}

/** Check if SQL contains any keywords */
export function hasKeywords(sql: string): boolean {
  return KEYWORD_REGEX.test(sql);
}
