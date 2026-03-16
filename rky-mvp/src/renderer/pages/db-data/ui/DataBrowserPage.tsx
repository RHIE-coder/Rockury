import { useState, useCallback, useEffect } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
import { useConnections } from '@/features/db-connection';
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
  RowContextMenu,
  useDataQuery,
  usePendingChanges,
  toCsv,
  toJson,
  toSqlInsert,
} from '@/features/data-browser';
import type { TDbType } from '~/shared/types/db';

type TRow = Record<string, unknown>;

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

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Find selected table metadata
  const selectedTableMeta = realTables.find((t) => t.name === state.tableName);
  const pkConstraint = selectedTableMeta?.constraints.find((c) => c.type === 'PK');
  const hasPk = !!pkConstraint;
  const pkColumns = pkConstraint?.columns ?? [];
  const allColumns = result?.columns ?? [];

  // Pending changes
  const pending = usePendingChanges(state.tableName, dbType, pkColumns, allColumns);
  const [isApplying, setIsApplying] = useState(false);

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
      setColumnVisibility({});
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
    const failures: string[] = [];

    for (const sql of statements) {
      try {
        const res = await queryApi.execute({ connectionId, sql });
        if (res.success) {
          successCount++;
        } else {
          failures.push(sql);
        }
      } catch {
        failures.push(sql);
      }
    }

    setIsApplying(false);

    if (failures.length > 0) {
      window.alert(
        `${successCount} succeeded, ${failures.length} failed.\n\nFailed:\n${failures.join('\n')}`,
      );
    }

    pending.discard();
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
              canEdit={canEdit}
              hasChanges={pending.hasChanges}
              changeCount={pending.changeCount}
              onAddRow={pending.insertRow}
              onApply={handleApply}
              onDiscard={pending.discard}
              exportSlot={result && <ExportMenu onExport={handleExport} />}
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
                canEdit={canEdit}
                pendingChanges={pending.changes}
                insertedRows={pending.insertedRows}
                getRowKey={pending.getRowKey}
                onCellSave={(row, col, val) => pending.updateCell(row, col, val)}
                onRowContextMenu={handleContextMenu}
                columnMeta={selectedTableMeta?.columns}
                connectionId={connectionId}
                dbType={dbType}
              />
            ) : isLoading ? (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                <span className="text-sm">Loading...</span>
              </div>
            ) : null}

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
    </div>
  );
}
