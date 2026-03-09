import { useState } from 'react';
import { Table as TableIcon, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { useConnections } from '@/features/db-connection';
import { useConnectionStore } from '@/features/db-connection/model/connectionStore';
import { useDiagramStore } from '@/features/virtual-diagram';
import { getElectronApi } from '@/shared/api/electronApi';
import type { IQueryResult } from '~/shared/types/db';

const PAGE_SIZE = 50;

export function DataBrowserPage() {
  const { data: connections } = useConnections();
  const { selectedConnectionId } = useConnectionStore();
  const { realTables } = useDiagramStore();

  const [tableName, setTableName] = useState('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<IQueryResult | null>(null);

  const connectionId = selectedConnectionId ?? connections?.[0]?.id ?? '';

  const queryMutation = useMutation({
    mutationFn: async ({ sql }: { sql: string }) => {
      const api = getElectronApi();
      const res = await api.QUERY_EXECUTE({ connectionId, sql });
      if (!res.success) throw new Error('Query failed');
      return res.data;
    },
  });

  const fetchPage = (table: string, pageNum: number) => {
    const offset = pageNum * PAGE_SIZE;
    const sql = `SELECT * FROM ${table} LIMIT ${PAGE_SIZE} OFFSET ${offset}`;
    queryMutation.mutate(
      { sql },
      { onSuccess: (data) => { setResult(data); setPage(pageNum); } },
    );
  };

  const handleTableSelect = (name: string) => {
    setTableName(name);
    if (name) fetchPage(name, 0);
  };

  const tableNames = realTables.map((t) => t.name).sort();

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <TableIcon className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Data Browser</h2>
        <div className="ml-4">
          {tableNames.length > 0 ? (
            <Select value={tableName} onChange={(e) => handleTableSelect(e.target.value)} className="w-48">
              <option value="">Select table...</option>
              {tableNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Select>
          ) : (
            <span className="text-xs text-muted-foreground">
              {connectionId ? 'Sync schema first (Diagram tab)' : 'Connect to a database first'}
            </span>
          )}
        </div>
        {tableName && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => fetchPage(tableName, page)}
            disabled={queryMutation.isPending}
          >
            <RefreshCw className={`size-3.5 ${queryMutation.isPending ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>

      {/* Table */}
      {!result && !queryMutation.isPending && (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <p className="text-sm">Select a table to browse data</p>
        </div>
      )}

      {queryMutation.isPending && (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <RefreshCw className="size-4 animate-spin" />
        </div>
      )}

      {result && (
        <>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="border-b border-r border-border px-3 py-1.5 text-left font-medium text-muted-foreground">#</th>
                  {result.columns.map((col) => (
                    <th key={col} className="whitespace-nowrap border-b border-r border-border px-3 py-1.5 text-left font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-accent/50">
                    <td className="border-b border-r border-border px-3 py-1 text-muted-foreground">
                      {page * PAGE_SIZE + i + 1}
                    </td>
                    {result.columns.map((col) => (
                      <td key={col} className="max-w-xs truncate border-b border-r border-border px-3 py-1">
                        {row[col] === null ? (
                          <span className="text-muted-foreground/50">NULL</span>
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

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2">
            <span className="text-xs text-muted-foreground">
              {result.rowCount} rows (page {page + 1})
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-6"
                onClick={() => fetchPage(tableName, page - 1)}
                disabled={page === 0 || queryMutation.isPending}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-6"
                onClick={() => fetchPage(tableName, page + 1)}
                disabled={result.rowCount < PAGE_SIZE || queryMutation.isPending}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
