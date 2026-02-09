import { useCallback, useEffect, useState } from 'react';
import type { ITable, IDiagramLayout, ISearchResult, IViewSnapshot } from '~/shared/types/db';
import { useDiagrams, useDiagram, useUpdateDiagram, useCreateDiagram, useDeleteDiagram, useDiagramLayout, useSaveDiagramLayout } from '../model/useDiagrams';
import { useDiagramStore } from '../model/diagramStore';
import { DiagramCanvas } from './DiagramCanvas';
import { DiagramToolbar } from './DiagramToolbar';
import { TableListPanel } from './TableListPanel';
import { TableDetailPanel } from './TableDetailPanel';
import { SearchOverlay } from './SearchOverlay';
import { FilterPanel } from './FilterPanel';
import { ViewSnapshotManager } from './ViewSnapshotManager';
import { DiagramListPanel } from './DiagramListPanel';
import { ForwardEngineerPanel } from './ForwardEngineerPanel';

function createEmptyTable(): ITable {
  return {
    id: `tbl-${Date.now()}`,
    name: 'new_table',
    comment: '',
    columns: [
      {
        id: `col-${Date.now()}-0`,
        name: 'id',
        dataType: 'BIGINT',
        keyType: 'PK',
        defaultValue: null,
        nullable: false,
        comment: 'Primary key',
        reference: null,
        constraints: [],
        ordinalPosition: 0,
      },
    ],
    constraints: [],
  };
}

export function VirtualDiagramView() {
  const { data: diagrams } = useDiagrams('virtual');
  const {
    selectedDiagramId,
    setSelectedDiagramId,
    selectedTableId,
    setSelectedTableId,
    isLeftPanelOpen,
    toggleLeftPanel,
    isRightPanelOpen,
    isSearchOpen,
    setSearchOpen,
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    filter,
    setFilter,
    setFilterPreset,
  } = useDiagramStore();

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isSnapshotPanelOpen, setIsSnapshotPanelOpen] = useState(false);
  const [isDiagramListOpen, setIsDiagramListOpen] = useState(false);
  const [isForwardEngineerOpen, setIsForwardEngineerOpen] = useState(false);
  const { data: diagram } = useDiagram(selectedDiagramId ?? '');
  const { data: layout } = useDiagramLayout(selectedDiagramId ?? '');
  const updateDiagram = useUpdateDiagram();
  const createDiagram = useCreateDiagram();
  const deleteDiagram = useDeleteDiagram();
  const saveLayout = useSaveDiagramLayout();

  const selectedTable = diagram?.tables.find((t) => t.id === selectedTableId) ?? null;

  // Cmd+F shortcut to open search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setSearchOpen]);

  const highlightedTableIds = searchResults
    .filter((r) => r.type === 'table')
    .map((r) => r.tableId);

  function handleDiagramSelect(id: string) {
    setSelectedDiagramId(id);
    setSelectedTableId(null);
    setIsDiagramListOpen(false);
  }

  function handleDiagramRename(id: string, name: string) {
    updateDiagram.mutate({ id, name });
  }

  function handleDiagramDelete(id: string) {
    deleteDiagram.mutate(id);
    if (selectedDiagramId === id) {
      setSelectedDiagramId(null);
      setSelectedTableId(null);
    }
  }

  function handleAddTable() {
    if (!diagram) return;
    const newTable = createEmptyTable();
    updateDiagram.mutate({
      id: diagram.id,
      tables: [...diagram.tables, newTable],
    });
  }

  function handleTableCreate(position: { x: number; y: number }) {
    if (!diagram) return;
    const newTable = createEmptyTable();
    updateDiagram.mutate({
      id: diagram.id,
      tables: [...diagram.tables, newTable],
    });
    // Position is used by DiagramCanvas layout; auto-layout handles new table placement
  }

  function handleEdgeCreate(sourceTableId: string, targetTableId: string) {
    if (!diagram) return;
    const sourceTable = diagram.tables.find((t) => t.id === sourceTableId);
    const targetTable = diagram.tables.find((t) => t.id === targetTableId);
    if (!sourceTable || !targetTable) return;

    // Create FK column on source table referencing target's PK
    const targetPk = targetTable.columns.find((c) => c.keyType === 'PK');
    if (!targetPk) return;

    const fkColumnName = `${targetTable.name}_${targetPk.name}`;
    const fkColumn = {
      id: `col-${Date.now()}-fk`,
      name: fkColumnName,
      dataType: targetPk.dataType,
      keyType: 'FK' as const,
      defaultValue: null,
      nullable: true,
      comment: `FK to ${targetTable.name}`,
      reference: { table: targetTable.name, column: targetPk.name },
      constraints: [],
      ordinalPosition: sourceTable.columns.length,
    };

    const updatedSource = {
      ...sourceTable,
      columns: [...sourceTable.columns, fkColumn],
    };
    const tables = diagram.tables.map((t) => (t.id === sourceTableId ? updatedSource : t));
    updateDiagram.mutate({ id: diagram.id, tables });
  }

  function handleCreateDiagram() {
    createDiagram.mutate(
      { name: `Diagram ${Date.now()}`, type: 'virtual', tables: [] },
      {
        onSuccess: (result) => {
          if (result.success) {
            setSelectedDiagramId(result.data.id);
          }
        },
      },
    );
  }

  function handleDiagramNameChange(name: string) {
    if (!diagram) return;
    updateDiagram.mutate({ id: diagram.id, name });
  }

  function handleDiagramVersionChange(version: string) {
    if (!diagram) return;
    updateDiagram.mutate({ id: diagram.id, version });
  }

  function handleSnapshotRestore(snapshot: IViewSnapshot) {
    setFilter(snapshot.filter);
    if (selectedDiagramId) {
      saveLayout.mutate({
        diagramId: selectedDiagramId,
        ...snapshot.layout,
      });
    }
    setIsSnapshotPanelOpen(false);
  }

  function handleSearchSelect(result: ISearchResult) {
    setSelectedTableId(result.tableId);
    setSearchOpen(false);
  }

  function handleTableSelect(tableId: string) {
    setSelectedTableId(tableId || null);
  }

  function handleTableChange(updated: ITable) {
    if (!diagram) return;
    const tables = diagram.tables.map((t) => (t.id === updated.id ? updated : t));
    updateDiagram.mutate({ id: diagram.id, tables });
  }

  function handleTableDelete() {
    if (!diagram || !selectedTableId) return;
    const tables = diagram.tables.filter((t) => t.id !== selectedTableId);
    updateDiagram.mutate({ id: diagram.id, tables });
    setSelectedTableId(null);
  }

  const handleLayoutChange = useCallback(
    (layoutUpdate: Pick<IDiagramLayout, 'positions' | 'zoom' | 'viewport'>) => {
      if (!selectedDiagramId) return;
      saveLayout.mutate({
        diagramId: selectedDiagramId,
        ...layoutUpdate,
      });
    },
    [selectedDiagramId, saveLayout],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <DiagramToolbar
        diagrams={diagrams}
        currentDiagram={diagram}
        onDiagramSelect={handleDiagramSelect}
        onDiagramCreate={handleCreateDiagram}
        onDiagramNameChange={handleDiagramNameChange}
        onDiagramVersionChange={handleDiagramVersionChange}
        onAddTable={handleAddTable}
        isFilterPanelOpen={isFilterPanelOpen}
        onToggleFilterPanel={() => setIsFilterPanelOpen((v) => !v)}
        isSnapshotPanelOpen={isSnapshotPanelOpen}
        onToggleSnapshotPanel={() => setIsSnapshotPanelOpen((v) => !v)}
        onToggleDiagramList={() => setIsDiagramListOpen((v) => !v)}
        isForwardEngineerOpen={isForwardEngineerOpen}
        onToggleForwardEngineer={() => setIsForwardEngineerOpen((v) => !v)}
      />

      {/* 3-Panel Layout */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Diagram List Panel (overlay) */}
        {isDiagramListOpen && (
          <DiagramListPanel
            diagrams={diagrams ?? []}
            selectedDiagramId={selectedDiagramId}
            onSelect={handleDiagramSelect}
            onCreate={handleCreateDiagram}
            onRename={handleDiagramRename}
            onDelete={handleDiagramDelete}
            onClose={() => setIsDiagramListOpen(false)}
          />
        )}

        {/* Left Panel: Table List */}
        {isLeftPanelOpen && diagram && (
          <TableListPanel
            tables={diagram.tables}
            selectedTableId={selectedTableId}
            searchResults={searchResults}
            onTableSelect={handleTableSelect}
            onClose={toggleLeftPanel}
          />
        )}

        {/* Center: Canvas */}
        <div className="relative flex-1">
          {/* Filter Panel (floating) */}
          {isFilterPanelOpen && (
            <div className="absolute right-2 top-2 z-50">
              <FilterPanel
                filter={filter}
                onFilterChange={setFilter}
                onPresetChange={setFilterPreset}
                onClose={() => setIsFilterPanelOpen(false)}
              />
            </div>
          )}

          {/* Snapshot Panel (floating) */}
          {isSnapshotPanelOpen && selectedDiagramId && (
            <div className="absolute right-2 top-2 z-50">
              <ViewSnapshotManager
                diagramId={selectedDiagramId}
                currentFilter={filter}
                currentLayout={layout ?? null}
                onRestore={handleSnapshotRestore}
                onClose={() => setIsSnapshotPanelOpen(false)}
              />
            </div>
          )}

          {/* Forward Engineer Panel (floating) */}
          {isForwardEngineerOpen && diagram && (
            <div className="absolute left-2 top-2 z-50">
              <ForwardEngineerPanel
                tables={diagram.tables}
                onClose={() => setIsForwardEngineerOpen(false)}
              />
            </div>
          )}

          {/* Search Overlay */}
          {isSearchOpen && diagram && (
            <SearchOverlay
              tables={diagram.tables}
              query={searchQuery}
              onQueryChange={setSearchQuery}
              onResults={setSearchResults}
              onSelect={handleSearchSelect}
              onClose={() => setSearchOpen(false)}
              results={searchResults}
            />
          )}
          {diagram ? (
            <DiagramCanvas
              diagram={diagram}
              layout={layout}
              filter={filter}
              highlightedTableIds={highlightedTableIds}
              selectedTableId={selectedTableId}
              onTableSelect={handleTableSelect}
              onTableCreate={handleTableCreate}
              onTableUpdate={handleTableChange}
              onEdgeCreate={handleEdgeCreate}
              onLayoutChange={handleLayoutChange}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted/30">
              <p className="text-sm text-muted-foreground">
                Select or create a diagram to get started.
              </p>
            </div>
          )}
        </div>

        {/* Right Panel: Table Detail */}
        {isRightPanelOpen && selectedTable && diagram && (
          <TableDetailPanel
            table={selectedTable}
            allTables={diagram.tables}
            onChange={handleTableChange}
            onDelete={handleTableDelete}
            onClose={() => setSelectedTableId(null)}
          />
        )}
      </div>
    </div>
  );
}
