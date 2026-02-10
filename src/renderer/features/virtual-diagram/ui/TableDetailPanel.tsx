import { useState } from 'react';
import { Plus, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import type { ITable, IColumn } from '@/entities/table';
import type { IDiagram } from '~/shared/types/db';
import { ColumnEditor } from './ColumnEditor';
import { ColorPicker } from './ColorPicker';
import { ConstraintEditor } from './ConstraintEditor';
import { InlineDiffPanel } from '@/features/diagram-diff/ui/InlineDiffPanel';

interface TableDetailPanelProps {
  table: ITable;
  allTables: ITable[];
  onChange: (updated: ITable) => void;
  onDelete: () => void;
  onClose: () => void;
  color?: string;
  onColorChange?: (color: string | null) => void;
  // Compare mode props
  rightPanelMode?: 'detail' | 'compare';
  onRightPanelModeChange?: (mode: 'detail' | 'compare') => void;
  compareDiagrams?: IDiagram[];
  compareTargetDiagramId?: string | null;
  onCompareTargetChange?: (id: string | null) => void;
  currentDiagramName?: string;
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
  color,
  onColorChange,
  rightPanelMode = 'detail',
  onRightPanelModeChange,
  compareDiagrams,
  compareTargetDiagramId,
  onCompareTargetChange,
  currentDiagramName,
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

  function handleConstraintChange(index: number, updated: import('~/shared/types/db').IConstraint) {
    const constraints = [...table.constraints];
    constraints[index] = updated;
    onChange({ ...table, constraints });
  }

  function handleConstraintRemove(index: number) {
    const constraints = table.constraints.filter((_, i) => i !== index);
    onChange({ ...table, constraints });
  }

  function handleAddConstraint() {
    const newConstraint: import('~/shared/types/db').IConstraint = {
      type: 'UK',
      name: `uk_${table.name}_${Date.now()}`,
      columns: [],
    };
    onChange({ ...table, constraints: [...table.constraints, newConstraint] });
  }

  function handleDelete() {
    if (isDeleteConfirm) {
      onDelete();
      setIsDeleteConfirm(false);
    } else {
      setIsDeleteConfirm(true);
    }
  }

  const hasCompareSupport = onRightPanelModeChange && compareDiagrams && onCompareTargetChange;

  const targetDiagram = compareDiagrams?.find((d) => d.id === compareTargetDiagramId);
  const targetTable = targetDiagram?.tables.find(
    (t) => t.name.toLowerCase() === table.name.toLowerCase(),
  ) ?? null;

  return (
    <div className="flex h-full w-[320px] shrink-0 flex-col border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        {hasCompareSupport ? (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onRightPanelModeChange('detail')}
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                rightPanelMode === 'detail'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Detail
            </button>
            <button
              type="button"
              onClick={() => onRightPanelModeChange('compare')}
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                rightPanelMode === 'compare'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Compare
            </button>
          </div>
        ) : (
          <h3 className="text-xs font-semibold">Table Detail</h3>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Content */}
      {rightPanelMode === 'compare' && hasCompareSupport ? (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-3 space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Compare with
            </label>
            <Select
              className="h-8 text-xs"
              value={compareTargetDiagramId ?? ''}
              onChange={(e) => onCompareTargetChange(e.target.value || null)}
            >
              <option value="">Select diagram...</option>
              {compareDiagrams.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>
          {compareTargetDiagramId && targetDiagram ? (
            <InlineDiffPanel
              sourceTable={table}
              targetTable={targetTable}
              sourceName={currentDiagramName ?? 'Current'}
              targetName={targetDiagram.name}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Select a diagram to compare "{table.name}" against.
            </p>
          )}
        </div>
      ) : (
        <>
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

            {/* Color */}
            {onColorChange && (
              <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Color
                </label>
                <ColorPicker value={color} onChange={onColorChange} />
              </div>
            )}

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
                      allTables={allTables}
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
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddConstraint();
                  }}
                >
                  <Plus className="size-3" />
                </Button>
              </button>

              {isConstraintsOpen && (
                <div className="space-y-1.5 pt-1">
                  {table.constraints.map((c, index) => (
                    <ConstraintEditor
                      key={`${c.name}-${index}`}
                      constraint={c}
                      columns={table.columns}
                      allTables={allTables}
                      onChange={(updated) => handleConstraintChange(index, updated)}
                      onRemove={() => handleConstraintRemove(index)}
                    />
                  ))}
                  {table.constraints.length === 0 && (
                    <p className="text-xs text-muted-foreground">No constraints. Click + to add.</p>
                  )}
                </div>
              )}
            </div>
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
        </>
      )}
    </div>
  );
}
