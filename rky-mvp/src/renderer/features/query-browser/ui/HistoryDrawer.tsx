import { useCallback } from 'react';
import { X, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useQueryHistory } from '../model/useQueryHistory';
import type { IQueryHistory } from '~/shared/types/db';

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

function truncateSql(sql: string, max = 50): string {
  const single = sql.replace(/\s+/g, ' ').trim();
  if (single.length <= max) return single;
  return single.slice(0, max) + '...';
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  onViewAll: () => void;
  onRerun: (sql: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Item row                                                            */
/* ------------------------------------------------------------------ */

function DrawerItem({
  item,
  onRerun,
}: {
  item: IQueryHistory;
  onRerun: (sql: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onRerun(item.sqlContent)}
      className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
    >
      {item.status === 'success' ? (
        <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-green-500" />
      ) : (
        <XCircle className="mt-0.5 size-3 shrink-0 text-destructive" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xs">{truncateSql(item.sqlContent)}</p>
        <p className="text-[10px] text-muted-foreground">{formatRelativeTime(item.executedAt)}</p>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function HistoryDrawer({
  open,
  onClose,
  connectionId,
  onViewAll,
  onRerun,
}: HistoryDrawerProps) {
  const { items } = useQueryHistory(connectionId, { page: 0, pageSize: 20 });

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-border bg-background shadow-xl transition-transform duration-200 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-medium">Recent History</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No recent history</p>
          ) : (
            items.map((item) => (
              <DrawerItem key={item.id} item={item} onRerun={onRerun} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-3 py-2">
          <Button variant="outline" size="xs" className="w-full" onClick={onViewAll}>
            View All
            <ArrowRight className="ml-1 size-3" />
          </Button>
        </div>
      </div>
    </>
  );
}
