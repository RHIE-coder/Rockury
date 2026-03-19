import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useQueryHistory } from '../model/useQueryHistory';
import { HistoryTable } from './HistoryTable';
import type { THistorySource } from '~/shared/types/db';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface HistoryTabProps {
  connectionId: string;
  onRerun: (sql: string) => void;
}

type SourceFilter = 'all' | THistorySource;

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'query', label: 'Query' },
  { value: 'data', label: 'Data' },
  { value: 'collection', label: 'Collection' },
];

/* ------------------------------------------------------------------ */
/*  Debounce hook                                                       */
/* ------------------------------------------------------------------ */

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function HistoryTab({ connectionId, onRerun }: HistoryTabProps) {
  const [source, setSource] = useState<SourceFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const debouncedSearch = useDebouncedValue(search, 300);

  const filter = useMemo(
    () => ({
      source: source === 'all' ? undefined : source,
      search: debouncedSearch || undefined,
      page,
      pageSize,
    }),
    [source, debouncedSearch, page, pageSize],
  );

  const { items, total, isLoading, deleteItem } = useQueryHistory(connectionId, filter);

  /* Reset page on filter change */
  const handleSourceChange = useCallback((val: SourceFilter) => {
    setSource(val);
    setPage(0);
  }, []);

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(0);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(0);
  }, []);

  const handleCopySql = useCallback((sql: string) => {
    navigator.clipboard.writeText(sql);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      deleteItem(id);
    },
    [deleteItem],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Filter Bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-1.5">
        <div className="flex items-center gap-1">
          {SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSourceChange(opt.value)}
              className={`rounded px-2 py-1 text-xs transition-colors ${
                source === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1 rounded border border-border bg-background px-2 py-1">
          <Search className="size-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search SQL..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-40 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && items.length === 0 && (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <span className="text-sm">Loading...</span>
        </div>
      )}

      {/* Table */}
      {!(isLoading && items.length === 0) && (
        <HistoryTable
          items={items}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          onDelete={handleDelete}
          onCopySql={handleCopySql}
          onRerun={onRerun}
        />
      )}
    </div>
  );
}
