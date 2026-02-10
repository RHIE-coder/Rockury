import { useCallback, useEffect, useState } from 'react';
import type { ITable, IDiagramLayout, ISearchResult, IViewSnapshot } from '~/shared/types/db';
import { useDiagrams, useDiagram, useUpdateDiagram, useCreateDiagram, useDeleteDiagram, useCloneDiagram, useDiagramLayout, useSaveDiagramLayout } from '../model/useDiagrams';
import { useDiagramStore } from '../model/diagramStore';
import { schemaToNodes } from '../lib/schemaToNodes';
import { applyDagreLayout } from '../lib/autoLayout';
import { DiagramCanvas } from './DiagramCanvas';
import { DiagramToolbar } from './DiagramToolbar';
import { TableListPanel } from './TableListPanel';
import { TableDetailPanel } from './TableDetailPanel';
import { SearchOverlay } from './SearchOverlay';
import { FilterPanel } from './FilterPanel';
import { ViewSnapshotManager } from './ViewSnapshotManager';
import { DiagramListPanel } from './DiagramListPanel';
import { ForwardEngineerPanel } from './ForwardEngineerPanel';
import { DdlEditorView } from '@/features/ddl-editor';

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
    viewMode,
    setChangeSource,
    hiddenTableIds,
    setHiddenTableIds,
    toggleTableVisibility,
    showAllTables,
    tableColors,
    setTableColor,
    setTableColors,
    rightPanelMode,
    setRightPanelMode,
    compareTargetDiagramId,
    setCompareTargetDiagramId,
  } = useDiagramStore();

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isSnapshotPanelOpen, setIsSnapshotPanelOpen] = useState(false);
  const [isDiagramListOpen, setIsDiagramListOpen] = useState(false);
  const [isForwardEngineerOpen, setIsForwardEngineerOpen] = useState(false);
  const { data: diagram } = useDiagram(selectedDiagramId ?? '');
  const { data: allDiagrams } = useDiagrams('virtual');
  const { data: layout } = useDiagramLayout(selectedDiagramId ?? '');
  const { data: compareTargetDiagram } = useDiagram(compareTargetDiagramId ?? '');
  const updateDiagram = useUpdateDiagram();
  const createDiagram = useCreateDiagram();
  const deleteDiagram = useDeleteDiagram();
  const cloneDiagram = useCloneDiagram();
  const saveLayout = useSaveDiagramLayout();

  const selectedTable = diagram?.tables.find((t) => t.id === selectedTableId) ?? null;

  // Sync hiddenTableIds/tableColors from layout on load
  useEffect(() => {
    if (layout) {
      if (layout.hiddenTableIds) setHiddenTableIds(layout.hiddenTableIds);
      if (layout.tableColors) setTableColors(layout.tableColors);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout?.diagramId]);

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

  function handleCloneDiagram() {
    if (!diagram) return;
    cloneDiagram.mutate(
      { id: diagram.id },
      {
        onSuccess: (result) => {
          if (result.success) {
            setSelectedDiagramId(result.data.id);
          }
        },
      },
    );
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

  function handleAutoLayout() {
    if (!diagram) return;
    const { nodes, edges } = schemaToNodes(diagram.tables, { filter });
    const layoutedNodes = applyDagreLayout(nodes, edges);
    const positions: Record<string, { x: number; y: number }> = {};
    for (const node of layoutedNodes) {
      positions[node.id] = { x: node.position.x, y: node.position.y };
    }
    if (selectedDiagramId) {
      saveLayout.mutate({
        diagramId: selectedDiagramId,
        positions,
        zoom: 1,
        viewport: { x: 0, y: 0 },
      });
    }
  }

  const handleLayoutChange = useCallback(
    (layoutUpdate: Pick<IDiagramLayout, 'positions' | 'zoom' | 'viewport'>) => {
      if (!selectedDiagramId) return;
      saveLayout.mutate({
        diagramId: selectedDiagramId,
        ...layoutUpdate,
        hiddenTableIds: useDiagramStore.getState().hiddenTableIds,
        tableColors: useDiagramStore.getState().tableColors,
      });
    },
    [selectedDiagramId, saveLayout],
  );

  function handleToggleVisibility(tableId: string) {
    toggleTableVisibility(tableId);
    // Save to layout after toggle
    if (selectedDiagramId && layout) {
      const currentHidden = useDiagramStore.getState().hiddenTableIds;
      const newHidden = currentHidden.includes(tableId)
        ? currentHidden.filter((id) => id !== tableId)
        : [...currentHidden, tableId];
      saveLayout.mutate({
        diagramId: selectedDiagramId,
        positions: layout.positions,
        zoom: layout.zoom,
        viewport: layout.viewport,
        hiddenTableIds: newHidden,
        tableColors,
      });
    }
  }

  function handleShowAll() {
    showAllTables();
    if (selectedDiagramId && layout) {
      saveLayout.mutate({
        diagramId: selectedDiagramId,
        positions: layout.positions,
        zoom: layout.zoom,
        viewport: layout.viewport,
        hiddenTableIds: [],
        tableColors,
      });
    }
  }

  function handleTableColorChange(color: string | null) {
    if (!selectedTableId) return;
    setTableColor(selectedTableId, color);
    if (selectedDiagramId && layout) {
      const newColors = { ...useDiagramStore.getState().tableColors };
      if (color) {
        newColors[selectedTableId] = color;
      } else {
        delete newColors[selectedTableId];
      }
      saveLayout.mutate({
        diagramId: selectedDiagramId,
        positions: layout.positions,
        zoom: layout.zoom,
        viewport: layout.viewport,
        hiddenTableIds,
        tableColors: newColors,
      });
    }
  }

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
        onAutoLayout={handleAutoLayout}
        onCloneDiagram={handleCloneDiagram}
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
            hiddenTableIds={hiddenTableIds}
            onToggleVisibility={handleToggleVisibility}
            onShowAll={handleShowAll}
          />
        )}

        {/* Center: Canvas or DDL */}
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
          {viewMode === 'ddl' && diagram ? (
            <DdlEditorView
              tables={diagram.tables}
              onParsed={(tables) => {
                setChangeSource('ddl');
                updateDiagram.mutate({ id: diagram.id, tables });
                setTimeout(() => setChangeSource(null), 100);
              }}
            />
          ) : diagram ? (
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
              hiddenTableIds={hiddenTableIds}
              tableColors={tableColors}
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
            color={selectedTableId ? tableColors[selectedTableId] : undefined}
            onColorChange={handleTableColorChange}
            rightPanelMode={rightPanelMode}
            onRightPanelModeChange={setRightPanelMode}
            compareDiagrams={allDiagrams?.filter((d) => d.id !== selectedDiagramId) ?? []}
            compareTargetDiagramId={compareTargetDiagramId}
            onCompareTargetChange={setCompareTargetDiagramId}
            currentDiagramName={diagram.name}
          />
        )}
      </div>
    </div>
  );
}
