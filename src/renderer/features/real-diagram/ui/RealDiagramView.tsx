import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RefreshCw, Search, SlidersHorizontal, PanelLeft, PanelRight, ArrowDownToLine, Code, History, Camera } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import type { ITable, IDiagram, IDiagramLayout, ISearchResult } from '~/shared/types/db';
import { useConnections } from '@/features/db-connection';
import { useDiagramStore, useCreateDiagram, useDiagramLayout, useSaveDiagramLayout, useCreateDiagramVersion } from '@/features/virtual-diagram';
import { DiagramCanvas } from '@/features/virtual-diagram/ui/DiagramCanvas';
import { TableListPanel } from '@/features/virtual-diagram/ui/TableListPanel';
import { TableDetailPanel } from '@/features/virtual-diagram/ui/TableDetailPanel';
import { SearchOverlay } from '@/features/virtual-diagram/ui/SearchOverlay';
import { FilterPanel } from '@/features/virtual-diagram/ui/FilterPanel';
import { DdlEditorView } from '@/features/ddl-editor';
import { realDiagramApi } from '../api/realDiagramApi';
import { ChangelogPanel } from './ChangelogPanel';
import { SnapshotListPanel } from '@/features/schema-snapshot';

export function RealDiagramView() {
  const { data: connections } = useConnections();
  const {
    filter,
    setFilter,
    setFilterPreset,
    isLeftPanelOpen,
    toggleLeftPanel,
    isRightPanelOpen,
    toggleRightPanel,
    selectedConnectionId: storeConnectionId,
    setSelectedConnectionId: setStoreConnectionId,
    viewMode,
    setViewMode,
    // Persisted real diagram state from store
    realTables: tables,
    setRealTables: setTables,
    realDiagramId,
    setRealDiagramId,
    realSelectedTableId: selectedTableId,
    setRealSelectedTableId: setSelectedTableId,
    isRealChangelogOpen: isChangelogOpen,
    setRealChangelogOpen: setIsChangelogOpen,
    lastRealChangelog: lastChangelog,
    setLastRealChangelog: setLastChangelog,
  } = useDiagramStore();

  const selectedConnectionId = storeConnectionId ?? '';
  function setSelectedConnectionId(id: string) {
    setStoreConnectionId(id || null);
  }
  // Ephemeral UI state remains local
  const [isSnapshotsOpen, setIsSnapshotsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ISearchResult[]>([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const createDiagram = useCreateDiagram();
  const createVersion = useCreateDiagramVersion();

  const { data: layout } = useDiagramLayout(realDiagramId ?? '');
  const saveLayout = useSaveDiagramLayout();

  // Track latest layout in ref so sync can read up-to-date positions (survives debounce race)
  const latestLayoutRef = useRef<Pick<IDiagramLayout, 'positions' | 'zoom' | 'viewport'> | null>(null);

  const syncSchema = useMutation({
    mutationFn: (connectionId: string) => realDiagramApi.syncReal(connectionId),
    onSuccess: (result) => {
      if (result.success) {
        const newTables = result.data.diagram.tables;
        const newDiagramId = result.data.diagram.id;

        // Remap saved positions from old table IDs to new table IDs by table name
        const oldTables = useDiagramStore.getState().realTables;
        const savedLayout = latestLayoutRef.current ?? layout;
        const oldPositions = savedLayout?.positions;

        if (oldPositions && oldTables.length > 0) {
          const oldNameToId = new Map(oldTables.map((t) => [t.name, t.id]));
          const newPositions: Record<string, { x: number; y: number }> = {};

          for (const t of newTables) {
            const oldId = oldNameToId.get(t.name);
            if (oldId && oldPositions[oldId]) {
              newPositions[t.id] = oldPositions[oldId];
            }
          }

          if (Object.keys(newPositions).length > 0) {
            saveLayout.mutate({
              diagramId: newDiagramId,
              positions: newPositions,
              zoom: savedLayout?.zoom ?? 1,
              viewport: savedLayout?.viewport ?? { x: 0, y: 0 },
            });
          }
        }

        setTables(newTables);
        setRealDiagramId(newDiagramId);
        setSelectedTableId(null);
        if (result.data.changelog) {
          setLastChangelog(result.data.changelog);
          setIsChangelogOpen(true);
        }
      }
    },
  });

  // Auto-load saved diagram from local DB when connection is selected
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
        setTables(result.data.tables);
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

  // Cmd+F shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;
  const highlightedTableIds = useMemo(
    () => searchResults.filter((r) => r.type === 'table').map((r) => r.tableId),
    [searchResults],
  );

  const handleTableSelect = useCallback((tableId: string) => {
    setSelectedTableId(tableId || null);
  }, [setSelectedTableId]);

  function handleImportAsVirtual() {
    if (tables.length === 0) return;
    const connName = connections?.find((c) => c.id === selectedConnectionId)?.name ?? 'Imported';
    createDiagram.mutate(
      { name: `${connName} (imported)`, type: 'virtual', version: '0.0.0', tables },
      {
        onSuccess: (result) => {
          if (result.success) {
            const newDiagram = result.data;
            // Auto-create initial version with imported tables
            createVersion.mutate({
              diagramId: newDiagram.id,
              name: 'v0.0.0',
              ddlContent: '',
              schemaSnapshot: { ...newDiagram, tables },
            });
            // Switch to virtual tab
            useDiagramStore.getState().setActiveTab('virtual');
            useDiagramStore.getState().setSelectedDiagramId(newDiagram.id);
          }
        },
      },
    );
  }

  function handleSearchSelect(result: ISearchResult) {
    setSelectedTableId(result.tableId);
    setIsSearchOpen(false);
  }

  const handleLayoutChange = useCallback(
    (layoutUpdate: Pick<IDiagramLayout, 'positions' | 'zoom' | 'viewport'>) => {
      if (!realDiagramId) return;
      latestLayoutRef.current = layoutUpdate;
      saveLayout.mutate({
        diagramId: realDiagramId,
        ...layoutUpdate,
      });
    },
    [realDiagramId, saveLayout],
  );

  // Build IDiagram for the canvas (use persisted ID if available)
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
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <Select
          className="h-7 w-48 text-xs"
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
            <Button
              variant="outline"
              size="xs"
              onClick={handleImportAsVirtual}
              disabled={createDiagram.isPending}
              title="Import as Virtual Diagram (Reverse Engineering)"
            >
              <ArrowDownToLine className="size-3.5" />
              {createDiagram.isPending ? 'Importing...' : 'Import as Virtual'}
            </Button>
            <Button
              variant={isSnapshotsOpen ? 'secondary' : 'ghost'}
              size="xs"
              onClick={() => setIsSnapshotsOpen(!isSnapshotsOpen)}
              title="Schema Snapshots"
            >
              <Camera className="size-3.5" />
            </Button>
            <Button
              variant={isChangelogOpen ? 'secondary' : 'ghost'}
              size="xs"
              onClick={() => setIsChangelogOpen(!isChangelogOpen)}
              title="Changelog"
            >
              <History className="size-3.5" />
            </Button>
          </>
        )}

        <div className="flex-1" />

        {realDiagram && (
          <span className="text-xs text-muted-foreground">
            {tables.length} tables
          </span>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            title="Search (Cmd+F)"
          >
            <Search className="size-3.5" />
          </Button>

          <Button
            variant={isFilterPanelOpen ? 'secondary' : 'ghost'}
            size="xs"
            onClick={() => setIsFilterPanelOpen((v) => !v)}
            title="Filter"
          >
            <SlidersHorizontal className="size-3.5" />
          </Button>

          <Button
            variant={isLeftPanelOpen ? 'secondary' : 'ghost'}
            size="xs"
            onClick={toggleLeftPanel}
            title="Toggle left panel"
          >
            <PanelLeft className="size-3.5" />
          </Button>

          <Button
            variant={isRightPanelOpen ? 'secondary' : 'ghost'}
            size="xs"
            onClick={toggleRightPanel}
            title="Toggle right panel"
          >
            <PanelRight className="size-3.5" />
          </Button>

          <div className="h-4 w-px bg-border" />

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

      {/* 3-Panel Layout */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left Panel: Table List */}
        {isLeftPanelOpen && realDiagram && (
          <TableListPanel
            tables={tables}
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

          {/* Search Overlay */}
          {isSearchOpen && realDiagram && (
            <SearchOverlay
              tables={tables}
              query={searchQuery}
              onQueryChange={setSearchQuery}
              onResults={setSearchResults}
              onSelect={handleSearchSelect}
              onClose={() => setIsSearchOpen(false)}
              results={searchResults}
            />
          )}

          {viewMode === 'ddl' && realDiagram ? (
            <DdlEditorView
              tables={tables}
              readOnly
              focusTableName={selectedTableId ? tables.find((t) => t.id === selectedTableId)?.name ?? null : null}
            />
          ) : realDiagram ? (
            <DiagramCanvas
              diagram={realDiagram}
              layout={layout}
              filter={filter}
              highlightedTableIds={highlightedTableIds}
              selectedTableId={selectedTableId}
              onTableSelect={handleTableSelect}
              onLayoutChange={handleLayoutChange}
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

        {/* Right Panel: Table Detail (read-only) */}
        {isRightPanelOpen && selectedTable && realDiagram && (
          <TableDetailPanel
            table={selectedTable}
            allTables={tables}
            onChange={() => {}} // read-only
            onDelete={() => {}} // read-only
            onClose={() => setSelectedTableId(null)}
          />
        )}

        {/* Snapshots Panel */}
        {isSnapshotsOpen && selectedConnectionId && (
          <div className="w-72 shrink-0 overflow-y-auto border-l border-border p-3">
            <SnapshotListPanel connectionId={selectedConnectionId} />
          </div>
        )}

        {/* Changelog Panel */}
        {isChangelogOpen && selectedConnectionId && (
          <div className="w-72 shrink-0 border-l border-border">
            <ChangelogPanel
              connectionId={selectedConnectionId}
              onClose={() => setIsChangelogOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
