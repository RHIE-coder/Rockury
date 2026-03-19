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

/**
 * Replace {{keyword}} with corresponding values.
 * - If the keyword is already inside quotes (e.g. '{{x}}'), replace the value as-is.
 * - Otherwise, auto-quote: numbers stay bare, everything else gets single-quoted (with escaping).
 * Unmatched keywords are left as-is.
 */
export function replaceKeywords(sql: string, values: Record<string, string>): string {
  // Use a regex that also captures the character before {{ to detect quoting
  return sql.replace(/(['"]?)\{\{(\w+)\}\}\1/g, (full, quote, name) => {
    if (!(name in values)) return full;
    const val = values[name];

    if (quote) {
      // Already quoted by user, e.g. '{{x}}' → 'value'
      return `${quote}${val.replace(/'/g, "''")}${quote}`;
    }

    // Auto-detect: if it looks like a number, keep bare; otherwise single-quote
    if (/^-?\d+(\.\d+)?$/.test(val)) {
      return val;
    }
    // NULL keyword
    if (val.toUpperCase() === 'NULL') {
      return 'NULL';
    }
    return `'${val.replace(/'/g, "''")}'`;
  });
}

/** Check if SQL contains any keywords */
export function hasKeywords(sql: string): boolean {
  return KEYWORD_REGEX.test(sql);
}
