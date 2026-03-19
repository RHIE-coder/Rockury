import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Copy,
  Play,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { IQueryHistory, THistorySource } from '~/shared/types/db';

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function truncateSql(sql: string, max = 60): string {
  const single = sql.replace(/\s+/g, ' ').trim();
  if (single.length <= max) return single;
  return single.slice(0, max) + '...';
}

const SOURCE_STYLES: Record<THistorySource, string> = {
  query: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  data: 'bg-green-500/15 text-green-600 dark:text-green-400',
  collection: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
};

function SourceBadge({ source }: { source?: THistorySource }) {
  if (!source) return null;
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${SOURCE_STYLES[source]}`}>
      {source}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface HistoryTableProps {
  items: IQueryHistory[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onDelete: (id: string) => void;
  onCopySql: (sql: string) => void;
  onRerun: (sql: string) => void;
}

const PAGE_SIZES = [25, 50, 100] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function HistoryTable({
  items,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onDelete,
  onCopySql,
  onRerun,
}: HistoryTableProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = items.find((i) => i.id === selectedId) ?? null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-muted/50 backdrop-blur">
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-3 py-1.5 font-medium">Time</th>
              <th className="px-3 py-1.5 font-medium">Source</th>
              <th className="px-3 py-1.5 font-medium">SQL</th>
              <th className="px-3 py-1.5 text-right font-medium">Rows</th>
              <th className="px-3 py-1.5 text-right font-medium">Speed</th>
              <th className="px-3 py-1.5 text-center font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                className={`cursor-pointer border-b border-border transition-colors hover:bg-accent/50 ${
                  selectedId === item.id ? 'bg-accent' : ''
                }`}
              >
                <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                  {formatRelativeTime(item.executedAt)}
                </td>
                <td className="px-3 py-1.5">
                  <SourceBadge source={item.source} />
                </td>
                <td className="max-w-[300px] truncate px-3 py-1.5 font-mono">
                  {truncateSql(item.sqlContent)}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right text-muted-foreground">
                  {item.rowCount}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right text-muted-foreground">
                  {item.executionTimeMs}ms
                </td>
                <td className="px-3 py-1.5 text-center">
                  {item.status === 'success' ? (
                    <CheckCircle2 className="inline size-3.5 text-green-500" />
                  ) : (
                    <XCircle className="inline size-3.5 text-destructive" />
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  No history items found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {selectedItem && (
        <div className="shrink-0 border-t border-border bg-muted/30 px-3 py-2">
          <pre className="mb-2 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-background p-2 font-mono text-xs">
            {selectedItem.sqlContent}
          </pre>
          {selectedItem.status === 'error' && selectedItem.errorMessage && (
            <p className="mb-2 text-xs text-destructive">{selectedItem.errorMessage}</p>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="xs" onClick={() => onDelete(selectedItem.id)}>
              <Trash2 className="mr-1 size-3" />
              Delete
            </Button>
            <Button variant="outline" size="xs" onClick={() => onCopySql(selectedItem.sqlContent)}>
              <Copy className="mr-1 size-3" />
              Copy SQL
            </Button>
            <Button variant="default" size="xs" onClick={() => onRerun(selectedItem.sqlContent)}>
              <Play className="mr-1 size-3" />
              Re-run
            </Button>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex shrink-0 items-center justify-between border-t border-border px-3 py-1.5">
        <span className="text-xs text-muted-foreground">{total} items</span>

        <div className="flex items-center gap-3">
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

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => onPageChange(page + 1)}
              disabled={page + 1 >= totalPages}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
