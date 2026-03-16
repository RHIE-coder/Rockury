import { useState } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
import { useConnections } from '@/features/db-connection';
import { useConnectionStore } from '@/features/db-connection/model/connectionStore';
import { useDiagramStore } from '@/features/virtual-diagram';
import {
  DataTableListPanel,
  DataGrid,
  DataToolbar,
  DataFooter,
  FilterRow,
  ColumnVisibility,
  useDataQuery,
} from '@/features/data-browser';
import type { TDbType } from '~/shared/types/db';

export function DataBrowserPage() {
  const { data: connections } = useConnections();
  const { selectedConnectionId } = useConnectionStore();
  const { realTables } = useDiagramStore();

  const connectionId = selectedConnectionId ?? '';
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

  const selectedTableMeta = realTables.find((t) => t.name === state.tableName);
  const hasPk = selectedTableMeta?.constraints.some((c) => c.type === 'PK') ?? false;

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <DataTableListPanel
        tables={realTables}
        selectedTableName={state.tableName}
        onTableSelect={(name) => {
          setColumnVisibility({});
          selectTable(name);
        }}
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
              />
            ) : isLoading ? (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                <span className="text-sm">Loading...</span>
              </div>
            ) : null}

            {/* Footer */}
            {result && (
              <div className="flex items-center border-t border-border">
                <DataFooter
                  rowCount={result.rowCount}
                  executionTimeMs={result.executionTimeMs}
                  page={state.page}
                  pageSize={state.pageSize}
                  isLoading={isLoading}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
                <div className="ml-auto pr-2">
                  <ColumnVisibility
                    columns={result.columns}
                    visibility={columnVisibility}
                    onChange={setColumnVisibility}
                  />
                </div>
              </div>
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
