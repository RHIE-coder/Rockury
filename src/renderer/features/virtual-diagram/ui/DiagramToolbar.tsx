import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderOpen, Table2, Save, Lock, LockOpen, Undo2, Redo2, Info, ChevronDown, Plus, Pencil, Trash2, Check, X, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/components/ui/popover';
import { Button } from '@/shared/components/ui/button';
import type { IDiagram, IDiagramVersion } from '~/shared/types/db';
import { useDiagramStore } from '../model/diagramStore';

interface DiagramToolbarProps {
  currentDiagram: IDiagram | undefined;
  // Save
  onSave?: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
  // Lock
  isDiagramLocked?: boolean;
  onToggleDiagramLock?: () => void;
  // Undo/Redo
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  // Description toggle
  isDescriptionVisible?: boolean;
  onToggleDescription?: () => void;
  // Edit diagram (open modal)
  onEditDiagram?: () => void;
  // Version dropdown
  versions?: IDiagramVersion[];
  activeVersionId?: string | null;
  onVersionSelect?: (version: IDiagramVersion) => void;
  onCreateVersion?: () => void;
  onRenameVersion?: (version: IDiagramVersion) => void;
  onDeleteVersion?: (version: IDiagramVersion) => void;
  onReorderVersions?: (orderedIds: string[]) => void;
}

function SortableVersionItem({
  version,
  isCurrent,
  isDeleting,
  onSelect,
  onRename,
  onStartDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  version: IDiagramVersion;
  isCurrent: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onRename?: () => void;
  onStartDelete?: () => void;
  onConfirmDelete?: () => void;
  onCancelDelete?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: version.id });

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
        className="flex w-full items-center gap-1 rounded-md bg-destructive/10 px-2 py-1.5 text-xs"
      >
        <span className="flex-1 truncate text-destructive">
          Delete &quot;{version.name || `#${version.versionNumber}`}&quot;?
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onConfirmDelete?.(); }}
          className="rounded p-0.5 hover:bg-destructive/20"
        >
          <Check className="size-3 text-destructive" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCancelDelete?.(); }}
          className="rounded p-0.5 hover:bg-muted"
        >
          <X className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex w-full items-center rounded-md text-left text-xs transition-colors hover:bg-accent ${
        isCurrent ? 'bg-primary/10 font-semibold text-primary' : ''
      }`}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        className="flex shrink-0 cursor-grab items-center px-1 text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-3" />
      </span>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center py-1.5 pr-1"
      >
        <span className="min-w-0 flex-1 truncate">
          {version.name || `#${version.versionNumber}`}
        </span>
        <span className="w-8 shrink-0 text-right text-[10px] text-muted-foreground">
          {version.schemaSnapshot?.tables?.length ?? 0}t
        </span>
      </button>
      <div className="mr-1 flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
        {onRename && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onRename(); }}
            className="rounded p-0.5 hover:bg-muted"
            title="Rename"
          >
            <Pencil className="size-2.5 text-muted-foreground" />
          </span>
        )}
        {onStartDelete && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onStartDelete(); }}
            className="rounded p-0.5 hover:bg-destructive/10"
            title="Delete"
          >
            <Trash2 className="size-2.5 text-destructive" />
          </span>
        )}
      </div>
    </div>
  );
}

function VersionDragOverlay({ version }: { version: IDiagramVersion }) {
  return (
    <div className="flex w-56 items-center rounded-md border border-border bg-background px-2 py-1.5 text-xs shadow-lg rotate-1">
      <GripVertical className="mr-1 size-3 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate font-medium">
        {version.name || `#${version.versionNumber}`}
      </span>
      <span className="w-8 shrink-0 text-right text-[10px] text-muted-foreground">
        {version.schemaSnapshot?.tables?.length ?? 0}t
      </span>
    </div>
  );
}


export function DiagramToolbar({
  currentDiagram,
  // Save
  onSave,
  isDirty = false,
  isSaving = false,
  // Lock
  isDiagramLocked = false,
  onToggleDiagramLock,
  // Undo/Redo
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  // Description toggle
  isDescriptionVisible = false,
  onToggleDescription,
  // Edit diagram
  onEditDiagram,
  // Version dropdown
  versions = [],
  activeVersionId,
  onVersionSelect,
  onCreateVersion,
  onRenameVersion,
  onDeleteVersion,
  onReorderVersions,
}: DiagramToolbarProps) {
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const {
    isLeftPanelOpen,
    toggleLeftPanel,
    leftPanelView,
    setLeftPanelView,
  } = useDiagramStore();

  const activeVersion = versions.find((v) => v.id === activeVersionId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = versions.findIndex((v) => v.id === active.id);
    const newIndex = versions.findIndex((v) => v.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(versions, oldIndex, newIndex);
    onReorderVersions?.(reordered.map((v) => v.id));
  }

  function handlePanelSwitch(view: 'diagrams' | 'tables') {
    if (leftPanelView === view && isLeftPanelOpen) {
      toggleLeftPanel();
    } else {
      setLeftPanelView(view);
      if (!isLeftPanelOpen) toggleLeftPanel();
    }
  }

  const draggedVersion = activeId ? versions.find((v) => v.id === activeId) : null;

  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
      {/* Panel switch icons */}
      <div className="flex items-center gap-0.5 rounded-md border border-border px-0.5">
        <Button
          variant={leftPanelView === 'diagrams' && isLeftPanelOpen ? 'default' : 'ghost'}
          size="xs"
          className={leftPanelView === 'diagrams' && isLeftPanelOpen ? '' : 'text-muted-foreground/60'}
          onClick={() => handlePanelSwitch('diagrams')}
          title="Diagram list"
        >
          <FolderOpen className="size-3.5" />
        </Button>
        <Button
          variant={leftPanelView === 'tables' && isLeftPanelOpen ? 'default' : 'ghost'}
          size="xs"
          className={leftPanelView === 'tables' && isLeftPanelOpen ? '' : 'text-muted-foreground/60'}
          onClick={() => handlePanelSwitch('tables')}
          title="Table list"
        >
          <Table2 className="size-3.5" />
        </Button>
      </div>

      {currentDiagram && (
        <>
          <div className="h-4 w-px bg-border" />

          {/* Diagram name (click to edit via modal) */}
          <button
            type="button"
            className={`group flex max-w-[250px] items-center gap-1 truncate text-sm font-semibold hover:text-primary ${isDirty ? 'text-orange-400' : ''}`}
            onClick={onEditDiagram}
            title="Edit diagram name & description"
          >
            {currentDiagram.name}
            {isDirty && <span className="text-orange-400">●</span>}
            <Pencil className="size-2.5 opacity-0 group-hover:opacity-60" />
          </button>

          {/* Lock button */}
          {onToggleDiagramLock && (
            isDiagramLocked ? (
              <Button
                variant="destructive"
                size="xs"
                onClick={onToggleDiagramLock}
                title="Unlock diagram (Ctrl+L)"
              >
                <Lock className="size-3.5" />
                Locked
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="xs"
                className="opacity-50"
                onClick={onToggleDiagramLock}
                title="Lock diagram (Ctrl+L)"
              >
                <LockOpen className="size-3.5" />
              </Button>
            )
          )}

          {/* Description toggle button */}
          {onToggleDescription && (
            <Button
              variant={isDescriptionVisible ? 'secondary' : 'ghost'}
              size="xs"
              onClick={onToggleDescription}
              title="Toggle description"
              className={isDescriptionVisible ? '' : 'opacity-50'}
            >
              <Info className="size-3.5" />
            </Button>
          )}

          {/* Version dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                title="Version history"
              >
                {activeVersion
                  ? (activeVersion.name || `#${activeVersion.versionNumber}`)
                  : `v${currentDiagram.version ?? '1.0.0'}`}
                <ChevronDown className="size-2.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64 p-1"
              align="start"
            >
              {/* Sortable Versions */}
              <div className="max-h-56 overflow-y-auto">
                {versions.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                    No saved versions yet.
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={(e) => setActiveId(String(e.active.id))}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={versions.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                      {versions.map((v) => (
                        <SortableVersionItem
                          key={v.id}
                          version={v}
                          isCurrent={activeVersionId === v.id}
                          isDeleting={deletingVersionId === v.id}
                          onSelect={() => onVersionSelect?.(v)}
                          onRename={onRenameVersion ? () => onRenameVersion(v) : undefined}
                          onStartDelete={onDeleteVersion ? () => setDeletingVersionId(v.id) : undefined}
                          onConfirmDelete={() => { onDeleteVersion?.(v); setDeletingVersionId(null); }}
                          onCancelDelete={() => setDeletingVersionId(null)}
                        />
                      ))}
                    </SortableContext>
                    {createPortal(
                      <DragOverlay>
                        {draggedVersion ? <VersionDragOverlay version={draggedVersion} /> : null}
                      </DragOverlay>,
                      document.body,
                    )}
                  </DndContext>
                )}
              </div>

              {/* Create version [+] button */}
              {onCreateVersion && (
                <button
                  type="button"
                  onClick={onCreateVersion}
                  className="flex w-full items-center gap-2 border-t border-border px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Plus className="size-3" />
                  <span>Save as new version</span>
                </button>
              )}
            </PopoverContent>
          </Popover>

          <div className="h-4 w-px bg-border" />

          {/* Undo/Redo/Save grouped */}
          <div className="flex items-center gap-0.5 rounded-md border border-border px-0.5">
            {onUndo && (
              <Button
                variant="ghost"
                size="xs"
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="size-3.5" />
              </Button>
            )}
            {onRedo && (
              <Button
                variant="ghost"
                size="xs"
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="size-3.5" />
              </Button>
            )}
            {onSave && (
              <>
                <div className="h-4 w-px bg-border" />
                <Button
                  variant={isDirty ? 'default' : 'ghost'}
                  size="xs"
                  onClick={onSave}
                  disabled={!isDirty || isSaving}
                  title="Save (Ctrl+S)"
                >
                  <Save className="size-3.5" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
