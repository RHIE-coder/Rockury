import { useState, useCallback, useEffect, useMemo } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
import { useConnections } from '@/features/db-connection';
import { HighlightedSql } from '@/shared/lib/sqlHighlight';
import { useDataBrowserStore } from '@/features/data-browser/model/dataBrowserStore';
import { useConnectionStore } from '@/features/db-connection/model/connectionStore';
import { useDiagramStore } from '@/features/virtual-diagram';
import { realDiagramApi } from '@/features/real-diagram/api/realDiagramApi';
import { sanitizeImportedTables } from '@/features/real-diagram/lib/sanitizeImportedTables';
import { queryApi } from '@/features/query-execution/api/queryApi';
import {
  DataTableListPanel,
  DataGrid,
  DataToolbar,
  DataFooter,
  FilterRow,
  ColumnVisibility,
  ExportMenu,
  PendingChangesPanel,
  TableConstraintsPanel,
  ConstraintEditorModal,
  RowContextMenu,
  FkLookupModal,
  TimezoneSelector,
  useDataQuery,
  usePendingChanges,
  toCsv,
  toJson,
  toSqlInsert,
  getLocalTimezone,
  getTimezoneOptions,
  DATE_DISPLAY_CYCLE,
  DATE_DISPLAY_LABELS,
} from '@/features/data-browser';
import type { TDateDisplayMode, TConstraintEditMode, IConstraintExecResult } from '@/features/data-browser';
import { buildFkSelectionValues, resolveFkLookupConfig } from '@/features/data-browser/lib/fkLookup';
import type { TDbType, TConstraintType } from '~/shared/types/db';

type TRow = Record<string, unknown>;

function ViewSqlBanner({ sql, isMaterialized }: { sql: string; isMaterialized?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const label = isMaterialized ? 'Materialized View' : 'View';
  const badgeColor = isMaterialized
    ? 'bg-teal-500/20 text-teal-700 dark:text-teal-400'
    : 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400';

  return (
    <div className="border-b border-border bg-muted/30 px-3 py-1.5">
      <div className="flex items-center gap-2">
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold leading-none ${badgeColor}`}>
          {label}
        </span>
        {!expanded && (
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
            <HighlightedSql sql={sql.replace(/\s+/g, ' ').slice(0, 120) + (sql.length > 120 ? '...' : '')} />
          </span>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-[10px] text-muted-foreground underline hover:text-foreground"
        >
          {expanded ? 'Hide' : 'Show SQL'}
        </button>
      </div>
      {expanded && (
        <pre className="mt-1.5 max-h-[160px] overflow-auto whitespace-pre-wrap break-all rounded bg-muted px-2 py-1.5 font-mono text-[11px] leading-relaxed">
          <HighlightedSql sql={sql} />
        </pre>
      )}
    </div>
  );
}

export function DataBrowserPage() {
  const { data: connections } = useConnections();
  const { selectedConnectionId } = useConnectionStore();
  const { realTables, setRealTables } = useDiagramStore();

  const connectionId = selectedConnectionId ?? '';

  // Auto-load tables if not yet populated (e.g. user navigated to Data tab before Diagram tab)
  useEffect(() => {
    if (!connectionId || realTables.length > 0) return;
    realDiagramApi.fetchReal(connectionId).then((result) => {
      if (result.success && result.data && result.data.tables?.length > 0) {
        setRealTables(sanitizeImportedTables(result.data.tables));
      }
    });
  }, [connectionId, realTables.length, setRealTables]);
  const selectedConnection = connections?.find((c) => c.id === connectionId);
  const dbType: TDbType = (selectedConnection?.dbType as TDbType) ?? 'mysql';

  const {
    state,
    result,
    error,
    isLoading,
    selectTable,
    setPage,
    setPageSize,
    toggleSort,
    setFilters,
    refresh,
    dismissError,
  } = useDataQuery(connectionId, dbType);

  const { columnVisibility, setColumnVisibility } = useDataBrowserStore();

  // Find selected table metadata
  const selectedTableMeta = realTables.find((t) => t.name === state.tableName);
  const pkConstraint = selectedTableMeta?.constraints.find((c) => c.type === 'PK');
  const hasPk = !!pkConstraint;
  const pkColumns = pkConstraint?.columns ?? [];
  const allColumns = result?.columns ?? [];

  // Pending changes
  const pending = usePendingChanges(state.tableName, dbType, pkColumns, allColumns, selectedTableMeta?.columns);
  const [isApplying, setIsApplying] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Timezone
  const tzOptions = useMemo(() => getTimezoneOptions(), []);
  const [timezone, setTimezone] = useState(() => getLocalTimezone());
  const [dateDisplayMode, setDateDisplayMode] = useState<TDateDisplayMode>('utc');

  const cycleDateDisplayMode = useCallback(() => {
    setDateDisplayMode((prev) => {
      const idx = DATE_DISPLAY_CYCLE.indexOf(prev);
      return DATE_DISPLAY_CYCLE[(idx + 1) % DATE_DISPLAY_CYCLE.length];
    });
  }, []);

  // Constraints panel (bottom)
  const [constraintsOpen, setConstraintsOpen] = useState(true);

  // Constraint editor state
  const [constraintEditMode, setConstraintEditMode] = useState<TConstraintEditMode | null>(null);

  const handleConstraintExecute = useCallback(async (sqlStatements: string[], rollbackSql?: string): Promise<IConstraintExecResult> => {
    let executedCount = 0;

    for (const sql of sqlStatements) {
      try {
        const res = await queryApi.execute({ connectionId, sql });
        if (res.success) {
          executedCount++;
        } else {
          const errorMsg = (res as any).error ?? 'Unknown error';

          // If this is a multi-statement op (DROP+ADD) and DROP succeeded but ADD failed,
          // attempt rollback to restore the original constraint
          if (executedCount > 0 && rollbackSql) {
            try {
              const rollbackRes = await queryApi.execute({ connectionId, sql: rollbackSql });
              if (rollbackRes.success) {
                return { success: false, error: `${errorMsg}\n\nSQL: ${sql}`, rolledBack: true };
              }
              return { success: false, error: `${errorMsg}\n\nSQL: ${sql}`, rolledBack: false, rollbackError: (rollbackRes as any).error ?? 'Unknown error' };
            } catch (re) {
              return { success: false, error: `${errorMsg}\n\nSQL: ${sql}`, rolledBack: false, rollbackError: (re as Error).message };
            }
          }

          return { success: false, error: `${errorMsg}\n\nSQL: ${sql}` };
        }
      } catch (e) {
        const errorMsg = (e as Error).message;

        if (executedCount > 0 && rollbackSql) {
          try {
            const rollbackRes = await queryApi.execute({ connectionId, sql: rollbackSql });
            if (rollbackRes.success) {
              return { success: false, error: `${errorMsg}\n\nSQL: ${sql}`, rolledBack: true };
            }
            return { success: false, error: `${errorMsg}\n\nSQL: ${sql}`, rolledBack: false, rollbackError: (rollbackRes as any).error ?? 'Unknown error' };
          } catch (re) {
            return { success: false, error: `${errorMsg}\n\nSQL: ${sql}`, rolledBack: false, rollbackError: (re as Error).message };
          }
        }

        return { success: false, error: `${errorMsg}\n\nSQL: ${sql}` };
      }
    }

    // Re-sync schema to pick up constraint changes
    realDiagramApi.fetchReal(connectionId).then((res) => {
      if (res.success && res.data && res.data.tables?.length > 0) {
        setRealTables(sanitizeImportedTables(res.data.tables));
      }
    });
    refresh();
    return { success: true };
  }, [connectionId, refresh, setRealTables]);

  const handleConstraintValidate = useCallback(async (sql: string) => {
    try {
      const res = await queryApi.execute({ connectionId, sql });
      if (res.success && res.data) {
        return { rows: (res.data as any).rows ?? [], columns: (res.data as any).columns ?? [] };
      }
      return null;
    } catch {
      return null;
    }
  }, [connectionId]);

  // FK lookup state
  const [fkLookup, setFkLookup] = useState<{
    row: TRow;
    column: string;
    refTable: string;
    refColumns: string[];
    sourceColumns: string[];
    activeRefColumn: string;
  } | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    row: TRow;
    column: string;
  } | null>(null);

  // Handle table select with unsaved changes guard
  const handleTableSelect = useCallback(
    (name: string) => {
      if (pending.hasChanges) {
        const confirmed = window.confirm('You have unsaved changes. Discard and switch table?');
        if (!confirmed) return;
        pending.discard();
      }
      setEditMode(false);
      selectTable(name);
    },
    [pending, selectTable],
  );

  // Apply pending changes
  const handleApply = useCallback(async () => {
    const statements = pending.generateSql();
    if (statements.length === 0) return;

    setIsApplying(true);
    let successCount = 0;
    const failures: { sql: string; error: string }[] = [];

    for (const sql of statements) {
      try {
        const res = await queryApi.execute({ connectionId, sql });
        if (res.success) {
          successCount++;
        } else {
          failures.push({ sql, error: (res as any).error ?? 'Unknown error' });
        }
      } catch (e) {
        failures.push({ sql, error: (e as Error).message });
      }
    }

    setIsApplying(false);

    if (failures.length > 0) {
      window.alert(
        `${successCount} succeeded, ${failures.length} failed.\n\n${failures.map((f) => `Error: ${f.error}\nSQL: ${f.sql}`).join('\n\n')}`,
      );
    }

    if (failures.length === 0) {
      pending.discard();
    }
    refresh();
  }, [pending, connectionId, refresh]);

  // Export handler
  const handleExport = useCallback(
    async (format: 'csv' | 'json' | 'sql') => {
      if (!result) return;
      let content: string;
      let ext: string;
      if (format === 'csv') {
        content = toCsv(result.columns, result.rows as TRow[]);
        ext = 'csv';
      } else if (format === 'json') {
        content = toJson(result.rows as TRow[]);
        ext = 'json';
      } else {
        content = toSqlInsert(state.tableName, dbType, result.columns, result.rows as TRow[]);
        ext = 'sql';
      }

      try {
        const { filePath } = await (window as any).electronAPI.showSaveDialog({
          defaultPath: `${state.tableName}.${ext}`,
          filters: [{ name: format.toUpperCase(), extensions: [ext] }],
        });
        if (filePath) {
          await (window as any).electronAPI.writeFile(filePath, content);
        }
      } catch {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(content);
      }
    },
    [result, state.tableName, dbType],
  );

  // Context menu handlers
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, row: TRow, column: string) => {
      setContextMenu({ position: { x: e.clientX, y: e.clientY }, row, column });
    },
    [],
  );

  const handleCopyCell = useCallback(() => {
    if (!contextMenu) return;
    const val = contextMenu.row[contextMenu.column];
    navigator.clipboard.writeText(val === null ? 'NULL' : String(val));
  }, [contextMenu]);

  const handleCopyRowJson = useCallback(() => {
    if (!contextMenu) return;
    navigator.clipboard.writeText(JSON.stringify(contextMenu.row, null, 2));
  }, [contextMenu]);

  const canEdit = hasPk;

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <DataTableListPanel
        tables={realTables}
        selectedTableName={state.tableName}
        onTableSelect={handleTableSelect}
      />

      {/* Main Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {state.tableName ? (
          <>
            {/* Toolbar */}
            <DataToolbar
              tableName={state.tableName}
              isLoading={isLoading}
              onRefresh={refresh}
              hasPk={hasPk}
              editMode={editMode}
              onToggleEditMode={() => {
                if (editMode && pending.hasChanges) {
                  const confirmed = window.confirm('You have unsaved changes. Discard and exit edit mode?');
                  if (!confirmed) return;
                  pending.discard();
                }
                setEditMode((v) => !v);
              }}
              canEdit={canEdit}
              hasChanges={pending.hasChanges}
              changeCount={pending.changeCount}
              onAddRow={pending.insertRow}
              onApply={handleApply}
              onDiscard={pending.discard}
              exportSlot={result && <ExportMenu onExport={handleExport} />}
              timezoneSlot={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={cycleDateDisplayMode}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                      dateDisplayMode === 'utc'
                        ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                        : dateDisplayMode === 'local'
                          ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                          : 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                    }`}
                    title={`Date display: ${DATE_DISPLAY_LABELS[dateDisplayMode]} (click to cycle)`}
                  >
                    {DATE_DISPLAY_LABELS[dateDisplayMode]}
                  </button>
                  {dateDisplayMode === 'local' && (
                    <TimezoneSelector options={tzOptions} value={timezone} onChange={setTimezone} />
                  )}
                </div>
              }
              columnsSlot={
                result && (
                  <ColumnVisibility
                    columns={result.columns}
                    visibility={columnVisibility}
                    onChange={setColumnVisibility}
                  />
                )
              }
            />

            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-2 bg-destructive/10 px-3 py-2">
                <span className="flex-1 text-xs text-destructive">{error}</span>
                <button
                  type="button"
                  onClick={dismissError}
                  className="text-xs text-destructive underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* View SQL Definition Banner */}
            {selectedTableMeta?.isView && selectedTableMeta.viewDefinition && (
              <ViewSqlBanner sql={selectedTableMeta.viewDefinition} isMaterialized={selectedTableMeta.isMaterialized} />
            )}

            {/* Filter Row */}
            {result && (
              <FilterRow
                columns={result.columns}
                filters={state.filters}
                onApplyFilters={setFilters}
              />
            )}

            {/* Grid */}
            {result ? (
              <DataGrid
                result={result}
                pageOffset={state.page * state.pageSize}
                orderBy={state.orderBy}
                onToggleSort={toggleSort}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
                canEdit={editMode && canEdit}
                pendingChanges={pending.changes}
                insertedRows={pending.insertedRows}
                getRowKey={pending.getRowKey}
                onCellSave={(row, col, val) => pending.updateCell(row, col, val)}
                onRowContextMenu={handleContextMenu}
                columnMeta={selectedTableMeta?.columns}
                connectionId={connectionId}
                dbType={dbType}
                onFkLookup={(row, col) => {
                  if (!selectedTableMeta) return;
                  const config = resolveFkLookupConfig(selectedTableMeta, col);
                  if (!config) return;
                  setFkLookup({
                    row,
                    column: col,
                    refTable: config.refTable,
                    refColumns: config.refColumns,
                    sourceColumns: config.sourceColumns,
                    activeRefColumn: config.activeRefColumn,
                  });
                }}
                timezone={timezone}
                dateDisplayMode={dateDisplayMode}
              />
            ) : isLoading ? (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                <span className="text-sm">Loading...</span>
              </div>
            ) : null}

            {/* Table Constraints Panel */}
            {selectedTableMeta && (
              <TableConstraintsPanel
                constraints={selectedTableMeta.constraints}
                open={constraintsOpen}
                onToggle={() => setConstraintsOpen((v) => !v)}
                onEditConstraint={setConstraintEditMode}
              />
            )}

            {/* Pending Changes Panel */}
            <PendingChangesPanel
              changeCount={pending.changeCount}
              sqlStatements={pending.generateSql()}
              isApplying={isApplying}
              onApply={handleApply}
              onDiscard={pending.discard}
            />

            {/* Footer */}
            {result && (
              <DataFooter
                rowCount={result.rowCount}
                executionTimeMs={result.executionTimeMs}
                page={state.page}
                pageSize={state.pageSize}
                isLoading={isLoading}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}

            {/* Context Menu */}
            {contextMenu && (
              <RowContextMenu
                position={contextMenu.position}
                canEdit={canEdit}
                onClose={() => setContextMenu(null)}
                onCopyCell={handleCopyCell}
                onCopyRowJson={handleCopyRowJson}
                onInsertAbove={canEdit ? pending.insertRow : undefined}
                onInsertBelow={canEdit ? pending.insertRow : undefined}
                onDuplicateRow={canEdit ? pending.insertRow : undefined}
                onDeleteRow={
                  canEdit
                    ? () => pending.deleteRow(contextMenu.row)
                    : undefined
                }
              />
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <p className="text-sm">
              {realTables.length > 0
                ? 'Select a table to browse data'
                : connectionId
                  ? 'Sync schema first (Diagram tab)'
                  : 'Connect to a database first'}
            </p>
          </div>
        )}
      </div>

      {/* Constraint Editor Modal */}
      {constraintEditMode && selectedTableMeta && (
        <ConstraintEditorModal
          open
          mode={constraintEditMode}
          tableName={state.tableName}
          dbType={dbType}
          tableColumns={selectedTableMeta.columns.map((c) => c.name)}
          allTables={realTables}
          onExecute={handleConstraintExecute}
          onValidate={handleConstraintValidate}
          onClose={() => setConstraintEditMode(null)}
        />
      )}

      {/* FK Lookup Modal (rendered at page level for clean stacking) */}
      {fkLookup && (
        <FkLookupModal
          open
          connectionId={connectionId}
          dbType={dbType}
          refTable={fkLookup.refTable}
          refColumns={fkLookup.refColumns}
          activeRefColumn={fkLookup.activeRefColumn}
          columnName={fkLookup.column}
          onSelect={(selectedRow) => {
            if (selectedRow === null) {
              for (const sourceColumn of fkLookup.sourceColumns) {
                pending.updateCell(fkLookup.row, sourceColumn, null);
              }
              return;
            }

            const updates = buildFkSelectionValues(
              {
                refTable: fkLookup.refTable,
                sourceColumns: fkLookup.sourceColumns,
                refColumns: fkLookup.refColumns,
                activeSourceColumn: fkLookup.column,
                activeRefColumn: fkLookup.activeRefColumn,
              },
              selectedRow,
            );
            for (const [sourceColumn, value] of Object.entries(updates)) {
              pending.updateCell(fkLookup.row, sourceColumn, value);
            }
          }}
          onClose={() => setFkLookup(null)}
        />
      )}
    </div>
  );
}
