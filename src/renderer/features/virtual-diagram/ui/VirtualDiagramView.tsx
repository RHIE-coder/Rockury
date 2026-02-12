import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ITable, IDiagramLayout, IDiagramSnapshot, IDiagramVersion, ISearchResult, IViewSnapshot, TKeyType } from '~/shared/types/db';
import { useDiagrams, useDiagram, useUpdateDiagram, useCreateDiagram, useDeleteDiagram, useCloneDiagram, useDiagramLayout, useSaveDiagramLayout, useCreateDiagramVersion, useUpdateDiagramVersion, useDeleteDiagramVersion, useDiagramVersions, useReorderVersions, useReorderDiagrams } from '../model/useDiagrams';
import { useDiagramStore } from '../model/diagramStore';
import { schemaToNodes } from '../lib/schemaToNodes';
import { compareVersionTables } from '../lib/compareVersions';
import { applyDagreLayout } from '../lib/autoLayout';
import { simulateCascade, getReferencedColumns } from '../lib/cascadeTraversal';
import type { TSimulationType } from '../lib/cascadeTraversal';
import { DiagramCanvas } from './DiagramCanvas';
import { DiagramToolbar } from './DiagramToolbar';
import { CanvasToolbar } from './CanvasToolbar';
import { TableListPanel } from './TableListPanel';
import { TableDetailPanel } from './TableDetailPanel';
import { SearchOverlay } from './SearchOverlay';
import { FilterPanel } from './FilterPanel';
import { ViewSnapshotManager } from './ViewSnapshotManager';
import { DiagramListPanel } from './DiagramListPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { DiagramFormModal } from './DiagramFormModal';
import { DdlEditorView } from '@/features/ddl-editor';
import { schemaToDdl } from '@/features/ddl-editor/lib/schemaToDdl';
import { ExportMenu } from './ExportMenu';
import { VersionFormModal } from './VersionFormModal';
import { NodeContextMenu } from './NodeContextMenu';
import { CascadeInfoPanel } from './CascadeInfoPanel';
import { CompareInfoPanel } from './CompareInfoPanel';
import { useNavigationGuard } from '../hooks/useNavigationGuard';

let _tableIdCounter = 0;
function createEmptyTable(): ITable {
  const ts = Date.now();
  const seq = _tableIdCounter++;
  return {
    id: `tbl-${ts}-${seq}`,
    name: 'new_table',
    comment: '',
    columns: [
      {
        id: `col-${ts}-${seq}-0`,
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
    lockedNodeIds,
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
    // Cascade simulation
    cascadeSimulation,
    setCascadeSimulation,
    clearCascadeSimulation,
  } = useDiagramStore();

  const [fitViewTrigger, setFitViewTrigger] = useState(0);
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

  // Delete confirmation modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ position: { x: number; y: number }; tableId: string; tableName: string } | null>(null);

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

  // Derive lock state from version data (persisted in DB)
  const isDiagramLocked = activeVersion?.isLocked ?? false;
  const lockedVersionIds = useMemo(
    () => (diagramVersions ?? []).filter((v) => v.isLocked).map((v) => v.id),
    [diagramVersions],
  );
  const toggleDiagramLock = useCallback(() => {
    if (!activeVersionId || !selectedDiagramId) return;
    updateVersion.mutate({ id: activeVersionId, diagramId: selectedDiagramId, isLocked: !isDiagramLocked });
  }, [activeVersionId, selectedDiagramId, isDiagramLocked, updateVersion]);

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
  function buildCurrentSnapshot(): IDiagramSnapshot {
    return {
      ...(diagram ?? { id: '', name: '', tables: [], constraints: [] }),
      tables: localTables,
      layout: layout ? {
        positions: layout.positions,
        zoom: layout.zoom,
        viewport: layout.viewport,
        hiddenTableIds: useDiagramStore.getState().hiddenTableIds,
        tableColors: useDiagramStore.getState().tableColors,
      } : undefined,
    };
  }

  function handleSave() {
    if (!diagram || (!isDirty && !isLayoutDirty)) return;

    if (activeVersionId && selectedDiagramId) {
      const ddl = schemaToDdl(localTables);
      const snapshot = buildCurrentSnapshot();
      updateVersion.mutate(
        { id: activeVersionId, diagramId: selectedDiagramId, ddlContent: ddl, schemaSnapshot: snapshot },
        {
          onSuccess: () => {
            resetLocalTables(localTables);
            setLayoutDirty(false);
            updateDiagram.mutate({ id: diagram.id, tables: localTables });
          },
        },
      );
    } else {
      updateDiagram.mutate(
        { id: diagram.id, tables: localTables },
        { onSuccess: () => resetLocalTables(localTables) },
      );
    }
  }

  // --- Cascade simulation handlers ---
  function handleNodeContextMenu(event: React.MouseEvent, tableId: string, tableName: string) {
    setContextMenu({ position: { x: event.clientX, y: event.clientY }, tableId, tableName });
  }

  function handleSimulate(tableId: string, type: TSimulationType, columnName?: string) {
    const result = simulateCascade(localTables, tableId, type, columnName);
    setCascadeSimulation(result);
  }

  // --- Keyboard shortcuts ---
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;

      // ESC: close compare mode first, then cascade simulation, then other overlays
      if (e.key === 'Escape' && compareTargetVersionId) {
        handleCompareTargetChange(null);
        return;
      }
      if (e.key === 'Escape' && cascadeSimulation) {
        clearCascadeSimulation();
        return;
      }

      // Backspace/Delete: open delete confirmation for selected table
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedTableId && !isDiagramLocked) {
        // Don't trigger when typing in an input/textarea
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        setDeleteConfirmOpen(true);
        return;
      }

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
  }, [isDirty, isLayoutDirty, localTables, diagram?.id, cascadeSimulation, compareTargetVersionId, selectedTableId, isDiagramLocked]);

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

  // Compare mode: compute diff between current tables and target version
  const compareResult = useMemo(() => {
    if (!compareTargetVersionId) return null;
    const targetVer = diagramVersions?.find((v) => v.id === compareTargetVersionId);
    if (!targetVer?.schemaSnapshot?.tables) return null;
    return compareVersionTables(localTables, targetVer.schemaSnapshot.tables);
  }, [compareTargetVersionId, diagramVersions, localTables]);

  // --- Compare mode ---
  function handleCompareTargetChange(id: string | null) {
    setCompareTargetVersionId(id);
    if (id) {
      setRightPanelMode('compare');
      clearCascadeSimulation();
      setFitViewTrigger((v) => v + 1);
    } else {
      setRightPanelMode('detail');
      setFitViewTrigger((v) => v + 1);
    }
  }

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
  function nextUniqueName(base: string): string {
    const names = new Set(localTables.map((t) => t.name.toLowerCase()));
    if (!names.has(base.toLowerCase())) return base;
    let i = 2;
    while (names.has(`${base}_${i}`.toLowerCase())) i++;
    return `${base}_${i}`;
  }

  function handleAddTable() {
    if (!diagram || isDiagramLocked) return;
    pushUndoState(localTables);
    const newTable = createEmptyTable();
    newTable.name = nextUniqueName(newTable.name);
    addLocalTable(newTable);
  }

  function handleTableCreate(position: { x: number; y: number }) {
    if (!diagram || isDiagramLocked) return;
    pushUndoState(localTables);
    const newTable = createEmptyTable();
    newTable.name = nextUniqueName(newTable.name);
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
    if (version.id === activeVersionId) return;

    // Auto-save current version's layout + tables before switching
    if (activeVersionId && selectedDiagramId && layout) {
      updateVersion.mutate({
        id: activeVersionId,
        diagramId: selectedDiagramId,
        schemaSnapshot: buildCurrentSnapshot(),
      });
    }

    // Switch to the target version
    setActiveVersionId(version.id);
    if (version.schemaSnapshot?.tables) {
      resetLocalTables(version.schemaSnapshot.tables);
    }
    // Restore layout from target version's snapshot
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
    if (viewMode === 'ddl') {
      // In DDL mode: only update selectedTableId for DDL scroll, don't open right panel
      useDiagramStore.setState({ selectedTableId: tableId || null });
      return;
    }
    setSelectedTableId(tableId || null);
    // Clear cascade simulation when clicking pane (empty area)
    if (!tableId && cascadeSimulation) {
      clearCascadeSimulation();
    }
  }

  function handleTableChange(updated: ITable) {
    if (isDiagramLocked) return;
    // Prevent duplicate table names
    const duplicate = localTables.find(
      (t) => t.id !== updated.id && t.name.toLowerCase() === updated.name.toLowerCase(),
    );
    if (duplicate) {
      alert(`A table named "${updated.name}" already exists.`);
      return;
    }
    pushUndoState(localTables);
    updateLocalTable(updated);
  }

  function handleTableDelete() {
    if (!selectedTableId || isDiagramLocked) return;
    pushUndoState(localTables);
    deleteLocalTable(selectedTableId);
    setSelectedTableId(null);
  }

  function handleConfirmDelete() {
    setDeleteConfirmOpen(false);
    handleTableDelete();
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
        compareTargetVersionId={compareTargetVersionId}
        onCompareTargetChange={handleCompareTargetChange}
        lockedVersionIds={lockedVersionIds}
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
              lockedVersionIds={lockedVersionIds}
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
                selectedTableId={viewMode === 'canvas' ? selectedTableId : null}
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
                onNodeContextMenu={handleNodeContextMenu}
                cascadeSimulation={cascadeSimulation}
                compareResult={compareResult}
                fitViewTrigger={fitViewTrigger}
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
              tables={hiddenTableIds.length > 0
                ? localTables.filter((t) => !hiddenTableIds.includes(t.id))
                : localTables}
              onParsed={(parsedTables) => {
                pushUndoState(localTables);
                setChangeSource('ddl');
                // Preserve existing table/column IDs by matching on name
                const existingByName = new Map(localTables.map((t) => [t.name, t]));
                const merged = parsedTables.map((parsed) => {
                  const existing = existingByName.get(parsed.name);
                  if (!existing) return parsed;
                  const existingColByName = new Map(existing.columns.map((c) => [c.name, c]));
                  const mergedColumns = parsed.columns.map((col) => {
                    const existingCol = existingColByName.get(col.name);
                    return existingCol ? { ...col, id: existingCol.id } : col;
                  });
                  return { ...parsed, id: existing.id, columns: mergedColumns };
                });
                // Keep hidden tables intact, only replace visible ones
                // Exclude hidden tables whose IDs were already merged (matched by name)
                const mergedIds = new Set(merged.map((t) => t.id));
                const hiddenTables = localTables.filter((t) => hiddenTableIds.includes(t.id) && !mergedIds.has(t.id));
                setLocalTables([...merged, ...hiddenTables]);
                setTimeout(() => setChangeSource(null), 100);
              }}
              focusTableName={selectedTableId ? localTables.find((t) => t.id === selectedTableId)?.name ?? null : null}
            />
          )}

          {/* Cascade simulation info panel */}
          {cascadeSimulation && (
            <CascadeInfoPanel
              simulation={cascadeSimulation}
              onClose={clearCascadeSimulation}
            />
          )}

          {/* Compare info panel */}
          {compareResult && compareTargetVersionId && (
            <CompareInfoPanel
              compareResult={compareResult}
              targetVersionName={
                diagramVersions?.find((v) => v.id === compareTargetVersionId)?.name
                || `#${diagramVersions?.find((v) => v.id === compareTargetVersionId)?.versionNumber ?? '?'}`
              }
              onClose={() => handleCompareTargetChange(null)}
            />
          )}
        </div>

        {/* Right Panel: Table Detail (hidden in DDL mode) */}
        {viewMode !== 'ddl' && isRightPanelOpen && selectedTable && diagram && (
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

      {/* Delete Table Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Table</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedTable?.name}&quot;? You can undo this action.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" autoFocus onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Node Context Menu */}
      {contextMenu && (
        <NodeContextMenu
          position={contextMenu.position}
          tableName={contextMenu.tableName}
          referencedColumns={getReferencedColumns(localTables, contextMenu.tableId)}
          onSimulate={(type, columnName) => handleSimulate(contextMenu.tableId, type, columnName)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
