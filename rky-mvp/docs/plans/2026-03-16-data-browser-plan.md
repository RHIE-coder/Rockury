# Data Browser Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Live Console Data 탭에서 DB 테이블 데이터를 TanStack Table 기반으로 조회하고 편집(추가/수정/삭제)할 수 있는 Data Browser를 구현한다.

**Architecture:** 기존 `QUERY_EXECUTE` IPC 채널과 `queryService`를 재사용한다. TanStack Table (headless)로 그리드를 구성하고, Pending Changes 패턴으로 변경사항을 SQL로 변환하여 일괄 적용한다. 좌측 테이블 리스트 패널 + 우측 데이터 그리드 레이아웃.

**Tech Stack:** @tanstack/react-table, @tanstack/react-query, React 19, Tailwind CSS, Radix UI, Zustand, Electron IPC

**Design Doc:** `docs/plans/2026-03-16-data-browser-design.md`

---

## Phase 1: 조회 기능 (Read-only)

### Task 1: Install @tanstack/react-table

**Files:**
- Modify: `package.json`

**Step 1: Install dependency**

Run: `npm install @tanstack/react-table`

**Step 2: Verify installation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @tanstack/react-table dependency"
```

---

### Task 2: sqlBuilder — SELECT query generator

**Files:**
- Create: `src/renderer/features/data-browser/model/sqlBuilder.ts`
- Create: `src/renderer/features/data-browser/model/sqlBuilder.test.ts`

**Context:** This utility builds safe SQL queries from structured parameters. It handles identifier quoting (backtick for MySQL, double-quote for PostgreSQL) and value escaping.

**Step 1: Write the tests**

```typescript
// src/renderer/features/data-browser/model/sqlBuilder.test.ts
import { describe, it, expect } from 'vitest';
import { buildSelectQuery, quoteIdentifier, escapeValue } from './sqlBuilder';

describe('quoteIdentifier', () => {
  it('quotes with backtick for mysql', () => {
    expect(quoteIdentifier('users', 'mysql')).toBe('`users`');
  });
  it('quotes with double-quote for postgresql', () => {
    expect(quoteIdentifier('users', 'postgresql')).toBe('"users"');
  });
  it('escapes embedded backtick', () => {
    expect(quoteIdentifier('my`table', 'mysql')).toBe('`my``table`');
  });
  it('defaults to backtick for mariadb', () => {
    expect(quoteIdentifier('t', 'mariadb')).toBe('`t`');
  });
});

describe('escapeValue', () => {
  it('returns NULL for null', () => {
    expect(escapeValue(null)).toBe('NULL');
  });
  it('escapes single quotes in strings', () => {
    expect(escapeValue("it's")).toBe("'it''s'");
  });
  it('returns numbers as-is', () => {
    expect(escapeValue(42)).toBe('42');
  });
  it('returns booleans as 1/0', () => {
    expect(escapeValue(true)).toBe('1');
    expect(escapeValue(false)).toBe('0');
  });
});

describe('buildSelectQuery', () => {
  const dbType = 'mysql' as const;

  it('builds basic SELECT', () => {
    expect(buildSelectQuery({ table: 'users', dbType, limit: 50, offset: 0 }))
      .toBe('SELECT * FROM `users` LIMIT 50 OFFSET 0');
  });

  it('adds ORDER BY', () => {
    expect(buildSelectQuery({
      table: 'users', dbType, limit: 50, offset: 0,
      orderBy: { column: 'name', direction: 'ASC' },
    })).toBe('SELECT * FROM `users` ORDER BY `name` ASC LIMIT 50 OFFSET 0');
  });

  it('adds WHERE filters', () => {
    expect(buildSelectQuery({
      table: 'users', dbType, limit: 50, offset: 0,
      filters: [{ column: 'name', operator: 'LIKE', value: '%john%' }],
    })).toBe("SELECT * FROM `users` WHERE `name` LIKE '%john%' LIMIT 50 OFFSET 0");
  });

  it('combines multiple filters with AND', () => {
    expect(buildSelectQuery({
      table: 'users', dbType, limit: 50, offset: 0,
      filters: [
        { column: 'age', operator: '>', value: '18' },
        { column: 'active', operator: '=', value: '1' },
      ],
    })).toBe("SELECT * FROM `users` WHERE `age` > '18' AND `active` = '1' LIMIT 50 OFFSET 0");
  });

  it('handles IS NULL filter', () => {
    expect(buildSelectQuery({
      table: 'users', dbType, limit: 50, offset: 0,
      filters: [{ column: 'deleted_at', operator: 'IS NULL', value: '' }],
    })).toBe('SELECT * FROM `users` WHERE `deleted_at` IS NULL LIMIT 50 OFFSET 0');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/features/data-browser/model/sqlBuilder.test.ts`
Expected: FAIL (module not found)

**Step 3: Implement sqlBuilder**

```typescript
// src/renderer/features/data-browser/model/sqlBuilder.ts
type TDbType = 'mysql' | 'mariadb' | 'postgresql' | 'sqlite';

export function quoteIdentifier(name: string, dbType: TDbType): string {
  if (dbType === 'postgresql') {
    return `"${name.replace(/"/g, '""')}"`;
  }
  return `\`${name.replace(/`/g, '``')}\``;
}

export function escapeValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  const str = String(value);
  return `'${str.replace(/'/g, "''")}'`;
}

export interface IFilter {
  column: string;
  operator: string; // '=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IS NULL', 'IS NOT NULL'
  value: string;
}

export interface ISelectParams {
  table: string;
  dbType: TDbType;
  limit: number;
  offset: number;
  orderBy?: { column: string; direction: 'ASC' | 'DESC' };
  filters?: IFilter[];
}

export function buildSelectQuery(params: ISelectParams): string {
  const { table, dbType, limit, offset, orderBy, filters } = params;
  const q = (name: string) => quoteIdentifier(name, dbType);

  let sql = `SELECT * FROM ${q(table)}`;

  if (filters && filters.length > 0) {
    const clauses = filters.map((f) => {
      if (f.operator === 'IS NULL') return `${q(f.column)} IS NULL`;
      if (f.operator === 'IS NOT NULL') return `${q(f.column)} IS NOT NULL`;
      return `${q(f.column)} ${f.operator} ${escapeValue(f.value)}`;
    });
    sql += ` WHERE ${clauses.join(' AND ')}`;
  }

  if (orderBy) {
    sql += ` ORDER BY ${q(orderBy.column)} ${orderBy.direction}`;
  }

  sql += ` LIMIT ${limit} OFFSET ${offset}`;
  return sql;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/features/data-browser/model/sqlBuilder.test.ts`
Expected: PASS (all 10 tests)

**Step 5: Commit**

```bash
git add src/renderer/features/data-browser/model/sqlBuilder.ts src/renderer/features/data-browser/model/sqlBuilder.test.ts
git commit -m "feat(data-browser): add sqlBuilder with SELECT query generation"
```

---

### Task 3: useDataQuery hook

**Files:**
- Create: `src/renderer/features/data-browser/model/useDataQuery.ts`

**Context:** This hook manages the data query state: selected table, pagination, sorting, filtering. It uses `queryApi.execute` to run queries and returns results.

**Step 1: Implement the hook**

```typescript
// src/renderer/features/data-browser/model/useDataQuery.ts
import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryApi } from '@/features/query-execution/api/queryApi';
import { buildSelectQuery, type IFilter } from './sqlBuilder';
import type { IQueryResult } from '~/shared/types/db';
import type { TDbType } from '~/shared/types/db';

const PAGE_SIZES = [25, 50, 100, 200] as const;
type TPageSize = (typeof PAGE_SIZES)[number];

export interface IDataQueryState {
  tableName: string;
  page: number;
  pageSize: TPageSize;
  orderBy: { column: string; direction: 'ASC' | 'DESC' } | null;
  filters: IFilter[];
}

export { PAGE_SIZES };

export function useDataQuery(connectionId: string, dbType: TDbType) {
  const [state, setState] = useState<IDataQueryState>({
    tableName: '',
    page: 0,
    pageSize: 50,
    orderBy: null,
    filters: [],
  });
  const [result, setResult] = useState<IQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queryMutation = useMutation({
    mutationFn: async (sql: string) => {
      const res = await queryApi.execute({ connectionId, sql });
      if (!res.success) throw new Error((res as { error?: string }).error ?? 'Query failed');
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const fetchData = useCallback(
    (overrides?: Partial<IDataQueryState>) => {
      const s = { ...state, ...overrides };
      if (!s.tableName) return;
      const sql = buildSelectQuery({
        table: s.tableName,
        dbType,
        limit: s.pageSize,
        offset: s.page * s.pageSize,
        orderBy: s.orderBy ?? undefined,
        filters: s.filters.length > 0 ? s.filters : undefined,
      });
      queryMutation.mutate(sql);
    },
    [state, dbType, queryMutation],
  );

  const selectTable = useCallback((tableName: string) => {
    const newState: IDataQueryState = { tableName, page: 0, pageSize: state.pageSize, orderBy: null, filters: [] };
    setState(newState);
    if (tableName) {
      const sql = buildSelectQuery({ table: tableName, dbType, limit: newState.pageSize, offset: 0 });
      queryMutation.mutate(sql);
    } else {
      setResult(null);
    }
  }, [dbType, state.pageSize, queryMutation]);

  const setPage = useCallback((page: number) => {
    setState((s) => ({ ...s, page }));
    fetchData({ page });
  }, [fetchData]);

  const setPageSize = useCallback((pageSize: TPageSize) => {
    setState((s) => ({ ...s, pageSize, page: 0 }));
    fetchData({ pageSize, page: 0 });
  }, [fetchData]);

  const toggleSort = useCallback((column: string) => {
    setState((s) => {
      let newOrderBy: IDataQueryState['orderBy'] = null;
      if (!s.orderBy || s.orderBy.column !== column) {
        newOrderBy = { column, direction: 'ASC' };
      } else if (s.orderBy.direction === 'ASC') {
        newOrderBy = { column, direction: 'DESC' };
      }
      // else: DESC -> null (remove sort)
      const newState = { ...s, orderBy: newOrderBy, page: 0 };
      return newState;
    });
    // fetchData will be called by the caller after state update
  }, []);

  const setFilters = useCallback((filters: IFilter[]) => {
    setState((s) => ({ ...s, filters, page: 0 }));
    fetchData({ filters, page: 0 });
  }, [fetchData]);

  const refresh = useCallback(() => fetchData(), [fetchData]);

  return {
    state,
    result,
    error,
    isLoading: queryMutation.isPending,
    selectTable,
    setPage,
    setPageSize,
    toggleSort,
    setFilters,
    refresh,
    dismissError: () => setError(null),
  };
}
```

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/renderer/features/data-browser/model/useDataQuery.ts
git commit -m "feat(data-browser): add useDataQuery hook with pagination, sorting, filtering"
```

---

### Task 4: DataTableListPanel — left sidebar

**Files:**
- Create: `src/renderer/features/data-browser/ui/DataTableListPanel.tsx`

**Context:** Lightweight version of the Diagram's TableListPanel. Shows tables/views grouped with counts, selection highlight, name search. No drag, delete, or visibility features. References: `src/renderer/features/virtual-diagram/ui/TableListPanel.tsx` for design patterns.

**Step 1: Implement**

```typescript
// src/renderer/features/data-browser/ui/DataTableListPanel.tsx
import { useState, useEffect, useRef } from 'react';
import { Table2, Eye as EyeIcon, Search, ChevronDown, ChevronRight } from 'lucide-react';
import type { ITable } from '~/shared/types/db';

interface DataTableListPanelProps {
  tables: ITable[];
  selectedTableName: string;
  onTableSelect: (tableName: string) => void;
}

export function DataTableListPanel({ tables, selectedTableName, onTableSelect }: DataTableListPanelProps) {
  const [search, setSearch] = useState('');
  const [tablesExpanded, setTablesExpanded] = useState(true);
  const [viewsExpanded, setViewsExpanded] = useState(true);
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  const filtered = search
    ? tables.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : tables;

  const regularTables = filtered.filter((t) => !t.isView);
  const viewTables = filtered.filter((t) => t.isView);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedTableName]);

  function renderItems(items: ITable[]) {
    return items.map((table) => (
      <button
        key={table.id}
        ref={table.name === selectedTableName ? selectedRef : undefined}
        type="button"
        onClick={() => onTableSelect(table.name)}
        className={`flex w-full items-center gap-1 px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted ${
          table.name === selectedTableName ? 'bg-primary/10 font-semibold text-primary' : ''
        }`}
      >
        <span className="min-w-0 flex-1 truncate">{table.name}</span>
        {table.isView && (
          <span className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold leading-none ${
            table.isMaterialized
              ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
              : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
          }`}>
            {table.isMaterialized ? 'MV' : 'V'}
          </span>
        )}
        <span className="w-5 shrink-0 text-right text-[10px] text-muted-foreground">
          {table.columns.length}
        </span>
      </button>
    ));
  }

  return (
    <div className="flex h-full w-[180px] shrink-0 flex-col border-r border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Table2 className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Tables ({tables.length})</span>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-border px-2 py-1.5">
        <div className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
          <Search className="size-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">
            {tables.length === 0 ? 'No tables. Sync schema first.' : 'No matches.'}
          </p>
        ) : (
          <>
            {/* Tables section */}
            <div>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50"
                onClick={() => setTablesExpanded((v) => !v)}
              >
                {tablesExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                <Table2 className="size-3" />
                <span className="flex-1 text-left">Tables</span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px]">{regularTables.length}</span>
              </button>
              {tablesExpanded && <div className="pb-1">{renderItems(regularTables)}</div>}
            </div>

            {/* Views section */}
            {viewTables.length > 0 && (
              <div className="border-t border-border/50">
                <button
                  type="button"
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50"
                  onClick={() => setViewsExpanded((v) => !v)}
                >
                  {viewsExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                  <EyeIcon className="size-3" />
                  <span className="flex-1 text-left">Views</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px]">{viewTables.length}</span>
                </button>
                {viewsExpanded && <div className="pb-1">{renderItems(viewTables)}</div>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/renderer/features/data-browser/ui/DataTableListPanel.tsx
git commit -m "feat(data-browser): add DataTableListPanel left sidebar"
```

---

### Task 5: DataGrid — TanStack Table grid component

**Files:**
- Create: `src/renderer/features/data-browser/ui/DataGrid.tsx`

**Context:** The core data grid using TanStack Table. Phase 1 is read-only: sortable column headers, row numbering, NULL rendering, sticky header. Column definitions are generated dynamically from query result columns.

**Step 1: Implement**

```typescript
// src/renderer/features/data-browser/ui/DataGrid.tsx
import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { IQueryResult } from '~/shared/types/db';

type TRow = Record<string, unknown>;

interface DataGridProps {
  result: IQueryResult;
  pageOffset: number;
  orderBy: { column: string; direction: 'ASC' | 'DESC' } | null;
  onToggleSort: (column: string) => void;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (vis: VisibilityState) => void;
}

export function DataGrid({
  result,
  pageOffset,
  orderBy,
  onToggleSort,
  columnVisibility,
  onColumnVisibilityChange,
}: DataGridProps) {
  const columns = useMemo<ColumnDef<TRow>[]>(() => {
    const rowNumCol: ColumnDef<TRow> = {
      id: '__rowNum',
      header: '#',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{pageOffset + row.index + 1}</span>
      ),
      size: 50,
      enableHiding: false,
    };

    const dataCols: ColumnDef<TRow>[] = result.columns.map((col) => ({
      accessorKey: col,
      header: () => {
        const isSorted = orderBy?.column === col;
        const dir = isSorted ? orderBy.direction : null;
        return (
          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() => onToggleSort(col)}
          >
            <span>{col}</span>
            {dir === 'ASC' && <ArrowUp className="size-3" />}
            {dir === 'DESC' && <ArrowDown className="size-3" />}
            {!dir && <ArrowUpDown className="size-3 opacity-30" />}
          </button>
        );
      },
      cell: ({ getValue }) => {
        const val = getValue();
        if (val === null) {
          return <span className="italic text-muted-foreground/50">NULL</span>;
        }
        return <span className="truncate">{String(val)}</span>;
      },
    }));

    return [rowNumCol, ...dataCols];
  }, [result.columns, pageOffset, orderBy, onToggleSort]);

  const table = useReactTable({
    data: result.rows,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnVisibility) : updater;
      onColumnVisibilityChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 z-10 bg-muted">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="whitespace-nowrap border-b border-r border-border px-3 py-1.5 text-left text-xs font-medium"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-accent/50">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="max-w-xs truncate border-b border-r border-border px-3 py-1 font-mono"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/renderer/features/data-browser/ui/DataGrid.tsx
git commit -m "feat(data-browser): add DataGrid component with TanStack Table"
```

---

### Task 6: DataToolbar + DataFooter

**Files:**
- Create: `src/renderer/features/data-browser/ui/DataToolbar.tsx`
- Create: `src/renderer/features/data-browser/ui/DataFooter.tsx`

**Step 1: Implement DataToolbar**

```typescript
// src/renderer/features/data-browser/ui/DataToolbar.tsx
import { RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface DataToolbarProps {
  tableName: string;
  isLoading: boolean;
  onRefresh: () => void;
  hasPk: boolean;
  // Phase 2: onAddRow, onDeleteRow, onApply, onDiscard, onExport, onColumns
}

export function DataToolbar({ tableName, isLoading, onRefresh, hasPk }: DataToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
      <span className="text-xs font-semibold truncate max-w-[200px]">{tableName}</span>

      {!hasPk && (
        <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-500">
          Read-only (no PK)
        </span>
      )}

      <Button
        variant="ghost"
        size="xs"
        onClick={onRefresh}
        disabled={isLoading}
        title="Refresh"
      >
        <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
      </Button>

      <div className="flex-1" />

      {/* Phase 2: +Row, -Row, Apply, Discard, Export, Columns buttons */}
    </div>
  );
}
```

**Step 2: Implement DataFooter**

```typescript
// src/renderer/features/data-browser/ui/DataFooter.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

const PAGE_SIZES = [25, 50, 100, 200] as const;

interface DataFooterProps {
  rowCount: number;
  executionTimeMs: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function DataFooter({
  rowCount,
  executionTimeMs,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onPageSizeChange,
}: DataFooterProps) {
  const hasMore = rowCount >= pageSize;

  return (
    <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
      <span className="text-xs text-muted-foreground">
        {rowCount} rows · {executionTimeMs}ms
      </span>

      <div className="flex items-center gap-3">
        {/* Page size selector */}
        <div className="flex items-center gap-1">
          {PAGE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onPageSizeChange(size)}
              className={`rounded px-1.5 py-0.5 text-[10px] ${
                size === pageSize
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {size}
            </button>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0 || isLoading}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="min-w-[2rem] text-center text-xs text-muted-foreground">
            {page + 1}
          </span>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasMore || isLoading}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/renderer/features/data-browser/ui/DataToolbar.tsx src/renderer/features/data-browser/ui/DataFooter.tsx
git commit -m "feat(data-browser): add DataToolbar and DataFooter components"
```

---

### Task 7: FilterRow — column-level WHERE filter

**Files:**
- Create: `src/renderer/features/data-browser/ui/FilterRow.tsx`

**Step 1: Implement**

```typescript
// src/renderer/features/data-browser/ui/FilterRow.tsx
import { useState, useCallback } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { IFilter } from '../model/sqlBuilder';

interface FilterRowProps {
  columns: string[];
  filters: IFilter[];
  onApplyFilters: (filters: IFilter[]) => void;
}

const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IS NULL', 'IS NOT NULL'] as const;

export function FilterRow({ columns, filters, onApplyFilters }: FilterRowProps) {
  const [localFilters, setLocalFilters] = useState<IFilter[]>(filters);
  const [isOpen, setIsOpen] = useState(false);

  const addFilter = useCallback(() => {
    if (columns.length === 0) return;
    setLocalFilters((f) => [...f, { column: columns[0], operator: '=', value: '' }]);
  }, [columns]);

  const removeFilter = useCallback((index: number) => {
    setLocalFilters((f) => f.filter((_, i) => i !== index));
  }, []);

  const updateFilter = useCallback((index: number, patch: Partial<IFilter>) => {
    setLocalFilters((f) => f.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }, []);

  const apply = useCallback(() => {
    const valid = localFilters.filter((f) =>
      f.operator === 'IS NULL' || f.operator === 'IS NOT NULL' || f.value.trim() !== '',
    );
    onApplyFilters(valid);
  }, [localFilters, onApplyFilters]);

  const clear = useCallback(() => {
    setLocalFilters([]);
    onApplyFilters([]);
  }, [onApplyFilters]);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        className="flex items-center gap-1.5 px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen((v) => !v)}
      >
        <Filter className="size-3" />
        Filters{filters.length > 0 && ` (${filters.length})`}
      </button>
      {isOpen && (
        <div className="space-y-1.5 px-3 pb-2">
          {localFilters.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <select
                value={f.column}
                onChange={(e) => updateFilter(i, { column: e.target.value })}
                className="rounded border border-border bg-background px-1.5 py-0.5 text-xs"
              >
                {columns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={f.operator}
                onChange={(e) => updateFilter(i, { operator: e.target.value })}
                className="rounded border border-border bg-background px-1.5 py-0.5 text-xs"
              >
                {OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}
              </select>
              {f.operator !== 'IS NULL' && f.operator !== 'IS NOT NULL' && (
                <input
                  type="text"
                  value={f.value}
                  onChange={(e) => updateFilter(i, { value: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') apply(); }}
                  placeholder="value"
                  className="min-w-[100px] rounded border border-border bg-background px-1.5 py-0.5 text-xs outline-none"
                />
              )}
              <button type="button" onClick={() => removeFilter(i)} className="text-muted-foreground hover:text-destructive">
                <X className="size-3" />
              </button>
            </div>
          ))}
          <div className="flex gap-1.5">
            <Button variant="outline" size="xs" onClick={addFilter}>+ Filter</Button>
            <Button variant="default" size="xs" onClick={apply}>Apply</Button>
            {filters.length > 0 && <Button variant="ghost" size="xs" onClick={clear}>Clear</Button>}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/renderer/features/data-browser/ui/FilterRow.tsx
git commit -m "feat(data-browser): add FilterRow component for WHERE filters"
```

---

### Task 8: ColumnVisibility popover

**Files:**
- Create: `src/renderer/features/data-browser/ui/ColumnVisibility.tsx`

**Step 1: Implement**

```typescript
// src/renderer/features/data-browser/ui/ColumnVisibility.tsx
import { Columns3 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/components/ui/popover';
import type { VisibilityState } from '@tanstack/react-table';

interface ColumnVisibilityProps {
  columns: string[];
  visibility: VisibilityState;
  onChange: (vis: VisibilityState) => void;
}

export function ColumnVisibility({ columns, visibility, onChange }: ColumnVisibilityProps) {
  const allVisible = columns.every((c) => visibility[c] !== false);

  function toggleAll() {
    const next: VisibilityState = {};
    const newVal = !allVisible;
    for (const col of columns) {
      next[col] = newVal;
    }
    onChange(next);
  }

  function toggle(col: string) {
    onChange({ ...visibility, [col]: visibility[col] === false ? true : false });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="xs" title="Columns">
          <Columns3 className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-2">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium">Columns</span>
          <button type="button" onClick={toggleAll} className="text-[10px] text-primary hover:underline">
            {allVisible ? 'Hide all' : 'Show all'}
          </button>
        </div>
        <div className="flex max-h-64 flex-col overflow-y-auto">
          {columns.map((col) => (
            <label key={col} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted cursor-pointer">
              <input
                type="checkbox"
                checked={visibility[col] !== false}
                onChange={() => toggle(col)}
                className="size-3"
              />
              <span className="truncate">{col}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/renderer/features/data-browser/ui/ColumnVisibility.tsx
git commit -m "feat(data-browser): add ColumnVisibility popover"
```

---

### Task 9: Wire up DataBrowserPage — full Phase 1 assembly

**Files:**
- Modify: `src/renderer/pages/db-data/ui/DataBrowserPage.tsx` (full rewrite)
- Create: `src/renderer/features/data-browser/index.ts`

**Context:** Assemble all Phase 1 components into the page. The page gets `connectionId` from `useConnectionStore`, tables from `useDiagramStore.realTables`, and the selected connection's `dbType` from `useConnections`.

**Step 1: Create feature index**

```typescript
// src/renderer/features/data-browser/index.ts
export { DataTableListPanel } from './ui/DataTableListPanel';
export { DataGrid } from './ui/DataGrid';
export { DataToolbar } from './ui/DataToolbar';
export { DataFooter } from './ui/DataFooter';
export { FilterRow } from './ui/FilterRow';
export { ColumnVisibility } from './ui/ColumnVisibility';
export { useDataQuery } from './model/useDataQuery';
```

**Step 2: Rewrite DataBrowserPage**

```typescript
// src/renderer/pages/db-data/ui/DataBrowserPage.tsx
import { useState } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
import { useConnections } from '@/features/db-connection';
import { useConnectionStore } from '@/features/db-connection/model/connectionStore';
import { useDiagramStore } from '@/features/virtual-diagram';
import {
  DataTableListPanel,
  DataGrid,
  DataToolbar,
  DataFooter,
  FilterRow,
  ColumnVisibility,
  useDataQuery,
} from '@/features/data-browser';
import type { TDbType } from '~/shared/types/db';

export function DataBrowserPage() {
  const { data: connections } = useConnections();
  const { selectedConnectionId } = useConnectionStore();
  const { realTables } = useDiagramStore();

  const connectionId = selectedConnectionId ?? '';
  const selectedConnection = connections?.find((c) => c.id === connectionId);
  const dbType: TDbType = (selectedConnection?.dbType as TDbType) ?? 'mysql';

  const {
    state,
    result,
    error,
    isLoading,
    selectTable,
    setPage,
    setPageSize,
    toggleSort,
    setFilters,
    refresh,
    dismissError,
  } = useDataQuery(connectionId, dbType);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Find selected table metadata to check for PK
  const selectedTableMeta = realTables.find((t) => t.name === state.tableName);
  const hasPk = selectedTableMeta?.constraints.some((c) => c.type === 'PK') ?? false;

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <DataTableListPanel
        tables={realTables}
        selectedTableName={state.tableName}
        onTableSelect={(name) => {
          setColumnVisibility({});
          selectTable(name);
        }}
      />

      {/* Main Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {state.tableName ? (
          <>
            {/* Toolbar */}
            <DataToolbar
              tableName={state.tableName}
              isLoading={isLoading}
              onRefresh={refresh}
              hasPk={hasPk}
            />

            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-2 bg-destructive/10 px-3 py-2">
                <span className="flex-1 text-xs text-destructive">{error}</span>
                <button
                  type="button"
                  onClick={dismissError}
                  className="text-xs text-destructive underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Filter Row */}
            {result && (
              <FilterRow
                columns={result.columns}
                filters={state.filters}
                onApplyFilters={setFilters}
              />
            )}

            {/* Grid */}
            {result ? (
              <DataGrid
                result={result}
                pageOffset={state.page * state.pageSize}
                orderBy={state.orderBy}
                onToggleSort={toggleSort}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
              />
            ) : isLoading ? (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                <span className="text-sm">Loading...</span>
              </div>
            ) : null}

            {/* Footer */}
            {result && (
              <div className="flex items-center border-t border-border">
                <DataFooter
                  rowCount={result.rowCount}
                  executionTimeMs={result.executionTimeMs}
                  page={state.page}
                  pageSize={state.pageSize}
                  isLoading={isLoading}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
                <div className="ml-auto pr-2">
                  <ColumnVisibility
                    columns={result.columns}
                    visibility={columnVisibility}
                    onChange={setColumnVisibility}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <p className="text-sm">
              {realTables.length > 0
                ? 'Select a table to browse data'
                : connectionId
                  ? 'Sync schema first (Diagram tab)'
                  : 'Connect to a database first'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Manual test**

1. Run: `npm start`
2. Go to Live Console → Connection → Select a connected DB
3. Go to Data tab
4. Verify: Left panel shows table list, click a table → data loads in grid
5. Verify: Sort by clicking column header, filter with Filter panel, page size change, pagination

**Step 5: Commit**

```bash
git add src/renderer/features/data-browser/index.ts src/renderer/pages/db-data/ui/DataBrowserPage.tsx
git commit -m "feat(data-browser): assemble Phase 1 — read-only data browser with grid, filters, sorting, pagination"
```

---

## Phase 2: 편집 기능 (CRUD)

### Task 10: sqlBuilder — INSERT, UPDATE, DELETE query generation

**Files:**
- Modify: `src/renderer/features/data-browser/model/sqlBuilder.ts`
- Modify: `src/renderer/features/data-browser/model/sqlBuilder.test.ts`

**Step 1: Add tests**

```typescript
// Add to sqlBuilder.test.ts
import { buildInsertQuery, buildUpdateQuery, buildDeleteQuery } from './sqlBuilder';

describe('buildInsertQuery', () => {
  it('builds INSERT statement', () => {
    expect(buildInsertQuery({
      table: 'users',
      dbType: 'mysql',
      columns: ['name', 'age'],
      values: { name: 'John', age: 30 },
    })).toBe("INSERT INTO `users` (`name`, `age`) VALUES ('John', 30)");
  });

  it('handles NULL values', () => {
    expect(buildInsertQuery({
      table: 'users',
      dbType: 'mysql',
      columns: ['name', 'bio'],
      values: { name: 'Jane', bio: null },
    })).toBe("INSERT INTO `users` (`name`, `bio`) VALUES ('Jane', NULL)");
  });
});

describe('buildUpdateQuery', () => {
  it('builds UPDATE with PK WHERE', () => {
    expect(buildUpdateQuery({
      table: 'users',
      dbType: 'mysql',
      pkColumns: ['id'],
      pkValues: { id: 1 },
      changes: { name: 'Jane', age: 25 },
    })).toBe("UPDATE `users` SET `name` = 'Jane', `age` = 25 WHERE `id` = 1");
  });

  it('handles composite PK', () => {
    expect(buildUpdateQuery({
      table: 'order_items',
      dbType: 'mysql',
      pkColumns: ['order_id', 'item_id'],
      pkValues: { order_id: 1, item_id: 2 },
      changes: { quantity: 5 },
    })).toBe("UPDATE `order_items` SET `quantity` = 5 WHERE `order_id` = 1 AND `item_id` = 2");
  });
});

describe('buildDeleteQuery', () => {
  it('builds DELETE with PK WHERE', () => {
    expect(buildDeleteQuery({
      table: 'users',
      dbType: 'mysql',
      pkColumns: ['id'],
      pkValues: { id: 42 },
    })).toBe('DELETE FROM `users` WHERE `id` = 42');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/renderer/features/data-browser/model/sqlBuilder.test.ts`
Expected: FAIL (functions not found)

**Step 3: Implement**

```typescript
// Add to sqlBuilder.ts

export interface IInsertParams {
  table: string;
  dbType: TDbType;
  columns: string[];
  values: Record<string, unknown>;
}

export function buildInsertQuery(params: IInsertParams): string {
  const { table, dbType, columns, values } = params;
  const q = (name: string) => quoteIdentifier(name, dbType);
  const cols = columns.map(q).join(', ');
  const vals = columns.map((c) => escapeValue(values[c] ?? null)).join(', ');
  return `INSERT INTO ${q(table)} (${cols}) VALUES (${vals})`;
}

export interface IUpdateParams {
  table: string;
  dbType: TDbType;
  pkColumns: string[];
  pkValues: Record<string, unknown>;
  changes: Record<string, unknown>;
}

export function buildUpdateQuery(params: IUpdateParams): string {
  const { table, dbType, pkColumns, pkValues, changes } = params;
  const q = (name: string) => quoteIdentifier(name, dbType);
  const setClauses = Object.entries(changes)
    .map(([col, val]) => `${q(col)} = ${escapeValue(val)}`)
    .join(', ');
  const whereClauses = pkColumns
    .map((pk) => `${q(pk)} = ${escapeValue(pkValues[pk])}`)
    .join(' AND ');
  return `UPDATE ${q(table)} SET ${setClauses} WHERE ${whereClauses}`;
}

export interface IDeleteParams {
  table: string;
  dbType: TDbType;
  pkColumns: string[];
  pkValues: Record<string, unknown>;
}

export function buildDeleteQuery(params: IDeleteParams): string {
  const { table, dbType, pkColumns, pkValues } = params;
  const q = (name: string) => quoteIdentifier(name, dbType);
  const whereClauses = pkColumns
    .map((pk) => `${q(pk)} = ${escapeValue(pkValues[pk])}`)
    .join(' AND ');
  return `DELETE FROM ${q(table)} WHERE ${whereClauses}`;
}
```

**Step 4: Run tests**

Run: `npx vitest run src/renderer/features/data-browser/model/sqlBuilder.test.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/renderer/features/data-browser/model/sqlBuilder.ts src/renderer/features/data-browser/model/sqlBuilder.test.ts
git commit -m "feat(data-browser): add INSERT/UPDATE/DELETE SQL builders"
```

---

### Task 11: usePendingChanges hook

**Files:**
- Create: `src/renderer/features/data-browser/model/usePendingChanges.ts`

**Context:** Manages a Map of pending row changes. Each entry tracks the change type (insert/update/delete), original values (for update/delete), and modified values. Generates SQL statements from pending changes.

**Step 1: Implement**

```typescript
// src/renderer/features/data-browser/model/usePendingChanges.ts
import { useState, useCallback } from 'react';
import { buildInsertQuery, buildUpdateQuery, buildDeleteQuery } from './sqlBuilder';

type TDbType = 'mysql' | 'mariadb' | 'postgresql' | 'sqlite';
type TChangeType = 'insert' | 'update' | 'delete';

export interface IPendingChange {
  type: TChangeType;
  original: Record<string, unknown> | null; // null for insert
  modified: Record<string, unknown>; // current values
}

export function usePendingChanges(
  tableName: string,
  dbType: TDbType,
  pkColumns: string[],
  allColumns: string[],
) {
  const [changes, setChanges] = useState<Map<string, IPendingChange>>(new Map());

  // Create a stable row key from PK values
  const getRowKey = useCallback(
    (row: Record<string, unknown>) =>
      pkColumns.map((pk) => String(row[pk] ?? '')).join('::'),
    [pkColumns],
  );

  const updateCell = useCallback(
    (row: Record<string, unknown>, column: string, newValue: unknown) => {
      const key = getRowKey(row);
      setChanges((prev) => {
        const next = new Map(prev);
        const existing = next.get(key);
        if (existing) {
          existing.modified = { ...existing.modified, [column]: newValue };
        } else {
          next.set(key, {
            type: 'update',
            original: { ...row },
            modified: { ...row, [column]: newValue },
          });
        }
        return next;
      });
    },
    [getRowKey],
  );

  const insertRow = useCallback(
    () => {
      const tempKey = `__new_${Date.now()}`;
      const emptyRow: Record<string, unknown> = {};
      for (const col of allColumns) emptyRow[col] = null;
      setChanges((prev) => {
        const next = new Map(prev);
        next.set(tempKey, { type: 'insert', original: null, modified: emptyRow });
        return next;
      });
      return tempKey;
    },
    [allColumns],
  );

  const deleteRow = useCallback(
    (row: Record<string, unknown>) => {
      const key = getRowKey(row);
      setChanges((prev) => {
        const next = new Map(prev);
        const existing = next.get(key);
        if (existing?.type === 'insert') {
          // Remove unsaved insert
          next.delete(key);
        } else {
          next.set(key, { type: 'delete', original: { ...row }, modified: { ...row } });
        }
        return next;
      });
    },
    [getRowKey],
  );

  const discard = useCallback(() => setChanges(new Map()), []);

  const generateSql = useCallback((): string[] => {
    const statements: string[] = [];
    for (const [, change] of changes) {
      if (change.type === 'insert') {
        statements.push(
          buildInsertQuery({ table: tableName, dbType, columns: allColumns, values: change.modified }),
        );
      } else if (change.type === 'update' && change.original) {
        // Only include actually changed columns
        const changedCols: Record<string, unknown> = {};
        for (const col of allColumns) {
          if (change.modified[col] !== change.original[col]) {
            changedCols[col] = change.modified[col];
          }
        }
        if (Object.keys(changedCols).length > 0) {
          const pkValues: Record<string, unknown> = {};
          for (const pk of pkColumns) pkValues[pk] = change.original[pk];
          statements.push(
            buildUpdateQuery({ table: tableName, dbType, pkColumns, pkValues, changes: changedCols }),
          );
        }
      } else if (change.type === 'delete' && change.original) {
        const pkValues: Record<string, unknown> = {};
        for (const pk of pkColumns) pkValues[pk] = change.original[pk];
        statements.push(
          buildDeleteQuery({ table: tableName, dbType, pkColumns, pkValues }),
        );
      }
    }
    return statements;
  }, [changes, tableName, dbType, pkColumns, allColumns]);

  return {
    changes,
    hasChanges: changes.size > 0,
    changeCount: changes.size,
    updateCell,
    insertRow,
    deleteRow,
    discard,
    generateSql,
    getRowKey,
  };
}
```

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/renderer/features/data-browser/model/usePendingChanges.ts
git commit -m "feat(data-browser): add usePendingChanges hook for edit state management"
```

---

### Task 12: CellEditor — inline cell editing

**Files:**
- Create: `src/renderer/features/data-browser/ui/CellEditor.tsx`

**Step 1: Implement**

```typescript
// src/renderer/features/data-browser/ui/CellEditor.tsx
import { useState, useRef, useEffect, useCallback } from 'react';

interface CellEditorProps {
  value: unknown;
  onSave: (value: unknown) => void;
  onCancel: () => void;
}

export function CellEditor({ value, onSave, onCancel }: CellEditorProps) {
  const [text, setText] = useState(value === null ? '' : String(value));
  const [isNull, setIsNull] = useState(value === null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = useCallback(() => {
    onSave(isNull ? null : text);
  }, [isNull, text, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') { handleSave(); }
      if (e.key === 'Escape') { onCancel(); }
    },
    [handleSave, onCancel],
  );

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        type="text"
        value={isNull ? '' : text}
        onChange={(e) => { setText(e.target.value); setIsNull(false); }}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        disabled={isNull}
        className={`w-full rounded border border-primary bg-background px-1 py-0.5 text-xs font-mono outline-none ${
          isNull ? 'italic text-muted-foreground' : ''
        }`}
        placeholder={isNull ? 'NULL' : ''}
      />
      <button
        type="button"
        onClick={() => { setIsNull((v) => !v); if (!isNull) setText(''); }}
        className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold ${
          isNull ? 'bg-muted-foreground/20 text-muted-foreground' : 'bg-muted text-muted-foreground/50'
        }`}
        title="Toggle NULL"
      >
        NULL
      </button>
    </div>
  );
}
```

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/renderer/features/data-browser/ui/CellEditor.tsx
git commit -m "feat(data-browser): add CellEditor for inline cell editing"
```

---

### Task 13: PendingChangesPanel — SQL preview + Apply/Discard

**Files:**
- Create: `src/renderer/features/data-browser/ui/PendingChangesPanel.tsx`

**Step 1: Implement**

```typescript
// src/renderer/features/data-browser/ui/PendingChangesPanel.tsx
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface PendingChangesPanelProps {
  changeCount: number;
  sqlStatements: string[];
  isApplying: boolean;
  onApply: () => void;
  onDiscard: () => void;
}

export function PendingChangesPanel({
  changeCount,
  sqlStatements,
  isApplying,
  onApply,
  onDiscard,
}: PendingChangesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (changeCount === 0) return null;

  return (
    <div className="border-t border-orange-400/30 bg-orange-500/5">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-500/10"
        onClick={() => setIsExpanded((v) => !v)}
      >
        {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        Pending Changes ({changeCount})
      </button>

      {isExpanded && (
        <div className="px-3 pb-2">
          {/* SQL Preview */}
          <div className="mb-2 max-h-32 overflow-y-auto rounded border border-border bg-background p-2 font-mono text-[11px]">
            {sqlStatements.map((sql, i) => (
              <div
                key={i}
                className={`py-0.5 ${
                  sql.startsWith('DELETE') ? 'text-red-500' :
                  sql.startsWith('INSERT') ? 'text-green-500' :
                  'text-yellow-500'
                }`}
              >
                {sql};
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="default"
              size="xs"
              onClick={onApply}
              disabled={isApplying}
            >
              {isApplying ? 'Applying...' : `Apply ${changeCount} change${changeCount > 1 ? 's' : ''}`}
            </Button>
            <Button variant="outline" size="xs" onClick={onDiscard} disabled={isApplying}>
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/renderer/features/data-browser/ui/PendingChangesPanel.tsx
git commit -m "feat(data-browser): add PendingChangesPanel with SQL preview"
```

---

### Task 14: RowContextMenu

**Files:**
- Create: `src/renderer/features/data-browser/ui/RowContextMenu.tsx`

**Step 1: Implement**

```typescript
// src/renderer/features/data-browser/ui/RowContextMenu.tsx
import { useEffect, useRef } from 'react';
import { Copy, ClipboardCopy, Plus, Trash2, CopyPlus } from 'lucide-react';

interface RowContextMenuProps {
  position: { x: number; y: number };
  row: Record<string, unknown>;
  columns: string[];
  cellColumn?: string;
  canEdit: boolean;
  onClose: () => void;
  onCopyCell: () => void;
  onCopyRowJson: () => void;
  onInsertAbove?: () => void;
  onInsertBelow?: () => void;
  onDuplicateRow?: () => void;
  onDeleteRow?: () => void;
}

export function RowContextMenu({
  position,
  canEdit,
  onClose,
  onCopyCell,
  onCopyRowJson,
  onInsertAbove,
  onInsertBelow,
  onDuplicateRow,
  onDeleteRow,
}: RowContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const items = [
    { icon: Copy, label: 'Copy Cell Value', onClick: onCopyCell, show: true },
    { icon: ClipboardCopy, label: 'Copy Row as JSON', onClick: onCopyRowJson, show: true },
    { type: 'separator' as const, show: canEdit },
    { icon: Plus, label: 'Insert Row Above', onClick: onInsertAbove, show: canEdit },
    { icon: Plus, label: 'Insert Row Below', onClick: onInsertBelow, show: canEdit },
    { icon: CopyPlus, label: 'Duplicate Row', onClick: onDuplicateRow, show: canEdit },
    { type: 'separator' as const, show: canEdit },
    { icon: Trash2, label: 'Delete Row', onClick: onDeleteRow, show: canEdit, danger: true },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-lg"
      style={{ left: position.x, top: position.y }}
    >
      {items.filter((i) => i.show).map((item, idx) => {
        if ('type' in item && item.type === 'separator') {
          return <div key={idx} className="my-1 h-px bg-border" />;
        }
        const Icon = 'icon' in item ? item.icon : null;
        return (
          <button
            key={idx}
            type="button"
            className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent ${
              'danger' in item && item.danger ? 'text-destructive' : ''
            }`}
            onClick={() => {
              'onClick' in item && item.onClick?.();
              onClose();
            }}
          >
            {Icon && <Icon className="size-3.5" />}
            {'label' in item && <span>{item.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
```

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/renderer/features/data-browser/ui/RowContextMenu.tsx
git commit -m "feat(data-browser): add RowContextMenu component"
```

---

### Task 15: ExportMenu + exportData utility

**Files:**
- Create: `src/renderer/features/data-browser/lib/exportData.ts`
- Create: `src/renderer/features/data-browser/lib/exportData.test.ts`
- Create: `src/renderer/features/data-browser/ui/ExportMenu.tsx`

**Step 1: Write tests for exportData**

```typescript
// src/renderer/features/data-browser/lib/exportData.test.ts
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
    expect(result).toBe('id,name,age\n1,John,30\n2,"O\'Brien",');
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
    expect(result).toContain("INSERT INTO `users`");
    expect(result).toContain("'John'");
    expect(result).toContain('NULL');
  });
});
```

**Step 2: Implement exportData**

```typescript
// src/renderer/features/data-browser/lib/exportData.ts
import { quoteIdentifier, escapeValue } from '../model/sqlBuilder';

type TDbType = 'mysql' | 'mariadb' | 'postgresql' | 'sqlite';

export function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const header = columns.join(',');
  const lines = rows.map((row) =>
    columns.map((col) => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(','),
  );
  return [header, ...lines].join('\n');
}

export function toJson(rows: Record<string, unknown>[]): string {
  return JSON.stringify(rows, null, 2);
}

export function toSqlInsert(
  table: string,
  dbType: TDbType,
  columns: string[],
  rows: Record<string, unknown>[],
): string {
  const q = (name: string) => quoteIdentifier(name, dbType);
  const colList = columns.map(q).join(', ');
  return rows
    .map((row) => {
      const vals = columns.map((c) => escapeValue(row[c] ?? null)).join(', ');
      return `INSERT INTO ${q(table)} (${colList}) VALUES (${vals});`;
    })
    .join('\n');
}
```

**Step 3: Run tests**

Run: `npx vitest run src/renderer/features/data-browser/lib/exportData.test.ts`
Expected: PASS

**Step 4: Implement ExportMenu**

```typescript
// src/renderer/features/data-browser/ui/ExportMenu.tsx
import { Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/components/ui/popover';

interface ExportMenuProps {
  onExport: (format: 'csv' | 'json' | 'sql') => void;
}

export function ExportMenu({ onExport }: ExportMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="xs" title="Export">
          <Download className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-36 p-1">
        {(['csv', 'json', 'sql'] as const).map((fmt) => (
          <button
            key={fmt}
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
            onClick={() => onExport(fmt)}
          >
            {fmt === 'csv' && 'CSV (.csv)'}
            {fmt === 'json' && 'JSON (.json)'}
            {fmt === 'sql' && 'SQL INSERT (.sql)'}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
```

**Step 5: Commit**

```bash
git add src/renderer/features/data-browser/lib/exportData.ts src/renderer/features/data-browser/lib/exportData.test.ts src/renderer/features/data-browser/ui/ExportMenu.tsx
git commit -m "feat(data-browser): add export utilities (CSV/JSON/SQL) and ExportMenu"
```

---

### Task 16: Wire up Phase 2 — editing, context menu, export into DataBrowserPage

**Files:**
- Modify: `src/renderer/features/data-browser/ui/DataGrid.tsx` — add cell editing, row styling, context menu trigger
- Modify: `src/renderer/features/data-browser/ui/DataToolbar.tsx` — add +Row, -Row, Apply, Discard, Export, Columns buttons
- Modify: `src/renderer/pages/db-data/ui/DataBrowserPage.tsx` — integrate usePendingChanges, export, context menu
- Modify: `src/renderer/features/data-browser/index.ts` — export new components

**Context:** This is the integration task. Wire up cell editing in DataGrid (double-click to edit, colored row styles for pending changes), connect usePendingChanges to the toolbar and PendingChangesPanel, add context menu and export. The unsaved changes guard (confirm on table switch/page navigation) is also added here.

**Step 1: Update all files per the design**

This is a large integration step. Key changes:
- `DataGrid`: Add `editingCell` state, double-click handler, render `CellEditor` in editing cells, apply row colors from pending changes map, right-click handler for context menu
- `DataToolbar`: Add all action buttons, receive callbacks as props
- `DataBrowserPage`: Use `usePendingChanges`, wire up Apply (execute SQL sequentially, reload on success), wire up Discard, export handler using `dialog.showSaveDialog`, unsaved changes confirmation on table switch

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Manual test**

1. Open Data Browser, select a table with PK
2. Double-click a cell → edit → press Enter → yellow highlight
3. Click + Row → green empty row at bottom
4. Right-click a row → context menu works
5. See Pending Changes panel with SQL preview
6. Click Apply → SQL executes, data reloads
7. Test Discard → pending cleared
8. Test Export → file save dialog opens
9. Switch table with pending changes → confirm dialog

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(data-browser): wire up Phase 2 — editing, context menu, export, unsaved guard"
```

---

## Summary

| Task | Description | Phase |
|------|-------------|-------|
| 1 | Install @tanstack/react-table | Setup |
| 2 | sqlBuilder — SELECT queries | Phase 1 |
| 3 | useDataQuery hook | Phase 1 |
| 4 | DataTableListPanel | Phase 1 |
| 5 | DataGrid (TanStack Table) | Phase 1 |
| 6 | DataToolbar + DataFooter | Phase 1 |
| 7 | FilterRow | Phase 1 |
| 8 | ColumnVisibility | Phase 1 |
| 9 | DataBrowserPage assembly | Phase 1 |
| 10 | sqlBuilder — INSERT/UPDATE/DELETE | Phase 2 |
| 11 | usePendingChanges hook | Phase 2 |
| 12 | CellEditor | Phase 2 |
| 13 | PendingChangesPanel | Phase 2 |
| 14 | RowContextMenu | Phase 2 |
| 15 | ExportMenu + exportData | Phase 2 |
| 16 | Phase 2 full integration | Phase 2 |
