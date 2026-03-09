import { Clock } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { useQueryHistory } from '../model/useQueries';
import { useQueryStore } from '../model/queryStore';

interface QueryHistoryListProps {
  limit?: number;
}

export function QueryHistoryList({ limit = 50 }: QueryHistoryListProps) {
  const { data: history, isLoading } = useQueryHistory(limit);
  const { addTab } = useQueryStore();

  function handleReuse(sqlContent: string) {
    addTab({ sql: sqlContent });
  }

  if (isLoading) {
    return <p className="p-3 text-xs text-muted-foreground">Loading history...</p>;
  }

  return (
    <div className="space-y-1">
      <h3 className="px-3 pt-2 text-xs font-semibold">Query History</h3>
      {history && history.length > 0 ? (
        <ul className="space-y-0.5 px-1">
          {history.map((item) => (
            <li key={item.id} className="rounded px-2 py-1.5 hover:bg-muted">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => handleReuse(item.sqlContent)}
              >
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="size-3 shrink-0 text-muted-foreground" />
                  <span className="truncate font-mono">{item.sqlContent.slice(0, 60)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    variant={item.status === 'success' ? 'secondary' : 'destructive'}
                    className="text-[10px] px-1 py-0"
                  >
                    {item.status}
                  </Badge>
                  <span>{item.executionTimeMs}ms</span>
                  <span>{item.rowCount} rows</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-3 text-xs text-muted-foreground">No query history.</p>
      )}
    </div>
  );
}
