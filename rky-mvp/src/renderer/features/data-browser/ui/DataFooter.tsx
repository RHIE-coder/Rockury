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
