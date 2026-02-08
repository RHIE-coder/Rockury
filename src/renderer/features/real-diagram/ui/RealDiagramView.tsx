import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import type { ITable } from '@/entities/table';
import { useConnections } from '@/features/db-connection';
import { realDiagramApi } from '../api/realDiagramApi';

export function RealDiagramView() {
  const { data: connections } = useConnections();
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [tables, setTables] = useState<ITable[]>([]);

  const fetchSchema = useMutation({
    mutationFn: (connectionId: string) => realDiagramApi.fetchReal(connectionId),
    onSuccess: (result) => {
      if (result.success) {
        setTables(result.data);
      }
    },
  });

  function handleFetch() {
    if (!selectedConnectionId) return;
    fetchSchema.mutate(selectedConnectionId);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border p-2">
        <Select
          className="h-8 w-48 text-sm"
          value={selectedConnectionId}
          onChange={(e) => setSelectedConnectionId(e.target.value)}
        >
          <option value="">Select connection...</option>
          {connections?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.dbType})
            </option>
          ))}
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={handleFetch}
          disabled={!selectedConnectionId || fetchSchema.isPending}
        >
          <RefreshCw className={`size-4 ${fetchSchema.isPending ? 'animate-spin' : ''}`} />
          {fetchSchema.isPending ? 'Fetching...' : 'Fetch Schema'}
        </Button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 bg-muted/30">
        {tables.length > 0 ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tables.map((table) => (
              <div
                key={table.id}
                className="rounded-lg border border-border bg-card p-3"
              >
                <p className="text-sm font-semibold">{table.name}</p>
                <p className="text-xs text-muted-foreground">
                  {table.columns.length} columns
                </p>
                <ul className="mt-2 space-y-0.5">
                  {table.columns.slice(0, 5).map((col) => (
                    <li key={col.id} className="text-xs text-muted-foreground">
                      {col.keyType ? `[${col.keyType}] ` : ''}{col.name}: {col.dataType}
                    </li>
                  ))}
                  {table.columns.length > 5 && (
                    <li className="text-xs text-muted-foreground">
                      ...and {table.columns.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {fetchSchema.isError
                ? 'Failed to fetch schema. Please check your connection.'
                : 'Select a connection and click "Fetch Schema" to view real database structure.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
