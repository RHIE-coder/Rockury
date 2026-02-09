import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import type { ITable, IDiagram } from '~/shared/types/db';
import { useConnections } from '@/features/db-connection';
import { useDiagramStore } from '@/features/virtual-diagram';
import { DiagramCanvas } from '@/features/virtual-diagram/ui/DiagramCanvas';
import { realDiagramApi } from '../api/realDiagramApi';

export function RealDiagramView() {
  const { data: connections } = useConnections();
  const { filter } = useDiagramStore();
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

  // Build a synthetic IDiagram for the canvas
  const realDiagram: IDiagram | null = tables.length > 0
    ? {
        id: `real-${selectedConnectionId}`,
        name: 'Real Schema',
        version: '0.0.0',
        type: 'real',
        tables,
        createdAt: '',
        updatedAt: '',
      }
    : null;

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
      <div className="flex-1">
        {realDiagram ? (
          <DiagramCanvas
            diagram={realDiagram}
            filter={filter}
            readOnly
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted/30">
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
