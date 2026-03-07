import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Pencil, Trash2, Check, X, ChevronRight, ChevronDown, GripVertical, Lock, ArrowRight, Copy } from 'lucide-react';
import { DndContext, closestCenter, pointerWithin, rectIntersection, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent, type DragOverEvent, type CollisionDetection, DragOverlay } from '@dnd-kit/core';
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
  // Per-version lock
  lockedVersionIds?: string[];
  // Cross-diagram DnD
  onMoveVersion?: (versionId: string, targetDiagramId: string) => void;
  onCopyVersion?: (versionId: string, targetDiagramId: string) => void;
  onDuplicateVersion?: (versionId: string) => void;
}

function SortableVersionTreeItem({
  version,
  isActive,
  isLocked,
  onSelect,
  onDuplicate,
}: {
  version: IDiagramVersion;
  isActive: boolean;
  isLocked: boolean;
  onSelect: () => void;
  onDuplicate?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `v-${version.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/ver flex w-full items-center rounded-md text-[11px] transition-colors hover:bg-accent ${
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
        <Lock className={`mr-1 size-2.5 shrink-0 ${isLocked ? 'text-amber-500' : 'invisible'}`} />
        <span className="min-w-0 flex-1 truncate">{version.name || `#${version.versionNumber}`}</span>
        <span className="w-5 shrink-0 text-right text-[9px] group-hover/ver:hidden">
          {version.schemaSnapshot?.tables?.length ?? 0}t
        </span>
      </button>
      {onDuplicate && (
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="mr-1 hidden shrink-0 rounded p-0.5 hover:bg-muted group-hover/ver:inline-flex"
          title="Duplicate version"
        >
          <Copy className="size-2.5 text-muted-foreground" />
        </span>
      )}
    </div>
  );
}

function SortableDiagramItem({
  diagram,
  isSelected,
  isDeleting,
  isExpanded,
  isDropTarget,
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
  isDropTarget: boolean;
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `d-${diagram.id}` });

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
        } ${isDropTarget ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}
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

function VersionDragOverlay({ version, isShiftHeld }: { version: IDiagramVersion; isShiftHeld: boolean }) {
  return (
    <div className="flex w-48 items-center rounded-md border border-border bg-background px-2 py-1 text-[11px] shadow-lg rotate-1">
      {isShiftHeld ? (
        <Copy className="mr-1 size-2.5 text-blue-500 shrink-0" />
      ) : (
        <ArrowRight className="mr-1 size-2.5 text-primary shrink-0" />
      )}
      <span className="min-w-0 flex-1 truncate">
        {isShiftHeld ? '+ ' : '→ '}{version.name || `#${version.versionNumber}`}
      </span>
    </div>
  );
}

// Custom collision detection:
// 1. Try pointerWithin first (precise)
// 2. Among matches, prefer version items over parent diagram (for same-diagram reorder)
// 3. If no pointerWithin match, fall back to rectIntersection then closestCenter
const createCrossContextCollision: (activeId: string | null) => CollisionDetection = (activeId) => (args) => {
  const isVersionDrag = activeId?.startsWith('v-');

  // Try pointerWithin first
  const pointerResults = pointerWithin(args);
  if (pointerResults.length > 0) {
    if (isVersionDrag) {
      // Prefer version items over diagram containers for same-diagram reorder
      const versionHit = pointerResults.find((r) => String(r.id).startsWith('v-'));
      if (versionHit) return [versionHit];
    }
    return [pointerResults[0]];
  }

  // Fallback: rectIntersection (more forgiving than pointerWithin)
  const rectResults = rectIntersection(args);
  if (rectResults.length > 0) {
    if (isVersionDrag) {
      // For cross-diagram drops, prefer diagram items
      const diagramHit = rectResults.find((r) => String(r.id).startsWith('d-'));
      if (diagramHit) return [diagramHit];
      const versionHit = rectResults.find((r) => String(r.id).startsWith('v-'));
      if (versionHit) return [versionHit];
    }
    return [rectResults[0]];
  }

  // Last resort: closestCenter
  return closestCenter(args);
};

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
  lockedVersionIds = [],
  onMoveVersion,
  onCopyVersion,
  onDuplicateVersion,
}: DiagramListPanelProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedDiagramId, setExpandedDiagramId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overDiagramId, setOverDiagramId] = useState<string | null>(null);
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  const isDraggingVersion = useRef(false);

  // Auto-expand when a diagram is selected
  useEffect(() => {
    if (selectedDiagramId) {
      setExpandedDiagramId(selectedDiagramId);
    }
  }, [selectedDiagramId]);

  // Listen for Shift key only during version drag
  useEffect(() => {
    if (!isDraggingVersion.current) return;
    const onKey = (e: KeyboardEvent) => setIsShiftHeld(e.shiftKey);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDragId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function confirmDelete(id: string) {
    onDelete(id);
    setDeletingId(null);
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setActiveDragId(id);
    if (id.startsWith('v-')) {
      isDraggingVersion.current = true;
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) {
      setOverDiagramId(null);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    // Only highlight diagram targets when dragging a version onto a different diagram
    if (activeId.startsWith('v-') && overId.startsWith('d-')) {
      const targetDiagramId = overId.slice(2);
      if (targetDiagramId !== selectedDiagramId) {
        setOverDiagramId(targetDiagramId);
        return;
      }
    }
    setOverDiagramId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const dragId = activeDragId;
    const shiftHeld = isShiftHeld;

    setActiveDragId(null);
    setOverDiagramId(null);
    setIsShiftHeld(false);
    isDraggingVersion.current = false;

    if (!over || !dragId) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Diagram reorder: d-* onto d-*
    if (activeId.startsWith('d-') && overId.startsWith('d-')) {
      if (activeId === overId) return;
      const oldIndex = diagrams.findIndex((d) => `d-${d.id}` === activeId);
      const newIndex = diagrams.findIndex((d) => `d-${d.id}` === overId);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(diagrams, oldIndex, newIndex);
      onReorderDiagrams?.(reordered.map((d) => d.id));
      return;
    }

    // Version reorder within same diagram: v-* onto v-*
    if (activeId.startsWith('v-') && overId.startsWith('v-')) {
      if (activeId === overId) return;
      const oldIndex = versions.findIndex((v) => `v-${v.id}` === activeId);
      const newIndex = versions.findIndex((v) => `v-${v.id}` === overId);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(versions, oldIndex, newIndex);
      onReorderVersions?.(reordered.map((v) => v.id));
      return;
    }

    // Cross-diagram: version (v-*) onto diagram (d-*)
    if (activeId.startsWith('v-') && overId.startsWith('d-')) {
      const versionId = activeId.slice(2);
      const targetDiagramId = overId.slice(2);
      if (targetDiagramId === selectedDiagramId) return; // Drop on own diagram = no-op

      if (shiftHeld) {
        onCopyVersion?.(versionId, targetDiagramId);
      } else {
        onMoveVersion?.(versionId, targetDiagramId);
      }
    }
  }

  // Find dragged items for overlay
  const draggedDiagram = activeDragId?.startsWith('d-')
    ? diagrams.find((d) => d.id === activeDragId.slice(2))
    : null;
  const draggedVersion = activeDragId?.startsWith('v-')
    ? versions.find((v) => v.id === activeDragId.slice(2))
    : null;

  // Build sorted item IDs for the single DndContext
  const diagramSortableIds = diagrams.map((d) => `d-${d.id}`);
  const versionSortableIds = versions.map((v) => `v-${v.id}`);

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
            collisionDetection={createCrossContextCollision(activeDragId)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={diagramSortableIds} strategy={verticalListSortingStrategy}>
              {diagrams.map((d) => (
                <SortableDiagramItem
                  key={d.id}
                  diagram={d}
                  isSelected={selectedDiagramId === d.id}
                  isDeleting={deletingId === d.id}
                  isExpanded={expandedDiagramId === d.id}
                  isDropTarget={overDiagramId === d.id}
                  activeVersionId={activeVersionId}
                  versions={versions}
                  onSelect={() => onSelect(d.id)}
                  onEdit={() => onEdit(d)}
                  onStartDelete={() => setDeletingId(d.id)}
                  onConfirmDelete={() => confirmDelete(d.id)}
                  onCancelDelete={() => setDeletingId(null)}
                  onToggleExpand={() => {
                    if (selectedDiagramId === d.id) return;
                    onSelect(d.id);
                  }}
                >
                  {/* Version tree: always visible for selected diagram */}
                  {selectedDiagramId === d.id && versions.length > 0 && (
                    <div className="ml-4 border-l border-border pl-1">
                      <SortableContext items={versionSortableIds} strategy={verticalListSortingStrategy}>
                        {versions.map((v) => (
                          <SortableVersionTreeItem
                            key={v.id}
                            version={v}
                            isActive={activeVersionId === v.id}
                            isLocked={lockedVersionIds.includes(v.id)}
                            onSelect={() => onVersionSelect?.(v)}
                            onDuplicate={onDuplicateVersion ? () => onDuplicateVersion(v.id) : undefined}
                          />
                        ))}
                      </SortableContext>
                    </div>
                  )}
                </SortableDiagramItem>
              ))}
            </SortableContext>
            {createPortal(
              <DragOverlay>
                {draggedDiagram ? <DiagramDragOverlay diagram={draggedDiagram} /> : null}
                {draggedVersion ? <VersionDragOverlay version={draggedVersion} isShiftHeld={isShiftHeld} /> : null}
              </DragOverlay>,
              document.body,
            )}
          </DndContext>
        )}
      </div>
    </div>
  );
}
