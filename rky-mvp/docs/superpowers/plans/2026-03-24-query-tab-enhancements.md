# Query Tab Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SQL Formatter, EXPLAIN button, and automatic EXPLAIN ANALYZE on every Run to the Query tab.

**Architecture:** Three features layered incrementally. Feature 1 (Formatter) is frontend-only. Feature 2 (EXPLAIN) reuses existing QUERY_EXECUTE IPC. Feature 3 (EXPLAIN ANALYZE) adds a new IPC channel with vendor-specific SQL generation, DML safety via BEGIN/ROLLBACK, and a summary banner component.

**Tech Stack:** sql-formatter, CodeMirror v6, Electron IPC, React, Zustand

**Spec:** `docs/superpowers/specs/2026-03-24-query-tab-enhancements-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/shared/lib/explainSql.ts` | Vendor-specific EXPLAIN SQL builder + summary parser (shared by main+renderer) |
| `src/shared/lib/explainSql.test.ts` | Tests for SQL builder + parser |
| `src/renderer/features/query-browser/ui/ExplainSummaryBanner.tsx` | EXPLAIN ANALYZE summary display above DataGrid |

### Modified Files
| File | Changes |
|------|---------|
| `package.json` | Add `sql-formatter` dependency |
| `src/shared/ipc/channels.ts` | Add `QUERY_EXPLAIN_ANALYZE` channel |
| `src/shared/ipc/events.ts` | Add event type for `QUERY_EXPLAIN_ANALYZE` |
| `src/shared/types/db.ts` | Add `IExplainResult` interface, add `explainSummary` to `IQueryHistory` |
| `src/app/preload.ts` | Add `QUERY_EXPLAIN_ANALYZE` bridge |
| `src/renderer/features/query-execution/api/queryApi.ts` | Add `explainAnalyze()` API function |
| `src/renderer/features/query-browser/ui/SqlEditorPanel.tsx` | Add Format + Explain buttons, `onExplain` prop |
| `src/renderer/features/query-browser/model/useQueryExecution.ts` | Add `explainResult` state, call EXPLAIN ANALYZE before Run |
| `src/renderer/features/query-browser/ui/QueryTab.tsx` | Wire handleExplain, render ExplainSummaryBanner |
| `src/main/ipc/handlers/queryHandlers.ts` | Register EXPLAIN_ANALYZE handler |
| `src/main/services/queryService.ts` | Add `explainAnalyze()` method with DML safety |

---

## Task 1: Install sql-formatter dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install sql-formatter**

```bash
npm install sql-formatter
```

- [ ] **Step 2: Verify install**

```bash
node -e "const {format} = require('sql-formatter'); console.log(format('SELECT id,name FROM users WHERE id=1'))"
```

Expected: Formatted SQL output.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(query-browser): add sql-formatter dependency"
```

---

## Task 2: Add EXPLAIN SQL builder and parser (in shared/lib)

**Files:**
- Create: `src/shared/lib/explainSql.ts`
- Create: `src/shared/lib/explainSql.test.ts`

> Created directly in `src/shared/lib/` so both main process and renderer can import without cross-boundary issues.

- [ ] **Step 1: Write tests**

```typescript
// src/shared/lib/explainSql.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/shared/lib/explainSql.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement explainSql.ts**

```typescript
// src/shared/lib/explainSql.ts
import type { TDbType } from '~/shared/types/db';

export type TQueryType = 'SELECT' | 'DML' | 'DDL';

export function classifyQueryType(sql: string): TQueryType {
  const stripped = sql.replace(/^\s*(--[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/g, '').trim();
  const upper = stripped.toUpperCase();

  if (/^(CREATE|ALTER|DROP|TRUNCATE|RENAME|GRANT|REVOKE|COMMENT\s+ON)\s/.test(upper)) return 'DDL';
  if (/^(INSERT|UPDATE|DELETE)\s/.test(upper)) return 'DML';
  return 'SELECT';
}

export function buildExplainSql(dbType: TDbType, sql: string): string {
  switch (dbType) {
    case 'postgresql': return `EXPLAIN (FORMAT JSON) ${sql}`;
    case 'mysql':
    case 'mariadb': return `EXPLAIN FORMAT=JSON ${sql}`;
    case 'sqlite': return `EXPLAIN QUERY PLAN ${sql}`;
    default: return `EXPLAIN ${sql}`;
  }
}

export function buildExplainAnalyzeSql(dbType: TDbType, sql: string, queryType: TQueryType): string {
  if (dbType === 'sqlite') return `EXPLAIN QUERY PLAN ${sql}`;
  if (queryType === 'DDL') return buildExplainSql(dbType, sql);

  switch (dbType) {
    case 'postgresql': return `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`;
    case 'mysql': return `EXPLAIN ANALYZE ${sql}`;
    case 'mariadb': return `ANALYZE FORMAT=JSON ${sql}`;
    default: return `EXPLAIN ANALYZE ${sql}`;
  }
}

export function parseExplainSummary(rows: Record<string, unknown>[], dbType: TDbType): string {
  if (!rows || rows.length === 0) return '';

  try {
    if (dbType === 'sqlite') {
      return rows.map((r) => String(r.detail ?? '')).filter(Boolean).join(' → ');
    }

    if (dbType === 'postgresql') {
      const raw = rows[0]?.['QUERY PLAN'];
      const plans = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : null);
      if (!plans?.[0]?.Plan) return JSON.stringify(rows[0]).slice(0, 120);

      const plan = plans[0].Plan;
      const parts: string[] = [];
      parts.push(plan['Node Type'] ?? '');
      if (plan['Relation Name']) parts.push(`on ${plan['Relation Name']}`);
      if (typeof plan['Actual Rows'] === 'number') parts.push(`${plan['Actual Rows']} rows`);
      if (typeof plan['Actual Total Time'] === 'number') parts.push(`${plan['Actual Total Time']}ms`);
      if (typeof plan['Rows Removed by Filter'] === 'number') parts.push(`Rows Removed: ${plan['Rows Removed by Filter']}`);
      return parts.filter(Boolean).join(' · ');
    }

    // MySQL / MariaDB
    const firstRow = rows[0];
    const jsonStr = Object.values(firstRow)[0];
    if (typeof jsonStr === 'string') {
      try {
        const parsed = JSON.parse(jsonStr);
        const table = parsed?.query_block?.table;
        if (table) {
          const parts: string[] = [];
          if (table.access_type) parts.push(table.access_type);
          if (table.table_name) parts.push(`on ${table.table_name}`);
          if (typeof table.rows_examined_per_scan === 'number') parts.push(`${table.rows_examined_per_scan} rows examined`);
          return parts.filter(Boolean).join(' · ');
        }
        return JSON.stringify(parsed).slice(0, 120);
      } catch { return String(jsonStr).slice(0, 120); }
    }
    return JSON.stringify(firstRow).slice(0, 120);
  } catch { return ''; }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/shared/lib/explainSql.test.ts
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/explainSql.ts src/shared/lib/explainSql.test.ts
git commit -m "feat(shared): add EXPLAIN SQL builder and summary parser"
```

---

## Task 3: Add shared types, IPC channel, events, and preload

**Files:**
- Modify: `src/shared/types/db.ts`
- Modify: `src/shared/ipc/channels.ts`
- Modify: `src/shared/ipc/events.ts`
- Modify: `src/app/preload.ts`

- [ ] **Step 1: Add IExplainResult interface to db.ts**

After the `IQueryResult` interface (around line 557), add:

```typescript
export interface IExplainResult {
  planRows: Record<string, unknown>[];
  summary: string;
  rawJson?: unknown;
}
```

- [ ] **Step 2: Add explainSummary field to IQueryHistory**

In the `IQueryHistory` interface (around line 548, before `executedAt`), add:

```typescript
  explainSummary?: string;
```

- [ ] **Step 3: Add QUERY_EXPLAIN_ANALYZE channel to channels.ts**

In the Query section (after `QUERY_HISTORY_LIST` line 100), add:

```typescript
  QUERY_EXPLAIN_ANALYZE: 'QUERY_EXPLAIN_ANALYZE',
```

- [ ] **Step 4: Add event type to events.ts**

Find the QUERY_EXECUTE event entry and add after it (follow the existing pattern):

```typescript
  [CHANNELS.QUERY_EXPLAIN_ANALYZE]: {
    args: { connectionId: string; sql: string; dbType: string };
    response: { success: boolean; data: IExplainResult | null; error?: string };
  };
```

Ensure `IExplainResult` is imported at the top of events.ts if types are imported there.

- [ ] **Step 5: Add preload bridge to preload.ts**

Find the QUERY_EXECUTE entry and add after it (follow the existing pattern):

```typescript
  [CHANNELS.QUERY_EXPLAIN_ANALYZE]: (args: any) =>
    ipcRenderer.invoke(CHANNELS.QUERY_EXPLAIN_ANALYZE, args),
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/shared/types/db.ts src/shared/ipc/channels.ts src/shared/ipc/events.ts src/app/preload.ts
git commit -m "feat(query): add IExplainResult type, EXPLAIN_ANALYZE IPC channel, events, and preload"
```

---

## Task 4: Add EXPLAIN ANALYZE backend service

**Files:**
- Modify: `src/main/services/queryService.ts`
- Modify: `src/main/ipc/handlers/queryHandlers.ts`

- [ ] **Step 1: Update imports in queryService.ts**

Update the import on line 5 to include new types:

```typescript
import type { IQuery, IQueryResult, IQueryHistory, IExplainResult } from '~/shared/types/db';
import type { TDbType } from '~/shared/types/db';
```

Add import for shared explainSql functions:

```typescript
import { classifyQueryType, buildExplainAnalyzeSql, parseExplainSummary } from '~/shared/lib/explainSql';
```

- [ ] **Step 2: Add explainAnalyze method to queryService**

At the end of the `queryService` object (before the closing `};`), add:

```typescript
  async explainAnalyze(connectionId: string, sql: string, dbType: TDbType): Promise<IExplainResult> {
    const config = connectionService.getConnectionConfig(connectionId);
    const queryType = classifyQueryType(sql);
    const explainSql = buildExplainAnalyzeSql(dbType, sql, queryType);
    const needsRollback = queryType === 'DML' && dbType !== 'sqlite';

    let result: IQueryResult;

    if (needsRollback) {
      if (config.dbType === 'mysql' || config.dbType === 'mariadb') {
        const conn = await createMysqlConnection({
          host: config.host, port: config.port, database: config.database,
          username: config.username, password: config.password,
          sslEnabled: config.sslEnabled, sslConfig: config.sslConfig,
        });
        try {
          await conn.query('BEGIN');
          try {
            const [results, fields] = await conn.query(explainSql);
            result = mapMysqlResult(results, fields);
          } finally {
            await conn.query('ROLLBACK');
          }
        } finally {
          await closeMysqlConnection(conn);
        }
      } else {
        const client = await createPgConnection({
          host: config.host, port: config.port, database: config.database,
          username: config.username, password: config.password,
          sslEnabled: config.sslEnabled, sslConfig: config.sslConfig,
        });
        try {
          await client.query('BEGIN');
          try {
            const pgResult = await client.query(explainSql);
            result = {
              columns: pgResult.fields?.map((f) => f.name) ?? [],
              rows: pgResult.rows ?? [],
              rowCount: pgResult.rows?.length ?? 0,
              executionTimeMs: 0,
            };
          } finally {
            await client.query('ROLLBACK');
          }
        } finally {
          await closePgConnection(client);
        }
      }
    } else if (dbType === 'sqlite') {
      // SQLite: not yet supported for execution, return empty result
      return { planRows: [], summary: 'SQLite EXPLAIN not yet supported', rawJson: undefined };
    } else {
      result = await this.executeQuery(connectionId, explainSql);
    }

    const summary = parseExplainSummary(result.rows, dbType);
    return {
      planRows: result.rows,
      summary,
      rawJson: result.rows.length > 0 ? result.rows[0] : undefined,
    };
  },
```

- [ ] **Step 3: Register IPC handler in queryHandlers.ts**

After the `QUERY_HISTORY_LIST` handler, add:

```typescript
  ipcMain.handle(CHANNELS.QUERY_EXPLAIN_ANALYZE, async (_event, args: { connectionId: string; sql: string; dbType: string }) => {
    try {
      const data = await queryService.explainAnalyze(args.connectionId, args.sql, args.dbType as any);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/main/services/queryService.ts src/main/ipc/handlers/queryHandlers.ts
git commit -m "feat(query): add EXPLAIN ANALYZE backend service with DML safety"
```

---

## Task 5: Add frontend API function

**Files:**
- Modify: `src/renderer/features/query-execution/api/queryApi.ts`

- [ ] **Step 1: Add explainAnalyze to queryApi**

```typescript
  explainAnalyze: (args: { connectionId: string; sql: string; dbType: string }) =>
    api.QUERY_EXPLAIN_ANALYZE(args),
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/features/query-execution/api/queryApi.ts
git commit -m "feat(query): add explainAnalyze API function"
```

---

## Task 6: Add ExplainSummaryBanner component

**Files:**
- Create: `src/renderer/features/query-browser/ui/ExplainSummaryBanner.tsx`

- [ ] **Step 1: Create the banner component**

```typescript
// src/renderer/features/query-browser/ui/ExplainSummaryBanner.tsx
import { Zap } from 'lucide-react';

interface ExplainSummaryBannerProps {
  summary: string;
}

export function ExplainSummaryBanner({ summary }: ExplainSummaryBannerProps) {
  if (!summary) return null;

  return (
    <div className="flex items-center gap-1.5 border-b border-border bg-muted/30 px-3 py-1">
      <Zap className="size-3 shrink-0 text-amber-500" />
      <span className="truncate text-xs text-muted-foreground">{summary}</span>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/features/query-browser/ui/ExplainSummaryBanner.tsx
git commit -m "feat(query-browser): add ExplainSummaryBanner component"
```

---

## Task 7: Add Format and Explain buttons to SqlEditorPanel

**Files:**
- Modify: `src/renderer/features/query-browser/ui/SqlEditorPanel.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { Paintbrush, Zap } from 'lucide-react';
import { format as formatSql } from 'sql-formatter';
```

- [ ] **Step 2: Update SqlEditorPanelProps interface**

```typescript
interface SqlEditorPanelProps {
  initialValue: string;
  onContentChange?: (value: string) => void;
  onRun: (sql: string) => void;
  onExplain?: (sql: string) => void;  // NEW
  isLoading?: boolean;
  sqlSchema?: Record<string, readonly string[]>;
  dbType?: TDbType;
}
```

- [ ] **Step 3: Add FORMATTER_DIALECT map and handlers inside component**

```typescript
const FORMATTER_DIALECT: Record<string, string> = {
  postgresql: 'postgresql',
  mysql: 'mysql',
  mariadb: 'mariadb',
  sqlite: 'sqlite',
};
```

Inside the component, after `handleRun`, add:

```typescript
    const onExplainRef = useRef(onExplain);
    onExplainRef.current = onExplain;

    const handleFormat = useCallback(() => {
      const view = viewRef.current;
      if (!view) return;
      const raw = view.state.doc.toString();
      if (!raw.trim()) return;
      try {
        const formatted = formatSql(raw, {
          language: FORMATTER_DIALECT[dbType ?? 'postgresql'] ?? 'sql',
        });
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: formatted },
        });
      } catch {
        // Formatting failed — leave editor unchanged
      }
    }, [dbType]);

    const handleExplain = useCallback(() => {
      const value = contentRef.current;
      if (!value.trim()) return;
      onExplainRef.current?.(value);
    }, []);
```

- [ ] **Step 4: Replace toolbar buttons JSX**

Replace the `<div className="ml-auto flex items-center gap-1">` section:

```tsx
            <div className="ml-auto flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to run
              </span>
              <Button
                variant="ghost"
                size="xs"
                onClick={handleFormat}
                disabled={isLoading || !hasContent}
                title="Format SQL"
              >
                <Paintbrush className="size-3" />
              </Button>
              {onExplain && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleExplain}
                  disabled={isLoading || !hasContent}
                  title="Explain Plan"
                >
                  <Zap className="size-3" />
                </Button>
              )}
              <Button
                variant="default"
                size="xs"
                onClick={handleRun}
                disabled={isLoading || !hasContent}
              >
                {isLoading ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : (
                  <Play className="mr-1 size-3" />
                )}
                Run
              </Button>
            </div>
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/renderer/features/query-browser/ui/SqlEditorPanel.tsx
git commit -m "feat(query-browser): add Format and Explain buttons to SQL editor toolbar"
```

---

## Task 8: Update useQueryExecution with EXPLAIN support

**Files:**
- Modify: `src/renderer/features/query-browser/model/useQueryExecution.ts`

- [ ] **Step 1: Replace entire file**

```typescript
import { useState, useCallback, useRef } from 'react';
import { queryApi } from '@/features/query-execution/api/queryApi';
import { queryBrowserApi } from '../api/queryBrowserApi';
import { isDdl } from '../lib/ddlDetection';
import { buildExplainSql } from '~/shared/lib/explainSql';
import type { IQueryResult, IExplainResult, TDbType } from '~/shared/types/db';

interface TxState {
  txId: string;
  dmlType: string;
  affectedRows: number;
}

export function useQueryExecution(connectionId: string, dbType?: TDbType) {
  const [result, setResult] = useState<IQueryResult | null>(null);
  const [explainResult, setExplainResult] = useState<IExplainResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [txState, setTxState] = useState<TxState | null>(null);
  const [isDdlWarning, setIsDdlWarning] = useState(false);

  // Generation counter to discard stale EXPLAIN results from previous runs
  const genRef = useRef(0);

  const execute = useCallback(async (sql: string) => {
    const gen = ++genRef.current;
    setError(null);
    setResult(null);
    setExplainResult(null);
    setTxState(null);
    setIsDdlWarning(false);
    setIsLoading(true);

    try {
      // Step 1: EXPLAIN ANALYZE (fire-and-forget, non-blocking)
      if (dbType) {
        queryApi
          .explainAnalyze({ connectionId, sql, dbType })
          .then((res) => {
            // Discard if a newer execution has started
            if (gen !== genRef.current) return;
            if (res.success && res.data) setExplainResult(res.data);
          })
          .catch(() => {});
      }

      // Step 2: Actual query execution (existing logic unchanged)
      if (isDdl(sql)) {
        const res = await queryApi.execute({ connectionId, sql });
        if (!res.success) throw new Error((res as any).error ?? 'DDL execution failed');
        setResult(res.data ?? null);
        setIsDdlWarning(true);
        return;
      }

      const trimmed = sql.replace(/^\s*(--[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/g, '').trim();
      const isDml = /^(INSERT|UPDATE|DELETE)\s/i.test(trimmed);

      if (isDml) {
        const beginRes = await queryBrowserApi.txBegin(connectionId);
        if (!beginRes.success) throw new Error(beginRes.error ?? 'Failed to begin transaction');
        const txId = beginRes.data!.txId;

        const execRes = await queryBrowserApi.txExecute(txId, sql);
        if (!execRes.success) {
          await queryBrowserApi.txRollback(txId).catch(() => {});
          throw new Error(execRes.error ?? 'DML execution failed');
        }

        const dmlType = trimmed.split(/\s/)[0].toUpperCase();
        setTxState({ txId, dmlType, affectedRows: execRes.data?.affectedRows ?? 0 });
        setResult(execRes.data ?? null);
      } else {
        const res = await queryApi.execute({ connectionId, sql });
        if (!res.success) throw new Error((res as any).error ?? 'Query failed');
        setResult(res.data ?? null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [connectionId, dbType]);

  const explain = useCallback(async (sql: string) => {
    if (!dbType) return;
    setError(null);
    setResult(null);
    setExplainResult(null);
    setTxState(null);
    setIsDdlWarning(false);
    setIsLoading(true);

    try {
      const explainSql = buildExplainSql(dbType, sql);
      const res = await queryApi.execute({ connectionId, sql: explainSql });
      if (!res.success) throw new Error((res as any).error ?? 'EXPLAIN failed');
      setResult(res.data ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [connectionId, dbType]);

  const confirm = useCallback(async () => {
    if (!txState) return;
    try {
      const res = await queryBrowserApi.txCommit(txState.txId);
      if (!res.success) throw new Error(res.error ?? 'Commit failed');
      setTxState(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [txState]);

  const rollback = useCallback(async () => {
    if (!txState) return;
    try {
      const res = await queryBrowserApi.txRollback(txState.txId);
      if (!res.success) throw new Error(res.error ?? 'Rollback failed');
      setTxState(null);
      setResult(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [txState]);

  const dismissError = useCallback(() => setError(null), []);

  return {
    result,
    explainResult,
    error,
    isLoading,
    txState,
    isDdlWarning,
    execute,
    explain,
    confirm,
    rollback,
    dismissError,
  };
}
```

Key changes from original:
- Added `dbType` parameter
- Added `explainResult` state + `genRef` (generation counter to prevent stale results)
- EXPLAIN ANALYZE fires in parallel alongside actual query (non-blocking)
- Added `explain` method for standalone EXPLAIN button

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/features/query-browser/model/useQueryExecution.ts
git commit -m "feat(query-browser): add EXPLAIN ANALYZE support to useQueryExecution"
```

---

## Task 9: Wire everything into QueryTab

**Files:**
- Modify: `src/renderer/features/query-browser/ui/QueryTab.tsx`

- [ ] **Step 1: Update useQueryExecution call (line 45)**

```typescript
// Before:
const execution = useQueryExecution(connectionId);
// After:
const execution = useQueryExecution(connectionId, dbType);
```

- [ ] **Step 2: Add handleExplain callback (after handleRun, ~line 189)**

```typescript
  const handleExplain = useCallback((sql: string) => {
    if (!sql.trim()) return;
    saveCurrentSql(sql);

    if (detectedKeywords.length > 0) {
      const hasEmpty = detectedKeywords.some((kw) => !keywordValues[kw]?.trim());
      if (hasEmpty) {
        setShowKeywordError(true);
        return;
      }
      const resolvedSql = replaceKeywords(sql, keywordValues);
      execution.explain(resolvedSql);
    } else {
      execution.explain(sql);
    }
  }, [saveCurrentSql, execution, detectedKeywords, keywordValues]);
```

- [ ] **Step 3: Add onExplain prop to SqlEditorPanel JSX (~line 463)**

```tsx
                <SqlEditorPanel
                  key={queryMeta.id}
                  ref={editorRef}
                  initialValue={loadedSql}
                  onContentChange={handleContentChange}
                  onRun={handleRun}
                  onExplain={handleExplain}
                  isLoading={execution.isLoading}
                  sqlSchema={sqlSchema}
                  dbType={dbType}
                />
```

- [ ] **Step 4: Add ExplainSummaryBanner**

Import at top:
```typescript
import { ExplainSummaryBanner } from './ExplainSummaryBanner';
```

Render banner before the result area (before `{hasSelectResult ? (`):

```tsx
                {/* EXPLAIN ANALYZE summary banner */}
                {execution.explainResult?.summary && (
                  <ExplainSummaryBanner summary={execution.explainResult.summary} />
                )}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/renderer/features/query-browser/ui/QueryTab.tsx
git commit -m "feat(query-browser): wire Format, Explain, EXPLAIN ANALYZE into QueryTab"
```

---

## Task 10: Final verification

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

- [ ] **Step 2: Type-check entire project**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Verify no lint errors**

```bash
npm run lint 2>&1 | head -20
```

- [ ] **Step 4: Manual smoke test checklist**

1. Format button: clicking formats SQL in editor
2. Explain button: clicking shows EXPLAIN result in DataGrid
3. Run button: executes query AND shows EXPLAIN ANALYZE summary banner above DataGrid
4. DML: EXPLAIN ANALYZE uses BEGIN/ROLLBACK (no data changes from EXPLAIN)
5. SQLite: returns "SQLite EXPLAIN not yet supported" message
6. EXPLAIN failure: doesn't block query execution, banner just doesn't appear
7. Rapid re-runs: stale EXPLAIN results are discarded (genRef counter)
