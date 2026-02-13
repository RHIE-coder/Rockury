import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GitBranch, ArrowRightLeft, Play, AlertTriangle,
  Plus, Minus, Pencil, ChevronRight,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { useConnections } from '@/features/db-connection';
import { useDiagrams, useDiagramStore } from '@/features/virtual-diagram';
import type { IDiffResult, ITableDiff, IColumnDiff } from '../model/types';
import type { TDiffMode } from '~/shared/types/db';
import { diffApi } from '../api/diffApi';
import { useCreateMigration, useApplyMigration } from '../model/useMigrations';
import { DiffSummary } from './DiffSummary';
import { MigrationDdlView } from './MigrationDdlView';
import { MigrationPanel } from './MigrationPanel';

const ACTION_BORDER: Record<string, string> = {
  added: 'border-l-green-500',
  removed: 'border-l-red-500',
  modified: 'border-l-yellow-500',
};

const ACTION_ICON = {
  added: Plus,
  removed: Minus,
  modified: Pencil,
} as const;

const ACTION_ICON_STYLE: Record<string, string> = {
  added: 'text-green-500 bg-green-500/10',
  removed: 'text-red-500 bg-red-500/10',
  modified: 'text-yellow-500 bg-yellow-500/10',
};

const ACTION_LABEL: Record<string, string> = {
  added: 'Added',
  removed: 'Removed',
  modified: 'Modified',
};

const PREVIEW_LIMIT = 3;

function ColumnDiffRow({ col }: { col: IColumnDiff }) {
  const Icon = ACTION_ICON[col.action] ?? Pencil;
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className={`flex size-4 shrink-0 items-center justify-center rounded ${ACTION_ICON_STYLE[col.action] ?? ''}`}>
        <Icon className="size-2.5" />
      </span>
      <span className={`min-w-0 truncate text-xs ${col.action === 'removed' ? 'line-through opacity-60' : ''}`}>
        {col.columnName}
      </span>
      {col.changes && col.changes.length > 0 && (
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {col.changes.join(', ')}
        </span>
      )}
    </div>
  );
}

function TableDiffItem({ tableDiff }: { tableDiff: ITableDiff }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ACTION_ICON[tableDiff.action] ?? Pencil;
  const colCount = tableDiff.columnDiffs.length;
  const previewCols = tableDiff.columnDiffs.slice(0, PREVIEW_LIMIT);
  const hiddenCount = colCount - PREVIEW_LIMIT;
  const showExpander = colCount > PREVIEW_LIMIT;

  return (
    <div className={`rounded-md border border-l-2 border-border bg-card p-3 ${ACTION_BORDER[tableDiff.action] ?? ''}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className={`flex size-5 shrink-0 items-center justify-center rounded ${ACTION_ICON_STYLE[tableDiff.action] ?? ''}`}>
          <Icon className="size-3" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{tableDiff.tableName}</span>
        <span className={`text-[10px] font-medium ${ACTION_ICON_STYLE[tableDiff.action]?.split(' ')[0] ?? 'text-muted-foreground'}`}>
          {ACTION_LABEL[tableDiff.action]}
        </span>
        {colCount > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {colCount} col{colCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Column diffs */}
      {colCount > 0 && (
        <div className="mt-2 pl-7">
          {(expanded ? tableDiff.columnDiffs : previewCols).map((col) => (
            <ColumnDiffRow key={col.columnName} col={col} />
          ))}
          {showExpander && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className={`size-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              {expanded ? 'Show less' : `${hiddenCount} more column${hiddenCount !== 1 ? 's' : ''}...`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function DiffView() {
  const { data: diagrams } = useDiagrams('virtual');
  const { data: connections } = useConnections();
  const queryClient = useQueryClient();
  const {
    selectedDiagramId: storeDiagramId,
    selectedConnectionId: storeConnectionId,
  } = useDiagramStore();

  const [diffMode, setDiffMode] = useState<TDiffMode>('virtual_vs_real');
  const [selectedDiagramId, setSelectedDiagramId] = useState('');
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [targetDiagramId, setTargetDiagramId] = useState('');
  const [diffResult, setDiffResult] = useState<IDiffResult | null>(null);

  // Auto-sync from global store when tab is shown
  useEffect(() => {
    if (storeDiagramId && !selectedDiagramId) {
      setSelectedDiagramId(storeDiagramId);
    }
  }, [storeDiagramId, selectedDiagramId]);

  useEffect(() => {
    if (storeConnectionId && !selectedConnectionId) {
      setSelectedConnectionId(storeConnectionId);
    }
  }, [storeConnectionId, selectedConnectionId]);

  // Clear results when mode changes
  useEffect(() => {
    setDiffResult(null);
  }, [diffMode]);

  const compareRealMutation = useMutation({
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

  const compareVirtualMutation = useMutation({
    mutationFn: () =>
      diffApi.compareVirtual({
        sourceDiagramId: selectedDiagramId,
        targetDiagramId,
      }),
    onSuccess: (result) => {
      if (result.success) {
        setDiffResult(result.data);
      }
    },
  });

  const isComparing = compareRealMutation.isPending || compareVirtualMutation.isPending;
  const isCompareError = compareRealMutation.isError || compareVirtualMutation.isError;

  const createMigration = useCreateMigration();
  const applyMigration = useApplyMigration();
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);

  const applyToVirtualMutation = useMutation({
    mutationFn: () =>
      diffApi.applyRealToVirtual({
        virtualDiagramId: selectedDiagramId,
        connectionId: selectedConnectionId,
      }),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['diagrams'] });
        setDiffResult(null);
      }
    },
  });

  function handleCompare() {
    if (!selectedDiagramId) return;
    if (diffMode === 'virtual_vs_real') {
      if (!selectedConnectionId) return;
      compareRealMutation.mutate();
    } else {
      if (!targetDiagramId) return;
      compareVirtualMutation.mutate();
    }
  }

  const canCompare = diffMode === 'virtual_vs_real'
    ? !!selectedDiagramId && !!selectedConnectionId
    : !!selectedDiagramId && !!targetDiagramId && selectedDiagramId !== targetDiagramId;

  function handleCreateMigration() {
    if (!diffResult || !selectedDiagramId || !selectedConnectionId) return;
    createMigration.mutate({
      diagramId: selectedDiagramId,
      connectionId: selectedConnectionId,
      direction: 'virtual_to_real',
      diffSnapshot: diffResult,
      migrationDdl: diffResult.migrationDdl,
      rollbackDdl: diffResult.rollbackDdl,
    });
  }

  function handleApplyToVirtual() {
    if (!selectedDiagramId || !selectedConnectionId) return;
    applyToVirtualMutation.mutate();
  }

  function handleApplyToReal() {
    if (!diffResult || !selectedDiagramId || !selectedConnectionId) return;
    createMigration.mutate(
      {
        diagramId: selectedDiagramId,
        connectionId: selectedConnectionId,
        direction: 'virtual_to_real',
        diffSnapshot: diffResult,
        migrationDdl: diffResult.migrationDdl,
        rollbackDdl: diffResult.rollbackDdl,
      },
      {
        onSuccess: (result) => {
          if (result.success && result.data) {
            applyMigration.mutate(result.data.id);
          }
        },
      },
    );
    setShowApplyConfirm(false);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        {/* Mode selector */}
        <Select
          className="h-8 w-44 text-sm"
          value={diffMode}
          onChange={(e) => setDiffMode(e.target.value as TDiffMode)}
        >
          <option value="virtual_vs_real">Virtual vs Real</option>
          <option value="virtual_vs_virtual">Virtual vs Virtual</option>
        </Select>

        <span className="text-muted-foreground">|</span>

        {/* Source diagram (always shown) */}
        <Select
          className="h-8 w-48 text-sm"
          value={selectedDiagramId}
          onChange={(e) => setSelectedDiagramId(e.target.value)}
        >
          <option value="">Source diagram...</option>
          {diagrams?.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>

        <span className="text-sm text-muted-foreground">vs</span>

        {/* Target: connection or diagram based on mode */}
        {diffMode === 'virtual_vs_real' ? (
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
        ) : (
          <Select
            className="h-8 w-48 text-sm"
            value={targetDiagramId}
            onChange={(e) => setTargetDiagramId(e.target.value)}
          >
            <option value="">Target diagram...</option>
            {diagrams
              ?.filter((d) => d.id !== selectedDiagramId)
              .map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
          </Select>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleCompare}
          disabled={!canCompare || isComparing}
        >
          {isComparing ? 'Comparing...' : 'Compare'}
        </Button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {diffResult ? (
          <div className="space-y-4">
            <DiffSummary diff={diffResult} />

            {/* Action buttons - only for virtual_vs_real mode */}
            {diffResult.hasDifferences && diffMode === 'virtual_vs_real' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateMigration}
                    disabled={createMigration.isPending}
                  >
                    <GitBranch className="mr-1 size-3.5" />
                    {createMigration.isPending ? 'Creating...' : 'Create Migration'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApplyToVirtual}
                    disabled={applyToVirtualMutation.isPending}
                  >
                    <ArrowRightLeft className="mr-1 size-3.5" />
                    {applyToVirtualMutation.isPending ? 'Applying...' : 'Apply Real → Virtual'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowApplyConfirm(true)}
                    disabled={applyMigration.isPending}
                  >
                    <Play className="mr-1 size-3.5" />
                    Apply Virtual → Real
                  </Button>
                </div>

                {showApplyConfirm && (
                  <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 size-4 text-yellow-600 dark:text-yellow-400" />
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          This will execute DDL statements on the real database.
                        </p>
                        <pre className="max-h-32 overflow-y-auto rounded bg-yellow-100 p-2 text-xs dark:bg-yellow-900">
                          {diffResult.migrationDdl || 'No DDL to execute'}
                        </pre>
                        <div className="flex gap-2">
                          <Button variant="destructive" size="sm" onClick={handleApplyToReal}>
                            Confirm Apply
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setShowApplyConfirm(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Diff info header for virtual_vs_virtual */}
            {diffMode === 'virtual_vs_virtual' && diffResult.sourceName && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Comparing <span className="font-medium text-foreground">{diffResult.sourceName}</span>
                {' → '}
                <span className="font-medium text-foreground">{diffResult.targetName}</span>
              </div>
            )}

            <div className="space-y-2">
              {diffResult.tableDiffs.map((tableDiff) => (
                <TableDiffItem key={tableDiff.tableName} tableDiff={tableDiff} />
              ))}
            </div>
            <MigrationDdlView ddl={diffResult.migrationDdl} />

            {/* Migration History - only for virtual_vs_real */}
            {diffMode === 'virtual_vs_real' && selectedDiagramId && selectedConnectionId && (
              <MigrationPanel
                diagramId={selectedDiagramId}
                connectionId={selectedConnectionId}
              />
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {isCompareError
                ? 'Failed to compare schemas. Please check your selections.'
                : diffMode === 'virtual_vs_real'
                  ? 'Select a virtual diagram and a connection, then click "Compare" to see differences.'
                  : 'Select two virtual diagrams to compare, then click "Compare" to see differences.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
