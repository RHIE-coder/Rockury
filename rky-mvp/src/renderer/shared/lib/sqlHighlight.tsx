import { Fragment } from 'react';

const SQL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'AS', 'ON', 'IS',
  'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'NATURAL',
  'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'DROP',
  'ALTER', 'TABLE', 'VIEW', 'INDEX', 'WITH', 'RECURSIVE', 'DISTINCT',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'BETWEEN', 'LIKE', 'ILIKE',
  'EXISTS', 'ANY', 'SOME', 'NULL', 'TRUE', 'FALSE', 'ASC', 'DESC',
  'CAST', 'COALESCE', 'NULLIF', 'MATERIALIZED',
]);

const SQL_FUNCTIONS = new Set([
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ARRAY_AGG', 'STRING_AGG',
  'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LAG', 'LEAD', 'FIRST_VALUE',
  'LAST_VALUE', 'OVER', 'PARTITION', 'EXTRACT', 'DATE_TRUNC',
  'CONCAT', 'LENGTH', 'LOWER', 'UPPER', 'TRIM', 'SUBSTRING',
  'NOW', 'CURRENT_TIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME',
  'ROUND', 'FLOOR', 'CEIL', 'ABS', 'GREATEST', 'LEAST',
  'JSONB_BUILD_OBJECT', 'JSON_AGG', 'TO_CHAR', 'TO_DATE',
]);

// Tokenize SQL into typed spans
// Token types: keyword, function, string, number, comment, operator, identifier
type TokenType = 'keyword' | 'function' | 'string' | 'number' | 'comment' | 'operator' | 'default';

interface Token {
  type: TokenType;
  value: string;
}

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < sql.length) {
    // Line comment
    if (sql[i] === '-' && sql[i + 1] === '-') {
      const end = sql.indexOf('\n', i);
      const value = end === -1 ? sql.slice(i) : sql.slice(i, end);
      tokens.push({ type: 'comment', value });
      i += value.length;
      continue;
    }

    // Block comment
    if (sql[i] === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      const value = end === -1 ? sql.slice(i) : sql.slice(i, end + 2);
      tokens.push({ type: 'comment', value });
      i += value.length;
      continue;
    }

    // String literal (single quotes)
    if (sql[i] === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === "'") { j++; break; }
        j++;
      }
      tokens.push({ type: 'string', value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // Number
    if (/\d/.test(sql[i]) && (i === 0 || /[\s,=(]/.test(sql[i - 1]))) {
      let j = i;
      while (j < sql.length && /[\d.]/.test(sql[j])) j++;
      tokens.push({ type: 'number', value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // Word (keyword, function, or identifier)
    if (/[a-zA-Z_]/.test(sql[i])) {
      let j = i;
      while (j < sql.length && /[a-zA-Z0-9_]/.test(sql[j])) j++;
      const word = sql.slice(i, j);
      const upper = word.toUpperCase();
      if (SQL_KEYWORDS.has(upper)) {
        tokens.push({ type: 'keyword', value: word });
      } else if (SQL_FUNCTIONS.has(upper)) {
        tokens.push({ type: 'function', value: word });
      } else {
        tokens.push({ type: 'default', value: word });
      }
      i = j;
      continue;
    }

    // Operators
    if (/[=<>!+\-*/%]/.test(sql[i])) {
      let j = i;
      while (j < sql.length && /[=<>!]/.test(sql[j])) j++;
      if (j === i) j++;
      tokens.push({ type: 'operator', value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // Everything else (whitespace, parens, commas, dots, etc.)
    tokens.push({ type: 'default', value: sql[i] });
    i++;
  }

  return tokens;
}

const TOKEN_CLASSES: Record<TokenType, string> = {
  keyword: 'text-blue-600 dark:text-blue-400 font-semibold',
  function: 'text-amber-600 dark:text-amber-400',
  string: 'text-green-600 dark:text-green-400',
  number: 'text-purple-600 dark:text-purple-400',
  comment: 'text-muted-foreground/60 italic',
  operator: 'text-rose-600 dark:text-rose-400',
  default: '',
};

export function HighlightedSql({ sql, className = '' }: { sql: string; className?: string }) {
  const tokens = tokenize(sql);
  return (
    <code className={className}>
      {tokens.map((token, i) => {
        const cls = TOKEN_CLASSES[token.type];
        return cls ? (
          <span key={i} className={cls}>{token.value}</span>
        ) : (
          <Fragment key={i}>{token.value}</Fragment>
        );
      })}
    </code>
  );
}
