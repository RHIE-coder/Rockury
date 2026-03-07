import { useState } from 'react';
import { Sprout, Download, Copy, Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { useConnections } from '@/features/db-connection';
import { useConnectionStore } from '@/features/db-connection/model/connectionStore';
import { useSeedCapture, useCreateSeed } from '@/features/seed';
import { useDiagramStore } from '@/features/virtual-diagram';

export function SeedCapturePage() {
  const { data: connections } = useConnections();
  const { selectedConnectionId } = useConnectionStore();
  const { realTables } = useDiagramStore();
  const captureHook = useSeedCapture();
  const createSeed = useCreateSeed();

  const [tableName, setTableName] = useState('');
  const [whereClause, setWhereClause] = useState('');
  const [limit, setLimit] = useState('100');
  const [capturedDml, setCapturedDml] = useState('');
  const [capturedCount, setCapturedCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const connectionId = selectedConnectionId ?? connections?.[0]?.id ?? '';

  const handleCapture = () => {
    if (!connectionId || !tableName) return;
    captureHook.mutate(
      { connectionId, tableName, whereClause: whereClause || undefined, limit: Number(limit) || 100 },
      {
        onSuccess: (result) => {
          if (result.success) {
            setCapturedDml(result.data.dml);
            setCapturedCount(result.data.rowCount);
          }
        },
      },
    );
  };

  const handleSaveAsSeed = () => {
    if (!capturedDml) return;
    createSeed.mutate({
      name: `Capture: ${tableName}`,
      description: `Captured from ${tableName}${whereClause ? ` WHERE ${whereClause}` : ''} (${capturedCount} rows)`,
      dmlContent: capturedDml,
      targetTables: [tableName],
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(capturedDml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tableNames = realTables.map((t) => t.name).sort();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Sprout className="size-4" />
        <h2 className="text-sm font-semibold">Seed Capture</h2>
      </div>

      {/* Config */}
      <div className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-3">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground">Table</label>
          {tableNames.length > 0 ? (
            <Select
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="mt-0.5 w-48"
            >
              <option value="">Select table...</option>
              {tableNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Select>
          ) : (
            <input
              className="mt-0.5 w-48 rounded border border-border bg-transparent px-2 py-1 text-xs outline-none focus:border-primary"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="table_name"
            />
          )}
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground">WHERE (optional)</label>
          <input
            className="mt-0.5 w-64 rounded border border-border bg-transparent px-2 py-1 text-xs outline-none focus:border-primary"
            value={whereClause}
            onChange={(e) => setWhereClause(e.target.value)}
            placeholder="status = 'active'"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground">Limit</label>
          <input
            className="mt-0.5 w-20 rounded border border-border bg-transparent px-2 py-1 text-xs outline-none focus:border-primary"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            type="number"
          />
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={handleCapture}
          disabled={!connectionId || !tableName || captureHook.isPending}
          className="gap-1.5"
        >
          <Download className="size-3.5" />
          Capture
        </Button>
      </div>

      {/* Result */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!capturedDml && !captureHook.isPending && (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <p className="text-sm">
              {connectionId ? 'Select a table and capture rows as INSERT DML' : 'Connect to a database first (Connection tab)'}
            </p>
          </div>
        )}
        {captureHook.isPending && (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <p className="text-sm">Capturing...</p>
          </div>
        )}
        {capturedDml && (
          <>
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-xs text-muted-foreground">{capturedCount} rows captured</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSaveAsSeed} disabled={createSeed.isPending} className="gap-1.5">
                  <Sprout className="size-3.5" />
                  Save as Seed
                </Button>
              </div>
            </div>
            <textarea
              className="flex-1 resize-none bg-muted/30 p-4 font-mono text-xs outline-none"
              value={capturedDml}
              readOnly
              spellCheck={false}
            />
          </>
        )}
      </div>
    </div>
  );
}
