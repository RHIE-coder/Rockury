import { useState } from 'react';
import {
  Sprout,
  Download,
  Copy,
  Check,
  Save,
  ArrowDown,
  Plus,
  FileText,
  RotateCcw,
  GitBranch,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { useConnections } from '@/features/db-connection';
import { useConnectionStore } from '@/features/db-connection/model/connectionStore';
import { useSeedCapture, useSeeds, useCreateSeed, useUpdateSeed } from '@/features/seed';
import { useDiagramStore } from '@/features/virtual-diagram';
import { seedApi } from '@/features/seed/api/seedApi';
import { useMutation } from '@tanstack/react-query';
import { getElectronApi } from '@/shared/api/electronApi';

export function SeedCapturePage() {
  const { data: connections } = useConnections();
  const { selectedConnectionId, setSelectedConnectionId } = useConnectionStore();
  const { realTables } = useDiagramStore();
  const captureHook = useSeedCapture();
  const createSeed = useCreateSeed();
  const updateSeed = useUpdateSeed();
  const { data: seeds } = useSeeds();
  const api = getElectronApi();

  const [tableName, setTableName] = useState('');
  const [whereClause, setWhereClause] = useState('');
  const [limit, setLimit] = useState('100');
  const [capturedDml, setCapturedDml] = useState('');
  const [capturedCount, setCapturedCount] = useState(0);
  const [fkOrderedTables, setFkOrderedTables] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveMode, setSaveMode] = useState<'append' | 'overwrite' | 'new'>('new');
  const [targetSeedId, setTargetSeedId] = useState('');
  const [newSeedName, setNewSeedName] = useState('');

  const connectionId = selectedConnectionId ?? connections?.[0]?.id ?? '';

  // Preview capture (basic, no FK ordering)
  const handleCapture = () => {
    if (!connectionId || !tableName) return;
    captureHook.mutate(
      { connectionId, tableName, whereClause: whereClause || undefined, limit: Number(limit) || 100 },
      {
        onSuccess: (result) => {
          if (result.success) {
            setCapturedDml(result.data.dml);
            setCapturedCount(result.data.rowCount);
            setFkOrderedTables([]);
          }
        },
      },
    );
  };

  // Capture with FK ordering
  const fkCaptureMutation = useMutation({
    mutationFn: () =>
      api.SEED_CAPTURE_WITH_FK({
        connectionId,
        tableName,
        whereClause: whereClause || undefined,
        limit: Number(limit) || 100,
        saveMode: 'new',
        newSeedName: tableName,
      }),
    onSuccess: (result) => {
      if (result.success) {
        setCapturedDml(result.data.dml);
        setCapturedCount(result.data.rowCount);
        setFkOrderedTables(result.data.fkOrderedTables);
      }
    },
  });

  const handleCaptureWithFk = () => {
    if (!connectionId || !tableName) return;
    fkCaptureMutation.mutate();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(capturedDml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!capturedDml) return;

    if (saveMode === 'new') {
      const name = newSeedName.trim() || `Capture: ${tableName}`;
      createSeed.mutate({
        name,
        description: `Captured from ${tableName}${whereClause ? ` WHERE ${whereClause}` : ''} (${capturedCount} rows)`,
        dmlContent: capturedDml,
        targetTables: fkOrderedTables.length > 0 ? fkOrderedTables : [tableName],
      });
    } else if (saveMode === 'append' && targetSeedId) {
      const existingSeed = seeds?.find((s) => s.id === targetSeedId);
      const mergedDml = existingSeed
        ? `${existingSeed.dmlContent}\n\n-- Appended from ${tableName}\n${capturedDml}`
        : capturedDml;
      updateSeed.mutate({ id: targetSeedId, dmlContent: mergedDml });
    } else if (saveMode === 'overwrite' && targetSeedId) {
      updateSeed.mutate({ id: targetSeedId, dmlContent: capturedDml });
    }

    setShowSaveDialog(false);
    setNewSeedName('');
    setTargetSeedId('');
  };

  const handleReset = () => {
    setCapturedDml('');
    setCapturedCount(0);
    setFkOrderedTables([]);
  };

  const tableNames = realTables.map((t) => t.name).sort();
  const isPending = captureHook.isPending || fkCaptureMutation.isPending;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Sprout className="size-4" />
        <h2 className="text-sm font-semibold">Seed Capture</h2>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Capture data from Live DB as Seed DML
        </span>
      </div>

      {/* Connection Selector */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <label className="text-[10px] font-medium text-muted-foreground">Connection</label>
        <Select
          value={connectionId}
          onChange={(e) => setSelectedConnectionId(e.target.value)}
          className="h-7 w-56 text-xs"
        >
          <option value="">Select connection...</option>
          {connections?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.dbType})
            </option>
          ))}
        </Select>
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
                <option key={name} value={name}>
                  {name}
                </option>
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
        <div className="flex gap-1.5">
          <Button
            variant="default"
            size="sm"
            onClick={handleCapture}
            disabled={!connectionId || !tableName || isPending}
            className="gap-1.5"
          >
            <Download className="size-3.5" />
            Capture
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCaptureWithFk}
            disabled={!connectionId || !tableName || isPending}
            className="gap-1.5"
          >
            <GitBranch className="size-3.5" />
            Capture with FK
          </Button>
        </div>
      </div>

      {/* Result */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!capturedDml && !isPending && (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <p className="text-sm">
              {connectionId
                ? 'Select a table and capture rows as INSERT DML'
                : 'Connect to a database first (Connection tab)'}
            </p>
          </div>
        )}
        {isPending && (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <p className="text-sm">Capturing...</p>
          </div>
        )}
        {capturedDml && (
          <>
            {/* FK Dependency Chain */}
            {fkOrderedTables.length > 0 && (
              <div className="border-b border-border px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <GitBranch className="size-3.5" />
                  <span>FK Dependency Order</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                  {fkOrderedTables.map((t, i) => (
                    <div key={t} className="flex items-center gap-1">
                      {i > 0 && <ArrowDown className="size-3 rotate-[-90deg] text-muted-foreground" />}
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-mono ${
                          t === tableName
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {t}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-xs text-muted-foreground">
                {capturedCount} rows captured
                {fkOrderedTables.length > 0 && ` across ${fkOrderedTables.length} tables`}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="xs" onClick={handleReset} className="gap-1">
                  <RotateCcw className="size-3" />
                  Reset
                </Button>
                <Button variant="outline" size="xs" onClick={handleCopy} className="gap-1">
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  variant="default"
                  size="xs"
                  onClick={() => {
                    setNewSeedName(`Capture: ${tableName}`);
                    setShowSaveDialog(true);
                  }}
                  disabled={createSeed.isPending || updateSeed.isPending}
                  className="gap-1"
                >
                  <Save className="size-3" />
                  Save to Seed
                </Button>
              </div>
            </div>

            {/* DML Preview */}
            <textarea
              className="flex-1 resize-none bg-muted/30 p-4 font-mono text-xs outline-none"
              value={capturedDml}
              readOnly
              spellCheck={false}
            />
          </>
        )}
      </div>

      {/* Save Dialog Modal */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-5 shadow-lg">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Save className="size-4" />
              Save Captured Data
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose how to save the captured DML ({capturedCount} rows).
            </p>

            {/* Save Mode Radio */}
            <div className="mt-4 space-y-2">
              {(
                [
                  { mode: 'new' as const, icon: Plus, label: 'Create new Seed File' },
                  { mode: 'append' as const, icon: FileText, label: 'Append to existing Seed File' },
                  {
                    mode: 'overwrite' as const,
                    icon: RotateCcw,
                    label: 'Overwrite existing Seed File',
                  },
                ] as const
              ).map(({ mode, icon: Icon, label }) => (
                <label
                  key={mode}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 transition-colors ${
                    saveMode === mode
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent/50'
                  }`}
                >
                  <input
                    type="radio"
                    checked={saveMode === mode}
                    onChange={() => setSaveMode(mode)}
                    className="accent-primary"
                  />
                  <Icon className="size-3.5 text-muted-foreground" />
                  <span className="text-xs">{label}</span>
                </label>
              ))}
            </div>

            {/* Conditional fields */}
            <div className="mt-3">
              {saveMode === 'new' ? (
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">
                    Seed File Name
                  </label>
                  <input
                    value={newSeedName}
                    onChange={(e) => setNewSeedName(e.target.value)}
                    placeholder="New seed file name..."
                    className="mt-0.5 w-full rounded border border-border bg-transparent px-2 py-1.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">
                    Target Seed File
                  </label>
                  <Select
                    value={targetSeedId}
                    onChange={(e) => setTargetSeedId(e.target.value)}
                    className="mt-0.5 w-full text-xs"
                  >
                    <option value="">Select seed file...</option>
                    {seeds?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={
                  (saveMode === 'new' && !newSeedName.trim()) ||
                  (saveMode !== 'new' && !targetSeedId) ||
                  createSeed.isPending ||
                  updateSeed.isPending
                }
              >
                {createSeed.isPending || updateSeed.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
