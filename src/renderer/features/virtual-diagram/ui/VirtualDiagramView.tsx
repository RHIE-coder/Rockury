import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import type { ITable } from '@/entities/table';
import { useDiagrams, useDiagram, useUpdateDiagram, useCreateDiagram } from '../model/useDiagrams';
import { useDiagramStore } from '../model/diagramStore';
import { TableEditor } from './TableEditor';

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
  const { selectedDiagramId, setSelectedDiagramId, selectedTableId, setSelectedTableId } =
    useDiagramStore();
  const { data: diagram } = useDiagram(selectedDiagramId ?? '');
  const updateDiagram = useUpdateDiagram();
  const createDiagram = useCreateDiagram();
  const [showTableEditor, setShowTableEditor] = useState(false);

  const selectedTable = diagram?.tables.find((t) => t.id === selectedTableId) ?? null;

  function handleDiagramSelect(id: string) {
    setSelectedDiagramId(id);
    setSelectedTableId(null);
    setShowTableEditor(false);
  }

  function handleAddTable() {
    if (!diagram) return;
    const newTable = createEmptyTable();
    updateDiagram.mutate({
      id: diagram.id,
      tables: [...diagram.tables, newTable],
    });
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

  function handleTableClick(tableId: string) {
    setSelectedTableId(tableId);
    setShowTableEditor(true);
  }

  function handleTableChange(updated: ITable) {
    if (!diagram) return;
    const tables = diagram.tables.map((t) => (t.id === updated.id ? updated : t));
    updateDiagram.mutate({ id: diagram.id, tables });
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-border p-2">
          <Select
            className="h-8 w-48 text-sm"
            value={selectedDiagramId ?? ''}
            onChange={(e) => handleDiagramSelect(e.target.value)}
          >
            <option value="">Select diagram...</option>
            {diagrams?.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
          <Button variant="outline" size="sm" onClick={handleCreateDiagram}>
            New Diagram
          </Button>
          {diagram && (
            <Button variant="outline" size="sm" onClick={handleAddTable}>
              <Plus className="size-4" />
              Add Table
            </Button>
          )}
        </div>

        {/* Canvas area */}
        <div className="flex-1 bg-muted/30">
          {diagram ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {diagram.tables.map((table) => (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => handleTableClick(table.id)}
                  className={`rounded-lg border p-3 text-left transition-colors hover:border-primary ${
                    selectedTableId === table.id ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  }`}
                >
                  <p className="text-sm font-semibold">{table.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {table.columns.length} columns
                  </p>
                  {table.comment && (
                    <p className="mt-1 text-xs text-muted-foreground">{table.comment}</p>
                  )}
                </button>
              ))}
              {diagram.tables.length === 0 && (
                <p className="col-span-full text-center text-sm text-muted-foreground">
                  No tables yet. Click "Add Table" to create one.
                </p>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Select or create a diagram to get started.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Side panel: Table Editor */}
      {showTableEditor && selectedTable && (
        <div className="w-96 shrink-0">
          <TableEditor
            table={selectedTable}
            onChange={handleTableChange}
            onClose={() => {
              setShowTableEditor(false);
              setSelectedTableId(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
