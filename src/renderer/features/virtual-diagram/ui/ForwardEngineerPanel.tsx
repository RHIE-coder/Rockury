import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Play, Copy, Check, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import type { ITable, TDbType } from '~/shared/types/db';
import { useConnections } from '@/features/db-connection';
import { ddlApi } from '@/features/ddl-editor/api/ddlApi';
import { queryApi } from '@/features/query-execution/api/queryApi';
import { schemaToDdl } from '@/features/ddl-editor/lib/schemaToDdl';

interface ForwardEngineerPanelProps {
  tables: ITable[];
  onClose: () => void;
}

export function ForwardEngineerPanel({ tables, onClose }: ForwardEngineerPanelProps) {
  const { data: connections } = useConnections();
  const [connectionId, setConnectionId] = useState('');
  const [dbType, setDbType] = useState<TDbType>('mysql');
  const [ddl, setDdl] = useState('');
  const [copied, setCopied] = useState(false);
  const [executeResult, setExecuteResult] = useState<{ success: boolean; message: string } | null>(null);
  const [confirmExecute, setConfirmExecute] = useState(false);

  const selectedConnection = connections?.find((c) => c.id === connectionId);

  function handleGenerate() {
    const generated = schemaToDdl(tables, dbType);
    setDdl(generated);
    setExecuteResult(null);
    setConfirmExecute(false);
  }

  const generateMutation = useMutation({
    mutationFn: () => ddlApi.generate({ tables, dbType }),
    onSuccess: (result) => {
      if (result.success) {
        setDdl(result.data.ddl);
        setExecuteResult(null);
        setConfirmExecute(false);
      }
    },
  });

  const executeMutation = useMutation({
    mutationFn: () => queryApi.execute({ connectionId, sql: ddl }),
    onSuccess: (result) => {
      setExecuteResult({
        success: result.success,
        message: result.success ? 'DDL executed successfully.' : 'Execution failed.',
      });
      setConfirmExecute(false);
    },
    onError: (error) => {
      setExecuteResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      setConfirmExecute(false);
    },
  });

  function handleCopy() {
    navigator.clipboard.writeText(ddl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Auto-set dbType when connection is selected
  function handleConnectionChange(id: string) {
    setConnectionId(id);
    const conn = connections?.find((c) => c.id === id);
    if (conn) setDbType(conn.dbType);
    setExecuteResult(null);
    setConfirmExecute(false);
  }

  return (
    <div className="flex w-96 flex-col rounded-lg border border-border bg-popover shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-xs font-semibold">Forward Engineering</h3>
        <Button variant="ghost" size="xs" onClick={onClose}>
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Settings */}
      <div className="space-y-2 border-b border-border p-3">
        <div className="flex items-center gap-2">
          <label className="w-20 text-xs text-muted-foreground">Connection</label>
          <Select
            className="h-7 flex-1 text-xs"
            value={connectionId}
            onChange={(e) => handleConnectionChange(e.target.value)}
          >
            <option value="">Select connection...</option>
            {connections?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.dbType})
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <label className="w-20 text-xs text-muted-foreground">DB Type</label>
          <Select
            className="h-7 flex-1 text-xs"
            value={dbType}
            onChange={(e) => setDbType(e.target.value as TDbType)}
          >
            <option value="mysql">MySQL</option>
            <option value="mariadb">MariaDB</option>
            <option value="postgresql">PostgreSQL</option>
          </Select>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="xs" onClick={handleGenerate}>
            Generate (Local)
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || tables.length === 0}
          >
            {generateMutation.isPending ? 'Generating...' : 'Generate (IPC)'}
          </Button>
        </div>
      </div>

      {/* DDL Preview */}
      {ddl && (
        <div className="border-b border-border">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[10px] font-medium text-muted-foreground">DDL Preview</span>
            <Button variant="ghost" size="xs" onClick={handleCopy}>
              {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
            </Button>
          </div>
          <pre className="max-h-48 overflow-auto px-3 pb-2 text-[11px] leading-relaxed text-foreground/80">
            {ddl}
          </pre>
        </div>
      )}

      {/* Execute section */}
      {ddl && connectionId && (
        <div className="p-3">
          {confirmExecute ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                <p className="text-[11px] text-destructive">
                  This will execute DDL on <strong>{selectedConnection?.name}</strong>
                  ({selectedConnection?.database}). This may modify the database schema.
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={() => executeMutation.mutate()}
                  disabled={executeMutation.isPending}
                >
                  <Play className="size-3" />
                  {executeMutation.isPending ? 'Executing...' : 'Confirm Execute'}
                </Button>
                <Button variant="ghost" size="xs" onClick={() => setConfirmExecute(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="xs"
              onClick={() => setConfirmExecute(true)}
            >
              <Play className="size-3" />
              Execute on {selectedConnection?.name ?? 'connection'}
            </Button>
          )}

          {executeResult && (
            <div className={`mt-2 rounded-md p-2 text-[11px] ${
              executeResult.success
                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                : 'bg-destructive/10 text-destructive'
            }`}>
              {executeResult.message}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!ddl && (
        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
          {tables.length === 0
            ? 'No tables in the current diagram.'
            : 'Click "Generate" to create DDL from your diagram.'}
        </div>
      )}
    </div>
  );
}
