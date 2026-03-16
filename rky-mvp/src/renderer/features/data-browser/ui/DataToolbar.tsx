import { RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface DataToolbarProps {
  tableName: string;
  isLoading: boolean;
  onRefresh: () => void;
  hasPk: boolean;
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
    </div>
  );
}
