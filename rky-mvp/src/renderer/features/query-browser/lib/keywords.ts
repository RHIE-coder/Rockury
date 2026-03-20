/**
 * Keyword template syntax: {{keyword_name}}
 * Extracts unique keyword names from SQL and replaces them with values.
 */

const KEYWORD_REGEX = /\{\{(\w+)\}\}/g;

/** Extract unique keyword names from SQL (excludes quoted '{{x}}' or "{{x}}") */
export function extractKeywords(sql: string): string[] {
  const keywords = new Set<string>();
  const regex = /(['"])\{\{(\w+)\}\}\1|\{\{(\w+)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sql)) !== null) {
    // match[1] = quote char (if quoted → skip), match[3] = bare keyword name
    if (!match[1] && match[3]) {
      keywords.add(match[3]);
    }
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

/**
 * Replace {{keyword}} with corresponding values.
 * - '{{x}}' or "{{x}}" (quoted) → treated as literal string, NOT replaced.
 * - {{x}} (bare) → replaced. Numbers/NULL stay bare, strings get auto single-quoted.
 * Unmatched keywords are left as-is.
 */
export function replaceKeywords(sql: string, values: Record<string, string>): string {
  // Match both quoted and bare keyword patterns.
  // Quoted: '{{x}}' or "{{x}}" → skip (literal).
  // Bare: {{x}} → replace.
  return sql.replace(/(['"])\{\{(\w+)\}\}\1|\{\{(\w+)\}\}/g, (full, quote, quotedName, bareName) => {
    if (quote) {
      // Quoted → literal, keep as-is (the quotes + keyword text)
      return full;
    }

    const name = bareName;
    if (!(name in values)) return full;
    const val = values[name];

    if (/^-?\d+(\.\d+)?$/.test(val)) {
      return val;
    }
    if (val.toUpperCase() === 'NULL') {
      return 'NULL';
    }
    return `'${val.replace(/'/g, "''")}'`;
  });
}

/** Check if SQL contains any bare (non-quoted) keywords */
export function hasKeywords(sql: string): boolean {
  return extractKeywords(sql).length > 0;
}
