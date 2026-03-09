import { useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import type { IQueryResult } from '@/entities/query';
import { useConnections } from '@/features/db-connection';
import { useQueryStore } from '../model/queryStore';
import { useExecuteQuery } from '../model/useQueries';
import { QueryTabs } from './QueryTabs';

export function QueryPanel() {
  const { tabs, activeTabId, selectedConnectionId, setSelectedConnectionId, updateTabSql } =
    useQueryStore();
  const { data: connections } = useConnections();
  const executeQuery = useExecuteQuery();
  const [result, setResult] = useState<IQueryResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  function handleRun() {
    if (!activeTab || !selectedConnectionId || !activeTab.sql.trim()) return;
    setErrorMessage(null);
    setResult(null);

    executeQuery.mutate(
      { connectionId: selectedConnectionId, sql: activeTab.sql },
      {
        onSuccess: (res) => {
          if (res.success) {
            setResult(res.data);
          } else {
            setErrorMessage('Query execution failed');
          }
        },
        onError: (err) => {
          setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
        },
      },
    );
  }

  return (
    <div className="flex h-full flex-col">
      <QueryTabs />

      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border p-2">
        <Select
          className="h-8 w-48 text-sm"
          value={selectedConnectionId ?? ''}
          onChange={(e) => setSelectedConnectionId(e.target.value || null)}
        >
          <option value="">Select connection...</option>
          {connections?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.dbType})
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          onClick={handleRun}
          disabled={executeQuery.isPending || !selectedConnectionId || !activeTab?.sql.trim()}
        >
          <Play className="size-4" />
          {executeQuery.isPending ? 'Running...' : 'Run'}
        </Button>
      </div>

      {/* Editor */}
      <div className="flex-1 border-b border-border">
        <Textarea
          className="h-full min-h-0 resize-none rounded-none border-0 font-mono text-sm"
          placeholder="Enter SQL query..."
          value={activeTab?.sql ?? ''}
          onChange={(e) => {
            if (activeTabId) updateTabSql(activeTabId, e.target.value);
          }}
        />
      </div>

      {/* Results */}
      <div className="h-1/3 min-h-[120px] overflow-auto">
        {errorMessage && (
          <p className="p-3 text-sm text-destructive">{errorMessage}</p>
        )}
        {result && (
          <div className="p-2">
            <div className="mb-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{result.rowCount} rows</span>
              <span>{result.executionTimeMs}ms</span>
              {result.affectedRows !== undefined && (
                <span>{result.affectedRows} affected</span>
              )}
            </div>
            {result.columns.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {result.columns.map((col) => (
                        <th key={col} className="px-2 py-1 text-left font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                        {result.columns.map((col) => (
                          <td key={col} className="px-2 py-1 text-muted-foreground">
                            {row[col] === null ? (
                              <span className="italic text-muted-foreground/50">NULL</span>
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {!result && !errorMessage && (
          <p className="p-3 text-xs text-muted-foreground">
            Execute a query to see results here.
          </p>
        )}
      </div>
    </div>
  );
}
