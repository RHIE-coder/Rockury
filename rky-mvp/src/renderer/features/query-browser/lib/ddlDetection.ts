export function isDdl(sql: string): boolean {
  const stripped = sql.replace(/^\s*(--[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/g, '').trim();
  const normalized = stripped.toUpperCase();
  return /^(CREATE|ALTER|DROP|TRUNCATE|RENAME|GRANT|REVOKE|COMMENT\s+ON)\s/.test(normalized);
}
