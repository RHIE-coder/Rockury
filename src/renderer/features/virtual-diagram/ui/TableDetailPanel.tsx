import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, X, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import type { ITable, IColumn, IDiagramVersion, IConstraint } from '~/shared/types/db';
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
  readOnly?: boolean;
  // Compare mode props
  rightPanelMode?: 'detail' | 'compare';
  onRightPanelModeChange?: (mode: 'detail' | 'compare') => void;
  compareVersions?: IDiagramVersion[];
  compareTargetVersionId?: string | null;
  onCompareTargetChange?: (id: string | null) => void;
  currentDiagramName?: string;
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

// --- Sortable Column Wrapper ---
function SortableColumnItem({
  column,
  index,
  allTables,
  onChange,
  onRemove,
  readOnly,
}: {
  column: IColumn;
  index: number;
  allTables: ITable[];
  onChange: (index: number, updated: IColumn) => void;
  onRemove: (index: number) => void;
  readOnly?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-0.5">
      {!readOnly && (
        <button
          type="button"
          className="mt-2.5 shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <ColumnEditor
          column={column}
          allTables={allTables}
          onChange={(updated) => onChange(index, updated)}
          onRemove={() => onRemove(index)}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

// --- Sortable Constraint Wrapper ---
function SortableConstraintItem({
  constraint,
  index,
  columns,
  allTables,
  onChange,
  onRemove,
  readOnly,
}: {
  constraint: IConstraint;
  index: number;
  columns: IColumn[];
  allTables: ITable[];
  onChange: (index: number, updated: IConstraint) => void;
  onRemove: (index: number) => void;
  readOnly?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `constraint-${index}-${constraint.name}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-0.5">
      {!readOnly && (
        <button
          type="button"
          className="mt-2.5 shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <ConstraintEditor
          constraint={constraint}
          columns={columns}
          allTables={allTables}
          onChange={(updated) => onChange(index, updated)}
          onRemove={() => onRemove(index)}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

export function TableDetailPanel({
  table,
  allTables,
  onChange,
  onDelete,
  onClose,
  color,
  onColorChange,
  readOnly,
  rightPanelMode = 'detail',
  onRightPanelModeChange,
  compareVersions,
  compareTargetVersionId,
  onCompareTargetChange,
  currentDiagramName,
}: TableDetailPanelProps) {
  const [isColumnsOpen, setIsColumnsOpen] = useState(true);
  const [isConstraintsOpen, setIsConstraintsOpen] = useState(true);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  const [activeColDragId, setActiveColDragId] = useState<string | null>(null);
  const [activeConDragId, setActiveConDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  function handleConstraintChange(index: number, updated: IConstraint) {
    const constraints = [...table.constraints];
    constraints[index] = updated;
    onChange({ ...table, constraints });
  }

  function handleConstraintRemove(index: number) {
    const constraints = table.constraints.filter((_, i) => i !== index);
    onChange({ ...table, constraints });
  }

  function handleAddConstraint() {
    const newConstraint: IConstraint = {
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

  // --- Column DnD ---
  function handleColDragStart(event: DragStartEvent) {
    setActiveColDragId(event.active.id as string);
  }

  function handleColDragEnd(event: DragEndEvent) {
    setActiveColDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = table.columns.findIndex((c) => c.id === active.id);
    const newIndex = table.columns.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(table.columns, oldIndex, newIndex).map((col, i) => ({
      ...col,
      ordinalPosition: i,
    }));
    onChange({ ...table, columns: reordered });
  }

  // --- Constraint DnD ---
  const constraintIds = useMemo(
    () => table.constraints.map((c, i) => `constraint-${i}-${c.name}`),
    [table.constraints],
  );

  function handleConDragStart(event: DragStartEvent) {
    setActiveConDragId(event.active.id as string);
  }

  function handleConDragEnd(event: DragEndEvent) {
    setActiveConDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = constraintIds.indexOf(active.id as string);
    const newIndex = constraintIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(table.constraints, oldIndex, newIndex);
    onChange({ ...table, constraints: reordered });
  }

  const hasCompareSupport = onRightPanelModeChange && compareVersions && onCompareTargetChange;

  // Find target table from selected version's schemaSnapshot
  const targetVersion = compareVersions?.find((v) => v.id === compareTargetVersionId);
  const targetTable = targetVersion?.schemaSnapshot?.tables?.find(
    (t) => t.name.toLowerCase() === table.name.toLowerCase(),
  ) ?? null;

  const activeColDrag = activeColDragId
    ? table.columns.find((c) => c.id === activeColDragId)
    : null;

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
              Compare with version
            </label>
            <Select
              className="h-8 text-xs"
              value={compareTargetVersionId ?? ''}
              onChange={(e) => onCompareTargetChange(e.target.value || null)}
            >
              <option value="">Select version...</option>
              {compareVersions.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </Select>
          </div>
          {compareTargetVersionId && targetVersion ? (
            <InlineDiffPanel
              sourceTable={table}
              targetTable={targetTable}
              sourceName={currentDiagramName ?? 'Current'}
              targetName={targetVersion.name}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Select a version to compare "{table.name}" against.
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
                readOnly={readOnly}
              />
            </div>

            {/* Color */}
            {onColorChange && !readOnly && (
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
                readOnly={readOnly}
              />
            </div>

            {/* Columns Section */}
            <div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsColumnsOpen(!isColumnsOpen)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsColumnsOpen(!isColumnsOpen); }}
                className="flex w-full cursor-pointer items-center gap-1 py-1"
              >
                {isColumnsOpen ? (
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                )}
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Columns ({table.columns.length})
                </span>
              </div>

              {isColumnsOpen && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleColDragStart}
                  onDragEnd={handleColDragEnd}
                >
                  <SortableContext
                    items={table.columns.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1.5 pt-1">
                      {table.columns.map((col, index) => (
                        <SortableColumnItem
                          key={col.id}
                          column={col}
                          index={index}
                          allTables={allTables}
                          onChange={handleColumnChange}
                          onRemove={handleColumnRemove}
                          readOnly={readOnly}
                        />
                      ))}
                      {table.columns.length === 0 && (
                        <p className="text-xs text-muted-foreground">No columns.</p>
                      )}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={handleAddColumn}
                          className="w-full rounded border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:bg-muted"
                        >
                          + Add Column
                        </button>
                      )}
                    </div>
                  </SortableContext>
                  {createPortal(
                    <DragOverlay>
                      {activeColDrag && (
                        <div className="rounded border border-primary/50 bg-card p-1.5 shadow-lg">
                          <span className="text-xs font-medium">{activeColDrag.name || 'Column'}</span>
                        </div>
                      )}
                    </DragOverlay>,
                    document.body,
                  )}
                </DndContext>
              )}
            </div>

            {/* Constraints Section */}
            <div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsConstraintsOpen(!isConstraintsOpen)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsConstraintsOpen(!isConstraintsOpen); }}
                className="flex w-full cursor-pointer items-center gap-1 py-1"
              >
                {isConstraintsOpen ? (
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                )}
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Constraints ({table.constraints.length})
                </span>
              </div>

              {isConstraintsOpen && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleConDragStart}
                  onDragEnd={handleConDragEnd}
                >
                  <SortableContext
                    items={constraintIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1.5 pt-1">
                      {table.constraints.map((c, index) => (
                        <SortableConstraintItem
                          key={`${c.name}-${index}`}
                          constraint={c}
                          index={index}
                          columns={table.columns}
                          allTables={allTables}
                          onChange={handleConstraintChange}
                          onRemove={handleConstraintRemove}
                          readOnly={readOnly}
                        />
                      ))}
                      {table.constraints.length === 0 && (
                        <p className="text-xs text-muted-foreground">No constraints.</p>
                      )}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={handleAddConstraint}
                          className="w-full rounded border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:bg-muted"
                        >
                          + Add Constraint
                        </button>
                      )}
                    </div>
                  </SortableContext>
                  {createPortal(
                    <DragOverlay>
                      {activeConDragId && (
                        <div className="rounded border border-primary/50 bg-card p-1.5 shadow-lg">
                          <span className="text-xs font-medium">Constraint</span>
                        </div>
                      )}
                    </DragOverlay>,
                    document.body,
                  )}
                </DndContext>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          {!readOnly && (
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
          )}
        </>
      )}
    </div>
  );
}
