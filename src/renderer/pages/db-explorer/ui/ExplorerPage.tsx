import { useState, useCallback } from 'react';
import { Terminal, Play, Clock, Trash2, Database, Loader2, ChevronDown } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useConnections } from '@/features/db-connection';
import { useExecuteQuery, useQueryHistory } from '@/features/query-execution';
import type { IQueryResult } from '~/shared/types/db';

interface HistoryEntry {
  sql: string;
  executedAt: string;
  status: 'success' | 'error';
  rowCount?: number;
  executionTimeMs?: number;
}

export function ExplorerPage() {
  const [sql, setSql] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [result, setResult] = useState<IQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localHistory, setLocalHistory] = useState<HistoryEntry[]>([]);

  const { data: connections } = useConnections();
  const executeMutation = useExecuteQuery();

  const handleExecute = useCallback(() => {
    if (!sql.trim() || !connectionId) return;

    setError(null);
    executeMutation.mutate(
      { connectionId, sql },
      {
        onSuccess: (res) => {
          if (res.success) {
            setResult(res.data);
            setError(null);
            setLocalHistory((prev) => [
              {
                sql,
                executedAt: new Date().toISOString(),
                status: 'success',
                rowCount: res.data.rowCount,
                executionTimeMs: res.data.executionTimeMs,
              },
              ...prev.slice(0, 49),
            ]);
          } else {
            setError('Query execution failed');
            setLocalHistory((prev) => [
              { sql, executedAt: new Date().toISOString(), status: 'error' },
              ...prev.slice(0, 49),
            ]);
          }
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLocalHistory((prev) => [
            { sql, executedAt: new Date().toISOString(), status: 'error' },
            ...prev.slice(0, 49),
          ]);
        },
      },
    );
  }, [sql, connectionId, executeMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
  };

  const clearHistory = () => {
    setLocalHistory([]);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <Terminal className="size-5 text-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Explorer</h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            ad-hoc queries
          </span>
        </div>
        <div className="relative">
          <select
            value={connectionId}
            onChange={(e) => setConnectionId(e.target.value)}
            className="appearance-none rounded-md border border-border bg-background px-3 py-1.5 pr-8 text-sm text-foreground outline-none transition-colors hover:border-ring focus:border-ring focus:ring-1 focus:ring-ring"
          >
            <option value="">Select connection...</option>
            {(connections ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Database className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: History panel */}
        <div className="w-56 shrink-0 overflow-y-auto border-r border-border">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <Clock className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">History</span>
              <span className="text-[10px] text-muted-foreground">({localHistory.length})</span>
            </div>
            {localHistory.length > 0 && (
              <button
                onClick={clearHistory}
                className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Clear history"
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
          {localHistory.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <Clock className="mx-auto size-6 text-muted-foreground/30" />
              <p className="mt-1 text-[10px] text-muted-foreground">No history yet</p>
            </div>
          ) : (
            localHistory.map((item, i) => (
              <button
                key={`${item.executedAt}-${i}`}
                onClick={() => setSql(item.sql)}
                className="group w-full border-b border-border/50 px-3 py-2 text-left transition-colors hover:bg-accent"
              >
                <div className="flex items-start justify-between gap-1">
                  <pre className="flex-1 truncate font-mono text-[11px] text-foreground">
                    {item.sql.slice(0, 60)}
                  </pre>
                  <div
                    className={`mt-0.5 size-1.5 shrink-0 rounded-full ${
                      item.status === 'success' ? 'bg-green-500' : 'bg-destructive'
                    }`}
                  />
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{formatTime(item.executedAt)}</span>
                  {item.rowCount !== undefined && <span>{item.rowCount} rows</span>}
                  {item.executionTimeMs !== undefined && <span>{item.executionTimeMs}ms</span>}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right: Results + Input */}
        <div className="flex flex-1 flex-col">
          {/* Results area */}
          <div className="flex-1 overflow-auto p-4">
            {error ? (
              <ErrorDisplay message={error} />
            ) : result ? (
              <ResultsTable results={result} />
            ) : (
              <EmptyState />
            )}
          </div>

          {/* SQL Input (terminal-like) */}
          <div className="border-t border-border bg-muted/30 p-3">
            <div className="flex items-start gap-2">
              <span className="mt-2 select-none font-mono text-xs text-green-500">$</span>
              <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type SQL here..."
                className="flex-1 resize-none bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
                rows={3}
              />
              <button
                onClick={handleExecute}
                disabled={executeMutation.isPending || !sql.trim() || !connectionId}
                className="mt-1 rounded-md bg-primary px-3 py-1.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {executeMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
              </button>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/60">
                {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter to execute
              </span>
              {!connectionId && sql.trim() && (
                <span className="text-[10px] text-amber-500">Select a connection first</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultsTable({ results }: { results: IQueryResult }) {
  if (results.columns.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-4 text-center">
        <p className="text-sm text-foreground">Query executed successfully</p>
        {results.affectedRows !== undefined && (
          <p className="mt-1 text-xs text-muted-foreground">
            {results.affectedRows} row(s) affected
          </p>
        )}
        <p className="mt-1 text-[10px] text-muted-foreground">{results.executionTimeMs}ms</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground">#</th>
            {results.columns.map((col) => (
              <th key={col} className="px-3 py-2 text-left font-medium text-foreground">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.rows.map((row, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-accent/30">
              <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">{i + 1}</td>
              {results.columns.map((col) => (
                <td key={col} className="px-3 py-1.5 font-mono text-foreground">
                  {row[col] === null ? (
                    <span className="italic text-muted-foreground">NULL</span>
                  ) : (
                    String(row[col])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-1.5">
        <span className="text-[10px] text-muted-foreground">
          {results.rowCount} row{results.rowCount !== 1 ? 's' : ''}
        </span>
        <span className="text-[10px] text-muted-foreground">{results.executionTimeMs}ms</span>
      </div>
    </div>
  );
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm font-medium text-destructive">Error</p>
      <p className="mt-1 font-mono text-xs text-destructive/80">{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Terminal className="mx-auto size-8 text-muted-foreground/30" />
        <p className="mt-2 text-sm text-muted-foreground">Run a query to see results</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Press {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter or click the play
          button
        </p>
      </div>
    </div>
  );
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
