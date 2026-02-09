import { useCallback } from 'react';
import type { ITable, IDiagramLayout, ISearchResult } from '~/shared/types/db';
import { useDiagrams, useDiagram, useUpdateDiagram, useCreateDiagram, useDiagramLayout, useSaveDiagramLayout } from '../model/useDiagrams';
import { useDiagramStore } from '../model/diagramStore';
import { DiagramCanvas } from './DiagramCanvas';
import { DiagramToolbar } from './DiagramToolbar';
import { TableListPanel } from './TableListPanel';
import { TableDetailPanel } from './TableDetailPanel';
import { SearchOverlay } from './SearchOverlay';

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
    filter,
    isLeftPanelOpen,
    toggleLeftPanel,
    isRightPanelOpen,
    isSearchOpen,
    setSearchOpen,
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
  } = useDiagramStore();
  const { data: diagram } = useDiagram(selectedDiagramId ?? '');
  const { data: layout } = useDiagramLayout(selectedDiagramId ?? '');
  const updateDiagram = useUpdateDiagram();
  const createDiagram = useCreateDiagram();
  const saveLayout = useSaveDiagramLayout();

  const selectedTable = diagram?.tables.find((t) => t.id === selectedTableId) ?? null;

  const highlightedTableIds = searchResults
    .filter((r) => r.type === 'table')
    .map((r) => r.tableId);

  function handleDiagramSelect(id: string) {
    setSelectedDiagramId(id);
    setSelectedTableId(null);
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
      />

      {/* 3-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
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
