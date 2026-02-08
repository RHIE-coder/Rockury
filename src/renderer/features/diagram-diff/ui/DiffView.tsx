import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { useConnections } from '@/features/db-connection';
import { useDiagrams } from '@/features/virtual-diagram';
import type { IDiffResult, ITableDiff } from '../model/types';
import { diffApi } from '../api/diffApi';
import { DiffSummary } from './DiffSummary';
import { MigrationDdlView } from './MigrationDdlView';

const ACTION_COLORS: Record<string, string> = {
  added: 'bg-green-100 border-green-300 dark:bg-green-950 dark:border-green-800',
  removed: 'bg-red-100 border-red-300 dark:bg-red-950 dark:border-red-800',
  modified: 'bg-yellow-100 border-yellow-300 dark:bg-yellow-950 dark:border-yellow-800',
};

function TableDiffItem({ tableDiff }: { tableDiff: ITableDiff }) {
  return (
    <div className={`rounded-md border p-3 ${ACTION_COLORS[tableDiff.action] ?? 'border-border'}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{tableDiff.tableName}</span>
        <Badge variant="outline" className="text-xs">
          {tableDiff.action}
        </Badge>
      </div>
      {tableDiff.columnDiffs.length > 0 && (
        <ul className="mt-2 space-y-1">
          {tableDiff.columnDiffs.map((col) => (
            <li key={col.columnName} className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="text-xs">
                {col.action}
              </Badge>
              <span>{col.columnName}</span>
              {col.changes && col.changes.length > 0 && (
                <span className="text-muted-foreground">({col.changes.join(', ')})</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DiffView() {
  const { data: diagrams } = useDiagrams('virtual');
  const { data: connections } = useConnections();
  const [selectedDiagramId, setSelectedDiagramId] = useState('');
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [diffResult, setDiffResult] = useState<IDiffResult | null>(null);

  const compareMutation = useMutation({
    mutationFn: () =>
      diffApi.compare({
        virtualDiagramId: selectedDiagramId,
        connectionId: selectedConnectionId,
      }),
    onSuccess: (result) => {
      if (result.success) {
        setDiffResult(result.data);
      }
    },
  });

  function handleCompare() {
    if (!selectedDiagramId || !selectedConnectionId) return;
    compareMutation.mutate();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border p-2">
        <Select
          className="h-8 w-48 text-sm"
          value={selectedDiagramId}
          onChange={(e) => setSelectedDiagramId(e.target.value)}
        >
          <option value="">Select virtual diagram...</option>
          {diagrams?.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
        <span className="text-sm text-muted-foreground">vs</span>
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
          onClick={handleCompare}
          disabled={!selectedDiagramId || !selectedConnectionId || compareMutation.isPending}
        >
          {compareMutation.isPending ? 'Comparing...' : 'Compare'}
        </Button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {diffResult ? (
          <div className="space-y-4">
            <DiffSummary diff={diffResult} />
            <div className="space-y-2">
              {diffResult.tableDiffs.map((tableDiff) => (
                <TableDiffItem key={tableDiff.tableName} tableDiff={tableDiff} />
              ))}
            </div>
            <MigrationDdlView ddl={diffResult.migrationDdl} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {compareMutation.isError
                ? 'Failed to compare schemas. Please check your selections.'
                : 'Select a virtual diagram and a connection, then click "Compare" to see differences.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
