import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  RefreshCw, ArrowDownToLine, Code,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import type { ITable, IDiagram, IDiagramLayout, ISearchResult } from '~/shared/types/db';
import { useConnections, useAutoTestConnections } from '@/features/db-connection';
import { useConnectionStore } from '@/features/db-connection/model/connectionStore';
import { useDiagramStore, useCreateDiagram, useDiagramLayout, useSaveDiagramLayout, useCreateDiagramVersion } from '@/features/virtual-diagram';
import { DiagramCanvas } from '@/features/virtual-diagram/ui/DiagramCanvas';
import { CanvasToolbar } from '@/features/virtual-diagram/ui/CanvasToolbar';
import { TableListPanel } from '@/features/virtual-diagram/ui/TableListPanel';
import { TableDetailPanel } from '@/features/virtual-diagram/ui/TableDetailPanel';
import { SearchOverlay } from '@/features/virtual-diagram/ui/SearchOverlay';
import { FilterPanel } from '@/features/virtual-diagram/ui/FilterPanel';
import { ExportMenu } from '@/features/virtual-diagram/ui/ExportMenu';
import { CascadeInfoPanel } from '@/features/virtual-diagram/ui/CascadeInfoPanel';
import { NodeContextMenu } from '@/features/virtual-diagram/ui/NodeContextMenu';
import { DdlEditorView } from '@/features/ddl-editor';
import { realDiagramApi } from '../api/realDiagramApi';
import { schemaToNodes } from '@/features/virtual-diagram/lib/schemaToNodes';
import { applyDagreLayout } from '@/features/virtual-diagram/lib/autoLayout';
import { simulateCascade, getReferencedColumns } from '@/features/virtual-diagram/lib/cascadeTraversal';
import type { TSimulationType } from '@/features/virtual-diagram/lib/cascadeTraversal';

import { sanitizeImportedTables } from '../lib/sanitizeImportedTables';

export function RealDiagramView() {
  const { data: connections } = useConnections();
  const {
    filter,
    setFilter,
    setFilterPreset,
    isLeftPanelOpen,
    isRightPanelOpen,
    viewMode,
    setViewMode,
    realTables: tables,
    setRealTables: setTables,
    realDiagramId,
    setRealDiagramId,
    realSelectedTableId: selectedTableId,
    setRealSelectedTableId: setSelectedTableId,
    hiddenTableIds,
    toggleTableVisibility,
    showAllTables: handleShowAll,
    tableColors,
    setTableColor,
    lockedNodeIds,
    toggleNodeLock,
    cascadeSimulation,
    setCascadeSimulation,
    clearCascadeSimulation,
    // Position undo/redo
    realPositionUndoStack,
    realPositionRedoStack,
    realPendingPositionRestore,
    pushRealPositionUndo,
    realPositionUndo,
    realPositionRedo,
    clearRealPendingPositionRestore,
  } = useDiagramStore();

  const { selectedConnectionId: globalConnectionId } = useConnectionStore();
  useAutoTestConnections();

  const selectedConnectionId = globalConnectionId ?? '';

  // Ephemeral UI state
  const [fitViewTrigger, setFitViewTrigger] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ISearchResult[]>([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ position: { x: number; y: number }; tableId: string; tableName: string } | null>(null);
  const createDiagram = useCreateDiagram();
  const createVersion = useCreateDiagramVersion();

  const { data: layout } = useDiagramLayout(realDiagramId ?? '');
  const saveLayout = useSaveDiagramLayout();
  const latestLayoutRef = useRef<Pick<IDiagramLayout, 'positions' | 'zoom' | 'viewport'> | null>(null);

  // Layout cache for instant restore on tab switch (bypasses React Query fetch delay)
  const storeState = useDiagramStore.getState();
  const cachedViewport = realDiagramId
    ? storeState.cachedViewports[realDiagramId] ?? null
    : null;
  const cachedPositions = realDiagramId
    ? storeState.cachedPositions[realDiagramId] ?? null
    : null;

  // Merge: prefer React Query layout, fallback to Zustand cache
  const effectiveLayout = layout ?? (cachedPositions ? {
    diagramId: realDiagramId ?? '',
    positions: cachedPositions,
    zoom: cachedViewport?.zoom ?? 1,
    viewport: cachedViewport ? { x: cachedViewport.x, y: cachedViewport.y } : { x: 0, y: 0 },
  } : undefined);

  const handleViewportChange = useCallback(
    (viewport: { x: number; y: number; zoom: number }) => {
      if (realDiagramId) {
        useDiagramStore.getState().setCachedViewport(realDiagramId, viewport);
      }
    },
    [realDiagramId],
  );

  // --- Sync ---
  const syncSchema = useMutation({
    mutationFn: (connectionId: string) => realDiagramApi.syncReal(connectionId),
    onSuccess: (result) => {
      if (result.success) {
        const newTables = sanitizeImportedTables(result.data.diagram.tables);
        const newDiagramId = result.data.diagram.id;

        const { nodes, edges } = schemaToNodes(newTables, { filter, hiddenTableIds });
        const layoutedNodes = applyDagreLayout(nodes, edges, { tables: newTables });
        const newPositions: Record<string, { x: number; y: number }> = {};
        for (const node of layoutedNodes) {
          newPositions[node.id] = node.position;
        }

        // Cache positions immediately for tab-switch restore
        useDiagramStore.getState().setCachedPositions(newDiagramId, newPositions);

        saveLayout.mutate({
          diagramId: newDiagramId,
          positions: newPositions,
          zoom: 1,
          viewport: { x: 0, y: 0 },
          hiddenTableIds,
          tableColors,
        });

        setTables(newTables);
        setRealDiagramId(newDiagramId);
        setSelectedTableId(null);
        clearCascadeSimulation();
        setTimeout(() => setFitViewTrigger((v) => v + 1), 100);
      }
    },
  });

  // Auto-load saved diagram when connection selected
  useEffect(() => {
    if (!selectedConnectionId) {
      setTables([]);
      setRealDiagramId(null);
      setSelectedTableId(null);
      latestLayoutRef.current = null;
      return;
    }
    realDiagramApi.fetchReal(selectedConnectionId).then((result) => {
      if (result.success && result.data && result.data.tables?.length > 0) {
        setTables(sanitizeImportedTables(result.data.tables));
        setRealDiagramId(result.data.id);
      } else {
        setTables([]);
        setRealDiagramId(null);
      }
      setSelectedTableId(null);
      latestLayoutRef.current = null;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConnectionId]);

  function handleFetch() {
    if (!selectedConnectionId) return;
    syncSchema.mutate(selectedConnectionId);
  }

  // --- Keyboard shortcuts (same as Studio) ---
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;

      // Undo/Redo: Ctrl+Z / Ctrl+Shift+Z
      if (isMod && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          realPositionRedo();
        } else {
          realPositionUndo();
        }
        return;
      }

      // Search: Ctrl+F
      if (isMod && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        if (cascadeSimulation) { clearCascadeSimulation(); return; }
        if (isSearchOpen) { setIsSearchOpen(false); setSearchQuery(''); setSearchResults([]); return; }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cascadeSimulation, clearCascadeSimulation, isSearchOpen, realPositionUndo, realPositionRedo]);

  // --- Table selection ---
  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;
  const highlightedTableIds = useMemo(
    () => searchResults.filter((r) => r.type === 'table').map((r) => r.tableId),
    [searchResults],
  );

  const handleTableSelect = useCallback((tableId: string) => {
    if (viewMode === 'ddl') {
      useDiagramStore.setState({ realSelectedTableId: tableId || null });
      return;
    }
    setSelectedTableId(tableId || null);
    if (!tableId && cascadeSimulation) {
      clearCascadeSimulation();
    }
  }, [viewMode, setSelectedTableId, cascadeSimulation, clearCascadeSimulation]);

  function handleSearchSelect(result: ISearchResult) {
    setSelectedTableId(result.tableId);
    setIsSearchOpen(false);
  }

  // --- Node Drag Start (push positions to undo stack) ---
  const handleNodeDragStart = useCallback(
    (positions: Record<string, { x: number; y: number }>) => {
      pushRealPositionUndo(positions);
    },
    [pushRealPositionUndo],
  );

  // --- Apply pending position restore (from undo/redo) ---
  useEffect(() => {
    if (!realPendingPositionRestore || !realDiagramId) return;
    const restoredPositions = realPendingPositionRestore;
    clearRealPendingPositionRestore();

    // Cache and save the restored positions
    useDiagramStore.getState().setCachedPositions(realDiagramId, restoredPositions);
    saveLayout.mutate({
      diagramId: realDiagramId,
      positions: restoredPositions,
      zoom: cachedViewport?.zoom ?? 1,
      viewport: cachedViewport ? { x: cachedViewport.x, y: cachedViewport.y } : { x: 0, y: 0 },
      hiddenTableIds,
      tableColors,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realPendingPositionRestore]);

  // --- Layout ---
  const handleLayoutChange = useCallback(
    (layoutUpdate: Pick<IDiagramLayout, 'positions' | 'zoom' | 'viewport'>) => {
      if (!realDiagramId) return;
      latestLayoutRef.current = layoutUpdate;
      // Cache positions in Zustand for instant restore on tab switch
      if (layoutUpdate.positions) {
        useDiagramStore.getState().setCachedPositions(realDiagramId, layoutUpdate.positions);
      }
      saveLayout.mutate({
        diagramId: realDiagramId,
        ...layoutUpdate,
        hiddenTableIds,
        tableColors,
      });
    },
    [realDiagramId, saveLayout, hiddenTableIds, tableColors],
  );

  // --- Auto Layout ---
  function handleAutoLayout() {
    if (tables.length === 0) return;
    // Push current positions to undo stack before auto-layout
    const currentPositions = realDiagramId
      ? useDiagramStore.getState().cachedPositions[realDiagramId]
      : null;
    if (currentPositions) pushRealPositionUndo(currentPositions);
    const { nodes, edges } = schemaToNodes(tables, { filter, hiddenTableIds });
    const layoutedNodes = applyDagreLayout(nodes, edges, { tables });
    const positions: Record<string, { x: number; y: number }> = {};
    for (const node of layoutedNodes) {
      positions[node.id] = node.position;
    }
    if (realDiagramId) {
      useDiagramStore.getState().setCachedPositions(realDiagramId, positions);
      saveLayout.mutate({
        diagramId: realDiagramId,
        positions,
        zoom: 1,
        viewport: { x: 0, y: 0 },
        hiddenTableIds,
        tableColors,
      });
    }
    setTimeout(() => setFitViewTrigger((v) => v + 1), 100);
  }

  // --- Table Color ---
  function handleTableColorChange(color: string | null) {
    if (!selectedTableId) return;
    setTableColor(selectedTableId, color);
    const currentLayout = effectiveLayout ?? layout;
    if (realDiagramId && currentLayout) {
      const newColors = { ...useDiagramStore.getState().tableColors };
      if (color) { newColors[selectedTableId] = color; }
      else { delete newColors[selectedTableId]; }
      saveLayout.mutate({
        diagramId: realDiagramId,
        positions: currentLayout.positions,
        zoom: currentLayout.zoom,
        viewport: currentLayout.viewport,
        hiddenTableIds,
        tableColors: newColors,
      });
    }
  }

  // --- Table Visibility ---
  function handleToggleVisibility(tableId: string) {
    toggleTableVisibility(tableId);
    const currentLayout = effectiveLayout ?? layout;
    if (realDiagramId && currentLayout) {
      const currentHidden = useDiagramStore.getState().hiddenTableIds;
      const newHidden = currentHidden.includes(tableId)
        ? currentHidden.filter((id) => id !== tableId)
        : [...currentHidden, tableId];
      saveLayout.mutate({
        diagramId: realDiagramId,
        positions: currentLayout.positions,
        zoom: currentLayout.zoom,
        viewport: currentLayout.viewport,
        hiddenTableIds: newHidden,
        tableColors,
      });
    }
  }

  // --- Cascade Simulation ---
  function handleNodeContextMenu(event: React.MouseEvent, tableId: string, tableName: string) {
    setContextMenu({ position: { x: event.clientX, y: event.clientY }, tableId, tableName });
  }

  function handleSimulate(tableId: string, type: TSimulationType, columnName?: string) {
    const result = simulateCascade(tables, tableId, type, columnName);
    setCascadeSimulation(result);
  }

  // --- Import as Virtual ---
  function handleImportAsVirtual() {
    if (tables.length === 0) return;
    const importTables = sanitizeImportedTables(tables);
    if (importTables.length === 0) return;
    const connName = connections?.find((c) => c.id === selectedConnectionId)?.name ?? 'Imported';
    createDiagram.mutate(
      { name: `${connName} (imported)`, type: 'virtual', version: '0.0.0', tables: importTables },
      {
        onSuccess: (result) => {
          if (result.success) {
            const newDiagram = result.data;
            createVersion.mutate({
              diagramId: newDiagram.id,
              name: 'v0.0.0',
              ddlContent: '',
              schemaSnapshot: { ...newDiagram, tables: importTables },
            });
            useDiagramStore.getState().setActiveTab('virtual');
            useDiagramStore.getState().setSelectedDiagramId(newDiagram.id);
          }
        },
      },
    );
  }

  // Build IDiagram for the canvas
  const realDiagram: IDiagram | null = tables.length > 0
    ? {
        id: realDiagramId ?? `real-${selectedConnectionId}`,
        name: 'Real Schema',
        version: '0.0.0',
        type: 'real',
        tables,
        createdAt: '',
        updatedAt: '',
      }
    : null;

  return (
    <div className="flex h-full w-full flex-col">
      {/* Top Toolbar — Console-specific controls only (mirrors DiagramToolbar position) */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        {/* Sync */}
        <Button
          variant="outline"
          size="xs"
          onClick={handleFetch}
          disabled={!selectedConnectionId || syncSchema.isPending}
        >
          <RefreshCw className={`size-3.5 ${syncSchema.isPending ? 'animate-spin' : ''}`} />
          {syncSchema.isPending ? 'Syncing...' : 'Sync'}
        </Button>

        {realDiagram && (
          <>
            {/* Import as Virtual */}
            <Button
              variant="outline"
              size="xs"
              onClick={handleImportAsVirtual}
              disabled={createDiagram.isPending}
              title="Import as Virtual Diagram"
            >
              <ArrowDownToLine className="size-3.5" />
              {createDiagram.isPending ? 'Importing...' : 'Import as Virtual'}
            </Button>

          </>
        )}

        <div className="flex-1" />

        {realDiagram && (
          <span className="text-xs text-muted-foreground">
            {tables.length} tables
            {hiddenTableIds.length > 0 && (
              <span className="ml-1 text-muted-foreground/60">({hiddenTableIds.length} hidden)</span>
            )}
          </span>
        )}

        {/* DDL Toggle — same position as Studio (right side of toolbar) */}
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'ddl' ? 'secondary' : 'ghost'}
            size="xs"
            onClick={() => setViewMode(viewMode === 'ddl' ? 'canvas' : 'ddl')}
            title={viewMode === 'ddl' ? 'Switch to Canvas' : 'Switch to DDL'}
          >
            <Code className="size-3.5" />
            {viewMode === 'ddl' ? 'Canvas' : 'DDL'}
          </Button>
        </div>
      </div>

      {/* 3-Panel Layout (identical structure to VirtualDiagramView) */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left Panel: Table List */}
        {isLeftPanelOpen && realDiagram && (
          <TableListPanel
            tables={tables}
            selectedTableId={selectedTableId}
            searchResults={searchResults}
            onTableSelect={handleTableSelect}
            onClose={() => {}}
            hiddenTableIds={hiddenTableIds}
            onToggleVisibility={handleToggleVisibility}
            onShowAll={handleShowAll}
          />
        )}

        {/* Center: Canvas or DDL */}
        <div className="relative w-0 min-w-0 flex-1">
          {/* Canvas Floating Toolbar (same as Studio CanvasToolbar) */}
          {viewMode === 'canvas' && realDiagram && (
            <CanvasToolbar
              onUndo={realPositionUndo}
              onRedo={realPositionRedo}
              canUndo={realPositionUndoStack.length > 0}
              canRedo={realPositionRedoStack.length > 0}
              onAutoLayout={handleAutoLayout}
              onToggleSearch={() => setIsSearchOpen((v) => !v)}
              isSearchOpen={isSearchOpen}
              onToggleFilter={() => setIsFilterPanelOpen((v) => !v)}
              isFilterOpen={isFilterPanelOpen}
              onToggleExport={() => setIsExportOpen((v) => !v)}
              isExportOpen={isExportOpen}
            />
          )}

          {/* Filter Panel (floating, same position as Studio) */}
          {isFilterPanelOpen && (
            <div className="absolute right-2 top-12 z-50">
              <FilterPanel
                filter={filter}
                onFilterChange={setFilter}
                onPresetChange={setFilterPreset}
                onClose={() => setIsFilterPanelOpen(false)}
              />
            </div>
          )}

          {/* Export Menu (floating, same position as Studio) */}
          {isExportOpen && (
            <div className="absolute right-2 top-12 z-50">
              <ExportMenu
                tables={tables}
                onClose={() => setIsExportOpen(false)}
              />
            </div>
          )}

          {/* Search Overlay */}
          {isSearchOpen && realDiagram && (
            <SearchOverlay
              tables={tables}
              query={searchQuery}
              onQueryChange={setSearchQuery}
              onResults={setSearchResults}
              onSelect={handleSearchSelect}
              onClose={() => { setIsSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}
              results={searchResults}
            />
          )}

          {/* Canvas: always mounted when diagram exists, hidden via CSS (same as Studio) */}
          <div className={viewMode === 'canvas' ? 'h-full w-full' : 'hidden'}>
            {realDiagram ? (
              <DiagramCanvas
                diagram={realDiagram}
                layout={effectiveLayout}
                filter={filter}
                highlightedTableIds={highlightedTableIds}
                selectedTableId={viewMode === 'canvas' ? selectedTableId : null}
                onTableSelect={handleTableSelect}
                onLayoutChange={handleLayoutChange}
                hiddenTableIds={hiddenTableIds}
                tableColors={tableColors}
                lockedNodeIds={lockedNodeIds}
                onNodeLockToggle={toggleNodeLock}
                onNodeDragStart={handleNodeDragStart}
                onNodeContextMenu={handleNodeContextMenu}
                cascadeSimulation={cascadeSimulation}
                fitViewTrigger={fitViewTrigger}
                cachedViewport={cachedViewport}
                onViewportChange={handleViewportChange}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  {syncSchema.isError
                    ? 'Failed to fetch schema. Please check your connection.'
                    : 'Select a connection and click "Sync" to view the real database structure.'}
                </p>
              </div>
            )}
          </div>

          {/* DDL Editor (rendered only when active, same as Studio) */}
          {viewMode === 'ddl' && realDiagram && (
            <DdlEditorView
              tables={hiddenTableIds.length > 0
                ? tables.filter((t) => !hiddenTableIds.includes(t.id))
                : tables}
              readOnly
              initialDbType={selectedConnection?.dbType ?? 'mysql'}
              focusTableName={selectedTableId ? tables.find((t) => t.id === selectedTableId)?.name ?? null : null}
            />
          )}

          {/* Cascade Info Panel (floating, same as Studio) */}
          {cascadeSimulation && (
            <CascadeInfoPanel
              simulation={cascadeSimulation}
              onClose={clearCascadeSimulation}
            />
          )}
        </div>

        {/* Right Panel: Table Detail (hidden in DDL mode, same as Studio) */}
        {viewMode !== 'ddl' && isRightPanelOpen && selectedTable && realDiagram && (
          <TableDetailPanel
            table={selectedTable}
            allTables={tables}
            onChange={() => {}}
            onDelete={() => {}}
            onClose={() => setSelectedTableId(null)}
            color={selectedTableId ? tableColors[selectedTableId] : undefined}
            onColorChange={handleTableColorChange}
            readOnly
          />
        )}

      </div>

      {/* Node Context Menu (floating, same as Studio) */}
      {contextMenu && (
        <NodeContextMenu
          position={contextMenu.position}
          tableName={contextMenu.tableName}
          referencedColumns={getReferencedColumns(tables, contextMenu.tableId)}
          onSimulate={(type, columnName) => handleSimulate(contextMenu.tableId, type, columnName)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
