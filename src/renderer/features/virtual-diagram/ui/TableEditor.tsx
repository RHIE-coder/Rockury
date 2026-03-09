import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import type { ITable, IColumn } from '@/entities/table';
import { ColumnEditor } from './ColumnEditor';

interface TableEditorProps {
  table: ITable;
  onChange: (updated: ITable) => void;
  onClose: () => void;
}

function createEmptyColumn(ordinalPosition: number): IColumn {
  return {
    id: `col-${Date.now()}-${ordinalPosition}`,
    name: '',
    dataType: 'VARCHAR(255)',
    keyTypes: [],
    defaultValue: null,
    nullable: true,
    comment: '',
    reference: null,
    constraints: [],
    ordinalPosition,
  };
}

export function TableEditor({ table, onChange, onClose }: TableEditorProps) {
  function handleTableNameChange(name: string) {
    onChange({ ...table, name });
  }

  function handleTableCommentChange(comment: string) {
    onChange({ ...table, comment });
  }

  function handleColumnChange(index: number, updated: IColumn) {
    const columns = [...table.columns];
    columns[index] = updated;
    onChange({ ...table, columns });
  }

  function handleColumnRemove(index: number) {
    const columns = table.columns.filter((_, i) => i !== index);
    onChange({ ...table, columns });
  }

  function handleAddColumn() {
    const columns = [...table.columns, createEmptyColumn(table.columns.length)];
    onChange({ ...table, columns });
  }

  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-border p-3">
        <h3 className="text-sm font-semibold">Edit Table</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Table Name</label>
          <Input
            value={table.name}
            onChange={(e) => handleTableNameChange(e.target.value)}
            placeholder="Table name"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Comment</label>
          <Input
            value={table.comment}
            onChange={(e) => handleTableCommentChange(e.target.value)}
            placeholder="Table comment"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">
              Columns ({table.columns.length})
            </label>
            <Button variant="ghost" size="xs" onClick={handleAddColumn}>
              <Plus className="size-3" />
              Add
            </Button>
          </div>

          <div className="space-y-1.5">
            {table.columns.map((col, index) => (
              <ColumnEditor
                key={col.id}
                column={col}
                onChange={(updated) => handleColumnChange(index, updated)}
                onRemove={() => handleColumnRemove(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
