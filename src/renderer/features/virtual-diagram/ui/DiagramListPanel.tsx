import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Pencil, Trash2, Check, X, ChevronRight, ChevronDown, History, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/shared/components/ui/button';
import type { IDiagram, IDiagramVersion } from '~/shared/types/db';

interface DiagramListPanelProps {
  diagrams: IDiagram[];
  selectedDiagramId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: (diagram: IDiagram) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onReorderDiagrams?: (orderedIds: string[]) => void;
  // Version tree
  versions?: IDiagramVersion[];
  activeVersionId?: string | null;
  onVersionSelect?: (version: IDiagramVersion) => void;
  onReorderVersions?: (orderedIds: string[]) => void;
}

function SortableVersionTreeItem({
  version,
  isActive,
  onSelect,
}: {
  version: IDiagramVersion;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: version.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex w-full items-center rounded-md text-[11px] transition-colors hover:bg-accent ${
        isActive ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground'
      }`}
    >
      <span
        {...attributes}
        {...listeners}
        className="flex shrink-0 cursor-grab items-center px-0.5 text-muted-foreground/30 hover:text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-2.5" />
      </span>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center py-1 pr-1"
      >
        <History className="mr-1 size-2.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{version.name || `#${version.versionNumber}`}</span>
        <span className="w-5 shrink-0 text-right text-[9px]">
          {version.schemaSnapshot?.tables?.length ?? 0}t
        </span>
      </button>
    </div>
  );
}

function SortableDiagramItem({
  diagram,
  isSelected,
  isDeleting,
  isExpanded,
  activeVersionId,
  versions,
  children,
  onSelect,
  onEdit,
  onStartDelete,
  onConfirmDelete,
  onCancelDelete,
  onToggleExpand,
}: {
  diagram: IDiagram;
  isSelected: boolean;
  isDeleting: boolean;
  isExpanded: boolean;
  activeVersionId?: string | null;
  versions: IDiagramVersion[];
  children?: React.ReactNode;
  onSelect: () => void;
  onEdit: () => void;
  onStartDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onToggleExpand: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: diagram.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  if (isDeleting) {
    return (
      <div ref={setNodeRef} style={style}>
        <div className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1.5">
          <span className="flex-1 truncate text-xs text-destructive">
            Delete &quot;{diagram.name}&quot;?
          </span>
          <Button variant="ghost" size="xs" onClick={onConfirmDelete}>
            <Check className="size-3 text-destructive" />
          </Button>
          <Button variant="ghost" size="xs" onClick={onCancelDelete}>
            <X className="size-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`group flex w-full items-center rounded-md text-left text-xs transition-colors hover:bg-accent ${
          isSelected ? 'bg-primary/10 font-semibold text-primary' : ''
        }`}
      >
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          className="flex shrink-0 cursor-grab items-center px-0.5 text-muted-foreground/30 hover:text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-3" />
        </span>
        {/* Tree expand toggle */}
        <button
          type="button"
          className="shrink-0 rounded p-0.5 hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
        >
          {isExpanded ? (
            <ChevronDown className="size-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3 text-muted-foreground" />
          )}
        </button>
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center py-1.5 pr-1"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{diagram.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {(() => {
                if (isSelected && activeVersionId) {
                  const av = versions.find((v) => v.id === activeVersionId);
                  if (av) return `${av.name || `#${av.versionNumber}`} · ${av.schemaSnapshot?.tables?.length ?? 0} tables`;
                }
                return `${diagram.tables.length} tables`;
              })()}
            </p>
          </div>
        </button>
        <div className="mr-1 flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="rounded p-0.5 hover:bg-muted"
            title="Edit"
          >
            <Pencil className="size-2.5 text-muted-foreground" />
          </span>
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onStartDelete(); }}
            className="rounded p-0.5 hover:bg-destructive/10"
            title="Delete"
          >
            <Trash2 className="size-2.5 text-destructive" />
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

function DiagramDragOverlay({ diagram }: { diagram: IDiagram }) {
  return (
    <div className="flex w-48 items-center rounded-md border border-border bg-background px-2 py-1.5 text-xs shadow-lg rotate-1">
      <GripVertical className="mr-1 size-3 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate font-medium">{diagram.name}</span>
      <span className="w-8 shrink-0 text-right text-[10px] text-muted-foreground">
        {diagram.tables.length}t
      </span>
    </div>
  );
}

export function DiagramListPanel({
  diagrams,
  selectedDiagramId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onReorderDiagrams,
  versions = [],
  activeVersionId,
  onVersionSelect,
  onReorderVersions,
}: DiagramListPanelProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedDiagramId, setExpandedDiagramId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function confirmDelete(id: string) {
    onDelete(id);
    setDeletingId(null);
  }

  function handleDiagramDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = diagrams.findIndex((d) => d.id === active.id);
    const newIndex = diagrams.findIndex((d) => d.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(diagrams, oldIndex, newIndex);
    onReorderDiagrams?.(reordered.map((d) => d.id));
  }

  function handleVersionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = versions.findIndex((v) => v.id === active.id);
    const newIndex = versions.findIndex((v) => v.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(versions, oldIndex, newIndex);
    onReorderVersions?.(reordered.map((v) => v.id));
  }

  const draggedDiagram = activeDragId ? diagrams.find((d) => d.id === activeDragId) : null;

  return (
    <div className="flex h-full w-[200px] shrink-0 flex-col border-r border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-xs font-semibold">Diagrams</h3>
        <Button variant="ghost" size="xs" onClick={onCreate} title="New diagram">
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* Diagram list */}
      <div className="flex-1 overflow-y-auto p-1">
        {diagrams.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            No diagrams yet. Click + to create one.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(e) => setActiveDragId(String(e.active.id))}
            onDragEnd={handleDiagramDragEnd}
          >
            <SortableContext items={diagrams.map((d) => d.id)} strategy={verticalListSortingStrategy}>
              {diagrams.map((d) => (
                <SortableDiagramItem
                  key={d.id}
                  diagram={d}
                  isSelected={selectedDiagramId === d.id}
                  isDeleting={deletingId === d.id}
                  isExpanded={expandedDiagramId === d.id}
                  activeVersionId={activeVersionId}
                  versions={versions}
                  onSelect={() => onSelect(d.id)}
                  onEdit={() => onEdit(d)}
                  onStartDelete={() => setDeletingId(d.id)}
                  onConfirmDelete={() => confirmDelete(d.id)}
                  onCancelDelete={() => setDeletingId(null)}
                  onToggleExpand={() => setExpandedDiagramId(expandedDiagramId === d.id ? null : d.id)}
                >
                  {/* Version tree (expanded) with dnd-kit sortable */}
                  {expandedDiagramId === d.id && selectedDiagramId === d.id && (
                    <div className="ml-4 border-l border-border pl-1">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleVersionDragEnd}
                      >
                        <SortableContext items={versions.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                          {versions.map((v) => (
                            <SortableVersionTreeItem
                              key={v.id}
                              version={v}
                              isActive={activeVersionId === v.id}
                              onSelect={() => onVersionSelect?.(v)}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}
                </SortableDiagramItem>
              ))}
            </SortableContext>
            {createPortal(
              <DragOverlay>
                {draggedDiagram ? <DiagramDragOverlay diagram={draggedDiagram} /> : null}
              </DragOverlay>,
              document.body,
            )}
          </DndContext>
        )}
      </div>
    </div>
  );
}
