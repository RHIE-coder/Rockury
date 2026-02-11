import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Table2, Eye, EyeOff, Trash2, Check, X, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/shared/components/ui/button';
import type { ITable, ISearchResult } from '~/shared/types/db';

interface TableListPanelProps {
  tables: ITable[];
  selectedTableId: string | null;
  searchResults: ISearchResult[];
  onTableSelect: (tableId: string) => void;
  onClose: () => void;
  hiddenTableIds?: string[];
  onToggleVisibility?: (tableId: string) => void;
  onShowAll?: () => void;
  onTableDelete?: (tableId: string) => void;
  onReorderTables?: (orderedTables: ITable[]) => void;
}

function SortableTableItem({
  table,
  isSelected,
  isMatched,
  isHidden,
  isDeleting,
  onSelect,
  onStartDelete,
  onConfirmDelete,
  onCancelDelete,
  onToggleVisibility,
  hasVisibilityAction,
  itemRef,
}: {
  table: ITable;
  isSelected: boolean;
  isMatched: boolean;
  isHidden: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onStartDelete?: () => void;
  onConfirmDelete?: () => void;
  onCancelDelete?: () => void;
  onToggleVisibility?: () => void;
  hasVisibilityAction: boolean;
  itemRef: (el: HTMLButtonElement | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: table.id });
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  if (isDeleting) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1.5 mx-1"
      >
        <span className="min-w-0 flex-1 truncate text-xs text-destructive">
          Delete &quot;{table.name}&quot;?
        </span>
        <button
          type="button"
          onClick={onConfirmDelete}
          className="shrink-0 rounded p-0.5 hover:bg-destructive/20"
        >
          <Check className="size-3 text-destructive" />
        </button>
        <button
          type="button"
          onClick={onCancelDelete}
          className="shrink-0 rounded p-0.5 hover:bg-muted"
        >
          <X className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="group flex items-center"
      >
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          className="flex shrink-0 cursor-grab items-center px-0.5 text-muted-foreground/30 hover:text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-3" />
        </span>
        <button
          ref={itemRef}
          type="button"
          onClick={onSelect}
          onMouseEnter={(e) => setHoverRect(e.currentTarget.getBoundingClientRect())}
          onMouseLeave={() => setHoverRect(null)}
          className={`flex min-w-0 flex-1 items-center gap-1 py-1.5 pr-1 text-left text-xs transition-colors hover:bg-muted ${
            isSelected ? 'bg-primary/10 font-semibold text-primary' : ''
          } ${isMatched ? 'ring-1 ring-inset ring-yellow-400' : ''} ${
            isHidden ? 'opacity-50' : ''
          }`}
        >
          <span className={`min-w-0 flex-1 truncate ${isHidden ? 'line-through' : ''}`}>
            {table.name}
          </span>
          <span className="w-5 shrink-0 text-right text-[10px] text-muted-foreground">
            {table.columns.length}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
          {onStartDelete && (
            <button
              type="button"
              onClick={onStartDelete}
              className="shrink-0 px-1 py-1.5 text-muted-foreground hover:text-destructive"
              title="Delete table"
            >
              <Trash2 className="size-3" />
            </button>
          )}
          {hasVisibilityAction && onToggleVisibility && (
            <button
              type="button"
              onClick={onToggleVisibility}
              className="shrink-0 px-1 py-1.5 text-muted-foreground hover:text-foreground"
              title={isHidden ? 'Show table' : 'Hide table'}
            >
              {isHidden ? (
                <EyeOff className="size-3" />
              ) : (
                <Eye className="size-3" />
              )}
            </button>
          )}
        </div>
      </div>
      {hoverRect && !isDragging && createPortal(
        <div
          className="pointer-events-none fixed z-[9999] rounded border border-border bg-popover px-2 py-1.5 shadow-lg"
          style={{ left: hoverRect.left, top: hoverRect.top }}
        >
          <p className="whitespace-nowrap text-xs font-medium">{table.name}</p>
          <p className="whitespace-nowrap text-[10px] text-muted-foreground">
            {table.columns.length} columns{table.comment ? ` · ${table.comment}` : ''}
          </p>
        </div>,
        document.body,
      )}
    </>
  );
}

function TableDragOverlay({ table }: { table: ITable }) {
  return (
    <div className="flex w-44 items-center rounded-md border border-border bg-background px-2 py-1.5 text-xs shadow-lg rotate-1">
      <GripVertical className="mr-1 size-3 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate font-medium">{table.name}</span>
      <span className="w-5 shrink-0 text-right text-[10px] text-muted-foreground">
        {table.columns.length}
      </span>
    </div>
  );
}

export function TableListPanel({
  tables,
  selectedTableId,
  searchResults,
  onTableSelect,
  onClose,
  hiddenTableIds = [],
  onToggleVisibility,
  onShowAll,
  onTableDelete,
  onReorderTables,
}: TableListPanelProps) {
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const matchedTableIds = new Set(
    searchResults.filter((r) => r.type === 'table').map((r) => r.tableId),
  );
  const hiddenSet = new Set(hiddenTableIds);
  const hasHidden = hiddenTableIds.length > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    if (selectedTableId && itemRefs.current[selectedTableId]) {
      itemRefs.current[selectedTableId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedTableId]);

  function confirmDelete(tableId: string) {
    onTableDelete?.(tableId);
    setDeletingId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = tables.findIndex((t) => t.id === active.id);
    const newIndex = tables.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(tables, oldIndex, newIndex);
    onReorderTables?.(reordered);
  }

  const draggedTable = activeDragId ? tables.find((t) => t.id === activeDragId) : null;

  return (
    <div className="flex h-full w-[200px] shrink-0 flex-col border-r border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Table2 className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Tables ({tables.length})</span>
        </div>
        <div className="flex items-center gap-0.5">
          {hasHidden && onShowAll && (
            <Button variant="ghost" size="xs" onClick={onShowAll} title="Show all tables">
              <Eye className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Table list */}
      <div className="flex-1 overflow-y-auto">
        {tables.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">No tables yet.</p>
        ) : (
          <div className="py-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(e) => setActiveDragId(String(e.active.id))}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={tables.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {tables.map((table) => (
                  <SortableTableItem
                    key={table.id}
                    table={table}
                    isSelected={table.id === selectedTableId}
                    isMatched={matchedTableIds.has(table.id)}
                    isHidden={hiddenSet.has(table.id)}
                    isDeleting={deletingId === table.id}
                    onSelect={() => onTableSelect(table.id)}
                    onStartDelete={onTableDelete ? () => setDeletingId(table.id) : undefined}
                    onConfirmDelete={() => confirmDelete(table.id)}
                    onCancelDelete={() => setDeletingId(null)}
                    onToggleVisibility={onToggleVisibility ? () => onToggleVisibility(table.id) : undefined}
                    hasVisibilityAction={!!onToggleVisibility}
                    itemRef={(el) => { itemRefs.current[table.id] = el; }}
                  />
                ))}
              </SortableContext>
              {createPortal(
                <DragOverlay>
                  {draggedTable ? <TableDragOverlay table={draggedTable} /> : null}
                </DragOverlay>,
                document.body,
              )}
            </DndContext>
          </div>
        )}
      </div>
    </div>
  );
}
