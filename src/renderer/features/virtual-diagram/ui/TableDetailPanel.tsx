import { useState } from 'react';
import { Plus, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import type { ITable, IColumn } from '@/entities/table';
import { ColumnEditor } from './ColumnEditor';

interface TableDetailPanelProps {
  table: ITable;
  allTables: ITable[];
  onChange: (updated: ITable) => void;
  onDelete: () => void;
  onClose: () => void;
}

function createEmptyColumn(ordinalPosition: number): IColumn {
  return {
    id: `col-${Date.now()}-${ordinalPosition}`,
    name: '',
    dataType: 'VARCHAR(255)',
    keyType: null,
    defaultValue: null,
    nullable: true,
    comment: '',
    reference: null,
    constraints: [],
    ordinalPosition,
  };
}

export function TableDetailPanel({
  table,
  allTables,
  onChange,
  onDelete,
  onClose,
}: TableDetailPanelProps) {
  const [isColumnsOpen, setIsColumnsOpen] = useState(true);
  const [isConstraintsOpen, setIsConstraintsOpen] = useState(true);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);

  function handleNameChange(name: string) {
    onChange({ ...table, name });
  }

  function handleCommentChange(comment: string) {
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

  function handleDelete() {
    if (isDeleteConfirm) {
      onDelete();
      setIsDeleteConfirm(false);
    } else {
      setIsDeleteConfirm(true);
    }
  }

  return (
    <div className="flex h-full w-[320px] shrink-0 flex-col border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-xs font-semibold">Table Detail</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {/* Table Name */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Table Name
          </label>
          <Input
            className="h-8 text-sm font-semibold"
            value={table.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Table name"
          />
        </div>

        {/* Comment */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Comment
          </label>
          <Input
            className="h-8 text-xs"
            value={table.comment}
            onChange={(e) => handleCommentChange(e.target.value)}
            placeholder="Table description..."
          />
        </div>

        {/* Columns Section */}
        <div>
          <button
            type="button"
            onClick={() => setIsColumnsOpen(!isColumnsOpen)}
            className="flex w-full items-center gap-1 py-1"
          >
            {isColumnsOpen ? (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Columns ({table.columns.length})
            </span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                handleAddColumn();
              }}
            >
              <Plus className="size-3" />
            </Button>
          </button>

          {isColumnsOpen && (
            <div className="space-y-1.5 pt-1">
              {table.columns.map((col, index) => (
                <ColumnEditor
                  key={col.id}
                  column={col}
                  onChange={(updated) => handleColumnChange(index, updated)}
                  onRemove={() => handleColumnRemove(index)}
                />
              ))}
              {table.columns.length === 0 && (
                <p className="text-xs text-muted-foreground">No columns. Click + to add.</p>
              )}
            </div>
          )}
        </div>

        {/* Constraints Section */}
        {table.constraints.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setIsConstraintsOpen(!isConstraintsOpen)}
              className="flex w-full items-center gap-1 py-1"
            >
              {isConstraintsOpen ? (
                <ChevronDown className="size-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-3.5 text-muted-foreground" />
              )}
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Constraints ({table.constraints.length})
              </span>
            </button>

            {isConstraintsOpen && (
              <div className="space-y-1 pt-1">
                {table.constraints.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center gap-2 rounded border border-border px-2 py-1 text-xs"
                  >
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                      {c.type}
                    </span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-muted-foreground">{c.columns.join(', ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-border px-3 py-2">
        {isDeleteConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-destructive">Delete this table?</span>
            <Button variant="destructive" size="xs" onClick={handleDelete}>
              Confirm
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setIsDeleteConfirm(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="size-3.5" />
            Delete Table
          </Button>
        )}
      </div>
    </div>
  );
}
