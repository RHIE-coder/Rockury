import { Trash2, FileText } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useSavedQueries, useDeleteQuery } from '../model/useQueries';
import { useQueryStore } from '../model/queryStore';

export function SavedQueryList() {
  const { data: queries, isLoading } = useSavedQueries();
  const deleteQuery = useDeleteQuery();
  const { addTab } = useQueryStore();

  function handleLoad(name: string, sqlContent: string) {
    addTab({ name, sql: sqlContent });
  }

  function handleDelete(id: string) {
    if (window.confirm('Delete this saved query?')) {
      deleteQuery.mutate(id);
    }
  }

  if (isLoading) {
    return <p className="p-3 text-xs text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-1">
      <h3 className="px-3 pt-2 text-xs font-semibold">Saved Queries</h3>
      {queries && queries.length > 0 ? (
        <ul className="space-y-0.5 px-1">
          {queries.map((q) => (
            <li
              key={q.id}
              className="group flex items-center gap-1.5 rounded px-2 py-1.5 text-xs hover:bg-muted"
            >
              <button
                type="button"
                className="flex flex-1 items-center gap-1.5 text-left"
                onClick={() => handleLoad(q.name, q.sqlContent)}
              >
                <FileText className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{q.name}</span>
              </button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="hidden group-hover:inline-flex"
                onClick={() => handleDelete(q.id)}
              >
                <Trash2 className="size-3 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-3 text-xs text-muted-foreground">No saved queries.</p>
      )}
    </div>
  );
}
