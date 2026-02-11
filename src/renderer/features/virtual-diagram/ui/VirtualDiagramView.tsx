import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ITable, IDiagramLayout, IDiagramVersion, ISearchResult, IViewSnapshot, TKeyType } from '~/shared/types/db';
import { useDiagrams, useDiagram, useUpdateDiagram, useCreateDiagram, useDeleteDiagram, useCloneDiagram, useDiagramLayout, useSaveDiagramLayout, useCreateDiagramVersion, useUpdateDiagramVersion, useDeleteDiagramVersion, useDiagramVersions, useReorderVersions, useReorderDiagrams } from '../model/useDiagrams';
import { useDiagramStore } from '../model/diagramStore';
import { schemaToNodes } from '../lib/schemaToNodes';
import { applyDagreLayout } from '../lib/autoLayout';
import { DiagramCanvas } from './DiagramCanvas';
import { DiagramToolbar } from './DiagramToolbar';
import { CanvasToolbar } from './CanvasToolbar';
import { TableListPanel } from './TableListPanel';
import { TableDetailPanel } from './TableDetailPanel';
import { SearchOverlay } from './SearchOverlay';
import { FilterPanel } from './FilterPanel';
import { ViewSnapshotManager } from './ViewSnapshotManager';
import { DiagramListPanel } from './DiagramListPanel';
import { DiagramFormModal } from './DiagramFormModal';
import { DdlEditorView } from '@/features/ddl-editor';
import { schemaToDdl } from '@/features/ddl-editor/lib/schemaToDdl';
import { ExportMenu } from './ExportMenu';
import { VersionFormModal } from './VersionFormModal';
import { useNavigationGuard } from '../hooks/useNavigationGuard';

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
        keyTypes: ['PK'],
        isAutoIncrement: true,
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
    compareTargetVersionId,
    setCompareTargetVersionId,
    leftPanelView,
    // Local buffer (manual save)
    localTables,
    isDirty,
    isLayoutDirty,
    setLocalTables,
    updateLocalTable,
    addLocalTable,
    deleteLocalTable,
    resetLocalTables,
    setLayoutDirty,
    // Lock
    isDiagramLocked,
    lockedNodeIds,
    toggleDiagramLock,
    toggleNodeLock,
    // Undo/Redo
    undoStack,
    redoStack,
    pushUndoState,
    undo,
    redo,
    clearHistory,
    pendingLayoutRestore,
    clearPendingLayoutRestore,
    // DDL filter
    ddlIncludedTableIds,
    setDdlIncludedTableIds,
  } = useDiagramStore();

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isSnapshotPanelOpen, setIsSnapshotPanelOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDescriptionVisible, setIsDescriptionVisible] = useState(false);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

  // Diagram form modal state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState<'create' | 'edit'>('create');
  const [formModalInitial, setFormModalInitial] = useState<{ name: string; description: string }>({ name: '', description: '' });
  const [formModalTargetId, setFormModalTargetId] = useState<string | null>(null);

  // Version form modal state
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [versionModalMode, setVersionModalMode] = useState<'create' | 'edit'>('create');
  const [versionModalInitialName, setVersionModalInitialName] = useState('');
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);

  const { data: diagram } = useDiagram(selectedDiagramId ?? '');
  const { data: diagramVersions } = useDiagramVersions(selectedDiagramId ?? '');
  // Removed: allDiagrams was used for diagram-based compare, now version-based
  const { data: layout } = useDiagramLayout(selectedDiagramId ?? '');
  // Version-based compare (no separate diagram fetch needed)
  const updateDiagram = useUpdateDiagram();
  const createDiagram = useCreateDiagram();
  const deleteDiagram = useDeleteDiagram();
  const cloneDiagram = useCloneDiagram();
  const saveLayout = useSaveDiagramLayout();
  const createVersion = useCreateDiagramVersion();
  const updateVersion = useUpdateDiagramVersion();
  const deleteVersion = useDeleteDiagramVersion();
  const reorderVersions = useReorderVersions();
  const reorderDiagrams = useReorderDiagrams();

  const activeVersion = diagramVersions?.find((v) => v.id === activeVersionId) ?? null;
  const selectedTable = localTables.find((t) => t.id === selectedTableId) ?? null;

  // Auto-load version when diagram first opens (NOT on version refetch after save)
  const prevDiagramIdRef = useRef<string | null>(null);
  const initialLoadDoneRef = useRef(false);
  useEffect(() => {
    if (!diagram) return;

    // Already loaded this diagram — skip re-loading on diagramVersions refetch
    if (diagram.id === prevDiagramIdRef.current && initialLoadDoneRef.current) return;

    // Different diagram or first load waiting for versions
    if (diagram.id !== prevDiagramIdRef.current) {
      prevDiagramIdRef.current = diagram.id;
      initialLoadDoneRef.current = false;
      clearHistory();
    }

    if (!diagramVersions) return; // wait for versions to load

    initialLoadDoneRef.current = true;

    // Pick first version (by sort_order), or fallback to diagram.tables
    const targetVer = diagramVersions[0] ?? null;

    if (targetVer?.schemaSnapshot?.tables) {
      setActiveVersionId(targetVer.id);
      resetLocalTables(targetVer.schemaSnapshot.tables);
      // Restore layout from version snapshot if available
      if (targetVer.schemaSnapshot.layout && selectedDiagramId) {
        const vLayout = targetVer.schemaSnapshot.layout;
        saveLayout.mutate({
          diagramId: selectedDiagramId,
          positions: vLayout.positions,
          zoom: vLayout.zoom,
          viewport: vLayout.viewport,
          hiddenTableIds: vLayout.hiddenTableIds,
          tableColors: vLayout.tableColors,
        });
        if (vLayout.hiddenTableIds) setHiddenTableIds(vLayout.hiddenTableIds);
        if (vLayout.tableColors) setTableColors(vLayout.tableColors);
      }
    } else {
      setActiveVersionId(null);
      resetLocalTables(diagram.tables);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram?.id, diagramVersions]);

  // Sync hiddenTableIds/tableColors from layout on load
  useEffect(() => {
    if (layout) {
      if (layout.hiddenTableIds) setHiddenTableIds(layout.hiddenTableIds);
      if (layout.tableColors) setTableColors(layout.tableColors);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout?.diagramId]);

  // --- Save handler ---
  function handleSave() {
    if (!diagram || (!isDirty && !isLayoutDirty)) return;

    if (activeVersionId && selectedDiagramId) {
      // Save to the active version with layout
      const ddl = schemaToDdl(localTables);
      const currentLayout = layout;
      const snapshot = {
        ...diagram,
        tables: localTables,
        layout: currentLayout ? {
          positions: currentLayout.positions,
          zoom: currentLayout.zoom,
          viewport: currentLayout.viewport,
          hiddenTableIds: useDiagramStore.getState().hiddenTableIds,
          tableColors: useDiagramStore.getState().tableColors,
        } : undefined,
      };
      updateVersion.mutate(
        { id: activeVersionId, diagramId: selectedDiagramId, ddlContent: ddl, schemaSnapshot: snapshot },
        {
          onSuccess: () => {
            resetLocalTables(localTables);
            // Sync diagram.tables for subtitle display in list panel
            updateDiagram.mutate({ id: diagram.id, tables: localTables });
          },
        },
      );
    } else {
      // No version selected - save to diagram directly (fallback)
      updateDiagram.mutate(
        { id: diagram.id, tables: localTables },
        { onSuccess: () => resetLocalTables(localTables) },
      );
    }
  }

  // --- Keyboard shortcuts ---
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (isMod && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      if (isMod && e.key === 'l') {
        e.preventDefault();
        toggleDiagramLock();
        return;
      }

      if (isMod && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, isLayoutDirty, localTables, diagram?.id]);

  // Navigation guard
  useNavigationGuard({ isDirty: isDirty || isLayoutDirty });

  // Apply pending layout restore from undo/redo
  useEffect(() => {
    if (pendingLayoutRestore && selectedDiagramId && layout) {
      saveLayout.mutate({
        diagramId: selectedDiagramId,
        positions: pendingLayoutRestore,
        zoom: layout.zoom,
        viewport: layout.viewport,
        hiddenTableIds,
        tableColors,
      });
      clearPendingLayoutRestore();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLayoutRestore]);

  function handleNodeDragStart(positions: Record<string, { x: number; y: number }>) {
    pushUndoState(localTables, positions);
    setLayoutDirty(true);
  }

  const highlightedTableIds = useMemo(
    () => searchResults.filter((r) => r.type === 'table').map((r) => r.tableId),
    [searchResults],
  );

  // --- Diagram CRUD ---
  function handleDiagramSelect(id: string) {
    if (id === selectedDiagramId) return; // Same diagram re-click: no-op
    if (isDirty || isLayoutDirty) {
      if (!window.confirm('You have unsaved changes. Discard and switch diagram?')) return;
    }
    setActiveVersionId(null);
    prevDiagramIdRef.current = null;
    initialLoadDoneRef.current = false;
    setSelectedDiagramId(id);
    setSelectedTableId(null);
  }

  function handleDiagramEdit(d: { id: string; name: string; description?: string }) {
    setFormModalMode('edit');
    setFormModalInitial({ name: d.name, description: d.description ?? '' });
    setFormModalTargetId(d.id);
    setFormModalOpen(true);
  }

  function handleDiagramDelete(id: string) {
    deleteDiagram.mutate(id);
    if (selectedDiagramId === id) {
      setSelectedDiagramId(null);
      setSelectedTableId(null);
    }
  }

  function openCreateDiagramModal() {
    setFormModalMode('create');
    setFormModalInitial({ name: '', description: '' });
    setFormModalTargetId(null);
    setFormModalOpen(true);
  }

  function openEditDiagramModal() {
    if (!diagram) return;
    setFormModalMode('edit');
    setFormModalInitial({ name: diagram.name, description: diagram.description ?? '' });
    setFormModalTargetId(diagram.id);
    setFormModalOpen(true);
  }

  function handleFormModalSubmit(values: { name: string; description: string }) {
    if (formModalMode === 'create') {
      createDiagram.mutate(
        { name: values.name, description: values.description, type: 'virtual', version: '0.0.0', tables: [] },
        {
          onSuccess: (result) => {
            if (result.success) {
              const newDiagram = result.data;
              // Auto-create initial version v0.0.0
              createVersion.mutate(
                {
                  diagramId: newDiagram.id,
                  name: 'v0.0.0',
                  ddlContent: '',
                  schemaSnapshot: { ...newDiagram, tables: [] },
                },
                {
                  onSuccess: (verResult) => {
                    if (verResult.success) {
                      setActiveVersionId(verResult.data.id);
                    }
                  },
                },
              );
              setSelectedDiagramId(newDiagram.id);
            }
          },
        },
      );
    } else if (formModalTargetId) {
      updateDiagram.mutate({ id: formModalTargetId, name: values.name, description: values.description });
    }
  }

  // --- Table CRUD ---
  function handleAddTable() {
    if (!diagram || isDiagramLocked) return;
    pushUndoState(localTables);
    const newTable = createEmptyTable();
    addLocalTable(newTable);
  }

  function handleTableCreate(position: { x: number; y: number }) {
    if (!diagram || isDiagramLocked) return;
    pushUndoState(localTables);
    const newTable = createEmptyTable();
    addLocalTable(newTable);
  }

  function handleEdgeCreate(sourceTableId: string, targetTableId: string) {
    if (!diagram || isDiagramLocked) return;
    const sourceTable = localTables.find((t) => t.id === sourceTableId);
    const targetTable = localTables.find((t) => t.id === targetTableId);
    if (!sourceTable || !targetTable) return;

    const targetPk = targetTable.columns.find((c) => c.keyTypes.includes('PK'));
    if (!targetPk) return;

    pushUndoState(localTables);

    const fkColumnName = `${targetTable.name}_${targetPk.name}`;
    const fkColumn = {
      id: `col-${Date.now()}-fk`,
      name: fkColumnName,
      dataType: targetPk.dataType,
      keyTypes: ['FK'] as TKeyType[],
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
    updateLocalTable(updatedSource);
  }

  // --- Version ---
  function handleVersionSelect(version: IDiagramVersion) {
    if (isDirty || isLayoutDirty) {
      if (!window.confirm('You have unsaved changes. Discard and switch version?')) return;
    }
    setActiveVersionId(version.id);
    if (version.schemaSnapshot?.tables) {
      resetLocalTables(version.schemaSnapshot.tables);
    }
    // Restore layout from version snapshot
    if (version.schemaSnapshot?.layout && selectedDiagramId) {
      const vLayout = version.schemaSnapshot.layout;
      saveLayout.mutate({
        diagramId: selectedDiagramId,
        positions: vLayout.positions,
        zoom: vLayout.zoom,
        viewport: vLayout.viewport,
        hiddenTableIds: vLayout.hiddenTableIds,
        tableColors: vLayout.tableColors,
      });
      if (vLayout.hiddenTableIds) setHiddenTableIds(vLayout.hiddenTableIds);
      if (vLayout.tableColors) setTableColors(vLayout.tableColors);
    }
    clearHistory();
  }

  function openCreateVersionModal() {
    setVersionModalMode('create');
    setVersionModalInitialName('');
    setEditingVersionId(null);
    setVersionModalOpen(true);
  }

  function openRenameVersionModal(version: IDiagramVersion) {
    setVersionModalMode('edit');
    setVersionModalInitialName(version.name);
    setEditingVersionId(version.id);
    setVersionModalOpen(true);
  }

  function handleVersionFormSubmit(name: string) {
    if (versionModalMode === 'create' && diagram) {
      const ddl = schemaToDdl(localTables);
      const currentLayout = layout;
      const snapshot = {
        ...diagram,
        tables: localTables,
        layout: currentLayout ? {
          positions: currentLayout.positions,
          zoom: currentLayout.zoom,
          viewport: currentLayout.viewport,
          hiddenTableIds: useDiagramStore.getState().hiddenTableIds,
          tableColors: useDiagramStore.getState().tableColors,
        } : undefined,
      };
      createVersion.mutate(
        { diagramId: diagram.id, name, ddlContent: ddl, schemaSnapshot: snapshot },
        {
          onSuccess: (result) => {
            if (result.success) {
              setActiveVersionId(result.data.id);
              resetLocalTables(localTables);
            }
          },
        },
      );
    } else if (versionModalMode === 'edit' && editingVersionId && selectedDiagramId) {
      updateVersion.mutate({ id: editingVersionId, diagramId: selectedDiagramId, name });
    }
  }

  function handleDeleteVersion(version: IDiagramVersion) {
    if (!selectedDiagramId) return;
    deleteVersion.mutate(
      { id: version.id, diagramId: selectedDiagramId },
      {
        onSuccess: () => {
          if (activeVersionId === version.id) {
            // Switch to another version
            const remaining = (diagramVersions ?? []).filter((v) => v.id !== version.id);
            const next = remaining[0] ?? null;
            if (next) {
              setActiveVersionId(next.id);
              if (next.schemaSnapshot?.tables) resetLocalTables(next.schemaSnapshot.tables);
            } else {
              setActiveVersionId(null);
              if (diagram) resetLocalTables(diagram.tables);
            }
          }
        },
      },
    );
  }

  function handleReorderVersions(orderedIds: string[]) {
    if (!selectedDiagramId) return;
    reorderVersions.mutate({ diagramId: selectedDiagramId, orderedVersionIds: orderedIds });
  }

  function handleReorderDiagrams(orderedIds: string[]) {
    reorderDiagrams.mutate({ orderedDiagramIds: orderedIds });
  }

  // --- Layout / Canvas ---
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
    if (isDiagramLocked) return;
    pushUndoState(localTables);
    updateLocalTable(updated);
  }

  function handleTableDelete() {
    if (!selectedTableId || isDiagramLocked) return;
    pushUndoState(localTables);
    deleteLocalTable(selectedTableId);
    setSelectedTableId(null);
  }

  function handleTableDeleteFromList(tableId: string) {
    if (isDiagramLocked) return;
    pushUndoState(localTables);
    deleteLocalTable(tableId);
    if (selectedTableId === tableId) setSelectedTableId(null);
  }

  function handleReorderTables(reorderedTables: ITable[]) {
    if (isDiagramLocked) return;
    pushUndoState(localTables);
    setLocalTables(reorderedTables);
  }

  function handleAutoLayout() {
    if (!diagram) return;
    const { nodes, edges } = schemaToNodes(localTables, { filter });
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
    setLayoutDirty(true);
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

  // Build diagram object with localTables for canvas rendering
  const diagramWithLocal = diagram ? { ...diagram, tables: localTables } : undefined;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <DiagramToolbar
        currentDiagram={diagram}
        // Save
        onSave={handleSave}
        isDirty={isDirty || isLayoutDirty}
        isSaving={updateDiagram.isPending || updateVersion.isPending}
        // Lock
        isDiagramLocked={isDiagramLocked}
        onToggleDiagramLock={toggleDiagramLock}
        // Undo/Redo
        onUndo={undo}
        onRedo={redo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        // Description toggle
        isDescriptionVisible={isDescriptionVisible}
        onToggleDescription={() => setIsDescriptionVisible((v) => !v)}
        // Edit diagram modal
        onEditDiagram={openEditDiagramModal}
        // Version dropdown
        versions={diagramVersions ?? []}
        activeVersionId={activeVersionId}
        onVersionSelect={handleVersionSelect}
        onCreateVersion={openCreateVersionModal}
        onRenameVersion={openRenameVersionModal}
        onDeleteVersion={handleDeleteVersion}
        onReorderVersions={handleReorderVersions}
      />

      {/* Description bar (toggled by Info button) */}
      {isDescriptionVisible && diagram && (
        <div className="border-b border-border bg-muted/30 px-4 py-1.5">
          <p className="text-xs text-muted-foreground">
            {diagram.description || 'No description. Click the diagram name to add one.'}
          </p>
        </div>
      )}

      {/* 3-Panel Layout */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left Panel: Diagram List or Table List */}
        {isLeftPanelOpen && (
          leftPanelView === 'diagrams' ? (
            <DiagramListPanel
              diagrams={diagrams ?? []}
              selectedDiagramId={selectedDiagramId}
              onSelect={handleDiagramSelect}
              onCreate={openCreateDiagramModal}
              onEdit={handleDiagramEdit}
              onDelete={handleDiagramDelete}
              onClose={() => {}}
              onReorderDiagrams={handleReorderDiagrams}
              versions={diagramVersions ?? []}
              activeVersionId={activeVersionId}
              onVersionSelect={handleVersionSelect}
              onReorderVersions={handleReorderVersions}
            />
          ) : diagram ? (
            <TableListPanel
              tables={localTables}
              selectedTableId={selectedTableId}
              searchResults={searchResults}
              onTableSelect={handleTableSelect}
              onClose={() => {}}
              hiddenTableIds={hiddenTableIds}
              onToggleVisibility={handleToggleVisibility}
              onShowAll={handleShowAll}
              onTableDelete={isDiagramLocked ? undefined : handleTableDeleteFromList}
              onReorderTables={isDiagramLocked ? undefined : handleReorderTables}
            />
          ) : null
        )}

        {/* Center: Canvas or DDL */}
        <div className="relative flex-1">
          {/* Canvas Floating Toolbar */}
          {viewMode === 'canvas' && diagram && (
            <CanvasToolbar
              onAddTable={handleAddTable}
              onAutoLayout={handleAutoLayout}
              onToggleSearch={() => setSearchOpen(!isSearchOpen)}
              isSearchOpen={isSearchOpen}
              onToggleFilter={() => setIsFilterPanelOpen((v) => !v)}
              isFilterOpen={isFilterPanelOpen}
              onToggleExport={() => setIsExportOpen((v) => !v)}
              isExportOpen={isExportOpen}
              disabled={isDiagramLocked}
            />
          )}

          {/* Filter Panel (floating) */}
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

          {/* Export Menu (floating) */}
          {isExportOpen && (
            <div className="absolute right-2 top-12 z-50">
              <ExportMenu
                tables={localTables}
                onClose={() => setIsExportOpen(false)}
              />
            </div>
          )}

          {/* Snapshot Panel (floating) */}
          {isSnapshotPanelOpen && selectedDiagramId && (
            <div className="absolute right-2 top-12 z-50">
              <ViewSnapshotManager
                diagramId={selectedDiagramId}
                currentFilter={filter}
                currentLayout={layout ?? null}
                onRestore={handleSnapshotRestore}
                onClose={() => setIsSnapshotPanelOpen(false)}
              />
            </div>
          )}

          {/* Search Overlay */}
          {isSearchOpen && diagram && (
            <SearchOverlay
              tables={localTables}
              query={searchQuery}
              onQueryChange={setSearchQuery}
              onResults={setSearchResults}
              onSelect={handleSearchSelect}
              onClose={() => setSearchOpen(false)}
              results={searchResults}
            />
          )}
          {/* Canvas: always mounted when diagram exists, hidden via CSS */}
          <div className={viewMode === 'canvas' ? 'h-full w-full' : 'hidden'}>
            {diagramWithLocal ? (
              <DiagramCanvas
                diagram={diagramWithLocal}
                layout={layout}
                filter={filter}
                highlightedTableIds={highlightedTableIds}
                selectedTableId={selectedTableId}
                onTableSelect={handleTableSelect}
                onTableCreate={isDiagramLocked ? undefined : handleTableCreate}
                onTableUpdate={isDiagramLocked ? undefined : handleTableChange}
                onEdgeCreate={isDiagramLocked ? undefined : handleEdgeCreate}
                onLayoutChange={handleLayoutChange}
                hiddenTableIds={hiddenTableIds}
                tableColors={tableColors}
                readOnly={isDiagramLocked}
                lockedNodeIds={lockedNodeIds}
                onNodeLockToggle={toggleNodeLock}
                onNodeDragStart={handleNodeDragStart}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Select or create a diagram to get started.
                </p>
              </div>
            )}
          </div>
          {/* DDL Editor: rendered only when active (lightweight, re-mount OK) */}
          {viewMode === 'ddl' && diagram && (
            <DdlEditorView
              tables={localTables}
              onParsed={(tables) => {
                pushUndoState(localTables);
                setChangeSource('ddl');
                setLocalTables(tables);
                setTimeout(() => setChangeSource(null), 100);
              }}
              includedTableIds={ddlIncludedTableIds}
              onIncludedTableIdsChange={setDdlIncludedTableIds}
              allTables={localTables}
            />
          )}
        </div>

        {/* Right Panel: Table Detail */}
        {isRightPanelOpen && selectedTable && diagram && (
          <TableDetailPanel
            table={selectedTable}
            allTables={localTables}
            onChange={handleTableChange}
            onDelete={handleTableDelete}
            onClose={() => setSelectedTableId(null)}
            color={selectedTableId ? tableColors[selectedTableId] : undefined}
            onColorChange={handleTableColorChange}
            readOnly={isDiagramLocked}
            rightPanelMode={rightPanelMode}
            onRightPanelModeChange={setRightPanelMode}
            compareVersions={diagramVersions ?? []}
            compareTargetVersionId={compareTargetVersionId}
            onCompareTargetChange={setCompareTargetVersionId}
            currentDiagramName={diagram.name}
          />
        )}
      </div>

      {/* Diagram Form Modal (create / edit) */}
      <DiagramFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        mode={formModalMode}
        initialValues={formModalInitial}
        onSubmit={handleFormModalSubmit}
      />

      {/* Version Form Modal (create / rename) */}
      <VersionFormModal
        open={versionModalOpen}
        onOpenChange={setVersionModalOpen}
        mode={versionModalMode}
        initialName={versionModalInitialName}
        onSubmit={handleVersionFormSubmit}
      />
    </div>
  );
}
