import { useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import type { ITable, ISearchResult } from '~/shared/types/db';

interface SearchOverlayProps {
  tables: ITable[];
  query: string;
  onQueryChange: (query: string) => void;
  onResults: (results: ISearchResult[]) => void;
  onSelect: (result: ISearchResult) => void;
  onClose: () => void;
  results: ISearchResult[];
}

function searchTables(tables: ITable[], query: string): ISearchResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: ISearchResult[] = [];

  for (const table of tables) {
    // Match table name
    if (table.name.toLowerCase().includes(q)) {
      results.push({
        type: 'table',
        tableId: table.id,
        tableName: table.name,
        matchedText: table.name,
      });
    }

    // Match columns
    for (const column of table.columns) {
      if (
        column.name.toLowerCase().includes(q) ||
        column.dataType.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'column',
          tableId: table.id,
          tableName: table.name,
          columnId: column.id,
          columnName: column.name,
          matchedText: `${table.name}.${column.name}`,
        });
      }
    }

    // Match constraints
    for (const constraint of table.constraints) {
      if (constraint.name.toLowerCase().includes(q)) {
        results.push({
          type: 'constraint',
          tableId: table.id,
          tableName: table.name,
          constraintName: constraint.name,
          matchedText: constraint.name,
        });
      }
    }
  }

  return results;
}

export function SearchOverlay({
  tables,
  query,
  onQueryChange,
  onResults,
  onSelect,
  onClose,
  results,
}: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = useCallback(
    (value: string) => {
      onQueryChange(value);
      const found = searchTables(tables, value);
      onResults(found);
    },
    [tables, onQueryChange, onResults],
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="absolute left-1/2 top-2 z-50 w-80 -translate-x-1/2 rounded-lg border border-border bg-popover shadow-lg">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="size-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          className="h-7 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          placeholder="Search tables, columns..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <Button variant="ghost" size="xs" onClick={onClose}>
          <X className="size-3.5" />
        </Button>
      </div>

      {results.length > 0 && (
        <div className="max-h-60 overflow-y-auto p-1">
          {results.map((result, i) => (
            <button
              key={`${result.tableId}-${result.columnId ?? result.constraintName ?? ''}-${i}`}
              type="button"
              onClick={() => onSelect(result)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent"
            >
              <span
                className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-medium ${
                  result.type === 'table'
                    ? 'bg-blue-500/10 text-blue-500'
                    : result.type === 'column'
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-purple-500/10 text-purple-500'
                }`}
              >
                {result.type}
              </span>
              <span className="truncate">{result.matchedText}</span>
            </button>
          ))}
        </div>
      )}

      {query.trim() && results.length === 0 && (
        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
          No results found
        </div>
      )}
    </div>
  );
}
