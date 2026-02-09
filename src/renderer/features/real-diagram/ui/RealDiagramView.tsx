import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, SlidersHorizontal, PanelLeft, PanelRight, ArrowDownToLine } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import type { ITable, IDiagram, ISearchResult } from '~/shared/types/db';
import { useConnections } from '@/features/db-connection';
import { useDiagramStore, useCreateDiagram } from '@/features/virtual-diagram';
import { DiagramCanvas } from '@/features/virtual-diagram/ui/DiagramCanvas';
import { TableListPanel } from '@/features/virtual-diagram/ui/TableListPanel';
import { TableDetailPanel } from '@/features/virtual-diagram/ui/TableDetailPanel';
import { SearchOverlay } from '@/features/virtual-diagram/ui/SearchOverlay';
import { FilterPanel } from '@/features/virtual-diagram/ui/FilterPanel';
import { realDiagramApi } from '../api/realDiagramApi';

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
  } = useDiagramStore();

  const selectedConnectionId = storeConnectionId ?? '';
  function setSelectedConnectionId(id: string) {
    setStoreConnectionId(id || null);
  }
  const [tables, setTables] = useState<ITable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ISearchResult[]>([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const createDiagram = useCreateDiagram();

  const fetchSchema = useMutation({
    mutationFn: (connectionId: string) => realDiagramApi.fetchReal(connectionId),
    onSuccess: (result) => {
      if (result.success) {
        setTables(result.data);
        setSelectedTableId(null);
      }
    },
  });

  function handleFetch() {
    if (!selectedConnectionId) return;
    fetchSchema.mutate(selectedConnectionId);
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
  const highlightedTableIds = searchResults
    .filter((r) => r.type === 'table')
    .map((r) => r.tableId);

  const handleTableSelect = useCallback((tableId: string) => {
    setSelectedTableId(tableId || null);
  }, []);

  function handleImportAsVirtual() {
    if (tables.length === 0) return;
    const connName = connections?.find((c) => c.id === selectedConnectionId)?.name ?? 'Imported';
    createDiagram.mutate(
      { name: `${connName} (imported)`, type: 'virtual', tables },
      {
        onSuccess: (result) => {
          if (result.success) {
            // Switch to virtual tab
            useDiagramStore.getState().setActiveTab('virtual');
            useDiagramStore.getState().setSelectedDiagramId(result.data.id);
          }
        },
      },
    );
  }

  function handleSearchSelect(result: ISearchResult) {
    setSelectedTableId(result.tableId);
    setIsSearchOpen(false);
  }

  // Build a synthetic IDiagram for the canvas
  const realDiagram: IDiagram | null = tables.length > 0
    ? {
        id: `real-${selectedConnectionId}`,
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
          disabled={!selectedConnectionId || fetchSchema.isPending}
        >
          <RefreshCw className={`size-3.5 ${fetchSchema.isPending ? 'animate-spin' : ''}`} />
          {fetchSchema.isPending ? 'Fetching...' : 'Fetch'}
        </Button>

        {realDiagram && (
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

          {realDiagram ? (
            <DiagramCanvas
              diagram={realDiagram}
              filter={filter}
              highlightedTableIds={highlightedTableIds}
              selectedTableId={selectedTableId}
              onTableSelect={handleTableSelect}
              readOnly
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted/30">
              <p className="text-sm text-muted-foreground">
                {fetchSchema.isError
                  ? 'Failed to fetch schema. Please check your connection.'
                  : 'Select a connection and click "Fetch" to view the real database structure.'}
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
      </div>
    </div>
  );
}
