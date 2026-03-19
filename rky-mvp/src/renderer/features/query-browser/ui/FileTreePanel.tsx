import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Search,
  FolderOpen,
  Folder,
  FileCode,
  Package,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Plus,
  Pencil,
  Trash2,
  FolderInput,
  GripVertical,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FolderItem {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
}

interface TreeItem {
  id: string;
  name: string;
  folderId: string | null;
  sortOrder: number;
}

export interface FileTreePanelProps {
  folders: FolderItem[];
  items: TreeItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateFolder: (parentId: string | null) => void;
  onCreateItem: (folderId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onRenameItem: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onDeleteItem: (id: string) => Promise<{
    success: boolean;
    referencedCollections?: { id: string; name: string }[];
  }>;
  onMove: (items: { id: string; folderId?: string | null; sortOrder: number }[]) => void;
  onMoveFolder?: (folderId: string, newParentId: string | null) => void;
  searchPlaceholder?: string;
  createItemLabel?: string;
  itemIcon?: 'query' | 'collection';
}

/* ------------------------------------------------------------------ */
/*  Tree building                                                      */
/* ------------------------------------------------------------------ */

interface FolderNode {
  folder: FolderItem;
  children: FolderNode[];
  items: TreeItem[];
}

function buildTree(folders: FolderItem[], items: TreeItem[]) {
  const folderMap = new Map<string, FolderNode>();
  for (const f of folders) {
    folderMap.set(f.id, { folder: f, children: [], items: [] });
  }

  const rootFolders: FolderNode[] = [];
  for (const f of folders) {
    const node = folderMap.get(f.id)!;
    if (f.parentId && folderMap.has(f.parentId)) {
      folderMap.get(f.parentId)!.children.push(node);
    } else {
      rootFolders.push(node);
    }
  }

  for (const node of folderMap.values()) {
    node.children.sort((a, b) => a.folder.sortOrder - b.folder.sortOrder);
  }

  const rootItems: TreeItem[] = [];
  for (const item of items) {
    if (item.folderId && folderMap.has(item.folderId)) {
      folderMap.get(item.folderId)!.items.push(item);
    } else {
      rootItems.push(item);
    }
  }

  for (const node of folderMap.values()) {
    node.items.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  rootItems.sort((a, b) => a.sortOrder - b.sortOrder);
  rootFolders.sort((a, b) => a.folder.sortOrder - b.folder.sortOrder);

  return { rootFolders, rootItems, folderMap };
}

/* ------------------------------------------------------------------ */
/*  Context menu                                                       */
/* ------------------------------------------------------------------ */

interface ContextMenuState {
  x: number;
  y: number;
  type: 'folder' | 'item';
  id: string;
  name: string;
  parentFolderId: string | null;
}

/* ------------------------------------------------------------------ */
/*  Inline input                                                       */
/* ------------------------------------------------------------------ */

function InlineInput({
  value,
  onChange,
  onCommit,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit();
        if (e.key === 'Escape') onCancel();
      }}
      onClick={(e) => e.stopPropagation()}
      className="min-w-0 flex-1 rounded border border-border bg-background px-1 text-xs outline-none"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Draggable item (uses useSortable for drag handle)                  */
/* ------------------------------------------------------------------ */

function DraggableItem({
  item,
  depth,
  isSelected,
  isEditing,
  isDragActive,
  editValue,
  onEditChange,
  onEditCommit,
  onEditCancel,
  onSelect,
  onStartEdit,
  onContextMenu,
  Icon,
}: {
  item: TreeItem;
  depth: number;
  isSelected: boolean;
  isEditing: boolean;
  isDragActive: boolean;
  editValue: string;
  onEditChange: (v: string) => void;
  onEditCommit: () => void;
  onEditCancel: () => void;
  onSelect: (id: string) => void;
  onStartEdit: (id: string, name: string) => void;
  onContextMenu: (e: React.MouseEvent, item: TreeItem) => void;
  Icon: typeof FileCode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragActive ? 0.4 : 1,
    paddingLeft: `${8 + depth * 16}px`,
    paddingRight: '8px',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex w-full cursor-pointer items-center gap-1 py-1 text-xs transition-colors hover:bg-muted ${
        isSelected ? 'bg-primary/10 font-semibold text-primary' : ''
      }`}
      onClick={() => onSelect(item.id)}
      onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(item.id, item.name); }}
      onContextMenu={(e) => onContextMenu(e, item)}
      role="button"
      tabIndex={0}
    >
      <span {...attributes} {...listeners} className="cursor-grab opacity-0 group-hover:opacity-50">
        <GripVertical className="size-3" />
      </span>
      <Icon className="size-3 shrink-0 text-muted-foreground" />
      {isEditing ? (
        <InlineInput
          value={editValue}
          onChange={onEditChange}
          onCommit={onEditCommit}
          onCancel={onEditCancel}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate">{item.name}</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Folder drop target (uses useSortable to be recognized by DndContext)*/
/* ------------------------------------------------------------------ */

function DraggableFolder({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function FileTreePanel({
  folders,
  items,
  selectedId,
  onSelect,
  onCreateFolder,
  onCreateItem,
  onRenameFolder,
  onRenameItem,
  onDeleteFolder,
  onDeleteItem,
  onMove,
  onMoveFolder,
  searchPlaceholder = 'Filter...',
  createItemLabel = 'New Item',
  itemIcon = 'query',
}: FileTreePanelProps) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(folders.map((f) => f.id)));
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<'folder' | 'item' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteAlert, setDeleteAlert] = useState<{
    collections: { id: string; name: string }[];
  } | null>(null);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null | undefined>(undefined);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Expand new folders automatically
  const folderIds = folders.map((f) => f.id).join(',');
  useEffect(() => {
    setExpanded((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const f of folders) {
        if (!next.has(f.id)) { next.add(f.id); changed = true; }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderIds]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [contextMenu]);

  // Filter
  const filteredItems = useMemo(() => {
    if (!search) return items;
    const lower = search.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(lower));
  }, [items, search]);

  const filteredFolders = useMemo(() => {
    if (!search) return folders;
    const lower = search.toLowerCase();
    const folderIdsWithItems = new Set(filteredItems.map((i) => i.folderId).filter(Boolean));
    return folders.filter(
      (f) => f.name.toLowerCase().includes(lower) || folderIdsWithItems.has(f.id),
    );
  }, [folders, search, filteredItems]);

  const { rootFolders, rootItems } = useMemo(
    () => buildTree(filteredFolders, filteredItems),
    [filteredFolders, filteredItems],
  );

  /* -- Toggle folder expand ---------------------------------------- */
  const toggleFolder = useCallback((folderId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  /* -- Context menu handlers --------------------------------------- */
  const handleFolderContextMenu = useCallback(
    (e: React.MouseEvent, folder: FolderItem) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        type: 'folder',
        id: folder.id,
        name: folder.name,
        parentFolderId: folder.parentId,
      });
    },
    [],
  );

  const handleItemContextMenu = useCallback(
    (e: React.MouseEvent, item: TreeItem) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        type: 'item',
        id: item.id,
        name: item.name,
        parentFolderId: item.folderId,
      });
    },
    [],
  );

  /* -- Inline editing ---------------------------------------------- */
  const startEdit = useCallback((id: string, name: string, type: 'folder' | 'item') => {
    setEditingId(id);
    setEditingType(type);
    setEditValue(name);
    setContextMenu(null);
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingId || !editValue.trim()) {
      setEditingId(null);
      setEditingType(null);
      return;
    }
    if (editingType === 'folder') {
      onRenameFolder(editingId, editValue.trim());
    } else {
      onRenameItem(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditingType(null);
  }, [editingId, editingType, editValue, onRenameFolder, onRenameItem]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingType(null);
  }, []);

  /* -- Delete handler ---------------------------------------------- */
  const handleDelete = useCallback(async () => {
    if (!contextMenu) return;
    const { type, id } = contextMenu;
    setContextMenu(null);

    if (type === 'folder') {
      onDeleteFolder(id);
    } else {
      const res = await onDeleteItem(id);
      if (!res.success && res.referencedCollections?.length) {
        setDeleteAlert({ collections: res.referencedCollections });
      }
    }
  }, [contextMenu, onDeleteFolder, onDeleteItem]);

  /* -- Create inside folder --------------------------------------- */
  const handleCreateSubfolder = useCallback(() => {
    if (!contextMenu || contextMenu.type !== 'folder') return;
    const parentId = contextMenu.id;
    setContextMenu(null);
    // Ensure parent is expanded
    setExpanded((prev) => {
      if (prev.has(parentId)) return prev;
      const next = new Set(prev);
      next.add(parentId);
      return next;
    });
    onCreateFolder(parentId);
  }, [contextMenu, onCreateFolder]);

  const handleCreateItemInFolder = useCallback(() => {
    if (!contextMenu || contextMenu.type !== 'folder') return;
    const folderId = contextMenu.id;
    setContextMenu(null);
    setExpanded((prev) => {
      if (prev.has(folderId)) return prev;
      const next = new Set(prev);
      next.add(folderId);
      return next;
    });
    onCreateItem(folderId);
  }, [contextMenu, onCreateItem]);

  /* -- Move item to folder (via context menu) --------------------- */
  const handleMoveToFolder = useCallback(
    (targetFolderId: string | null) => {
      if (!contextMenu || contextMenu.type !== 'item') return;
      const itemId = contextMenu.id;
      setContextMenu(null);

      // Get siblings at target location to determine sort order
      const siblings = items.filter((i) => i.folderId === targetFolderId && i.id !== itemId);
      onMove([
        ...siblings.map((i, idx) => ({ id: i.id, folderId: targetFolderId, sortOrder: idx })),
        { id: itemId, folderId: targetFolderId, sortOrder: siblings.length },
      ]);
    },
    [contextMenu, items, onMove],
  );

  /* -- DnD handlers ------------------------------------------------ */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDragActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: any) => {
    const { over } = event;
    if (!over) { setDropTargetFolderId(undefined); return; }
    const overId = over.id as string;
    // Check if hovering over a folder
    const overFolder = folders.find((f) => f.id === overId);
    if (overFolder) {
      setDropTargetFolderId(overFolder.id);
      // Auto-expand folder on hover
      setExpanded((prev) => {
        if (prev.has(overFolder.id)) return prev;
        const next = new Set(prev);
        next.add(overFolder.id);
        return next;
      });
    } else {
      // Hovering over an item — target its parent folder
      const overItem = items.find((i) => i.id === overId);
      setDropTargetFolderId(overItem?.folderId ?? null);
    }
  }, [folders, items]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDragActiveId(null);
    setDropTargetFolderId(undefined);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeItem = items.find((i) => i.id === activeId);
    const activeFolder = folders.find((f) => f.id === activeId);
    const overFolder = folders.find((f) => f.id === overId);
    const overItem = items.find((i) => i.id === overId);

    if (activeFolder && onMoveFolder) {
      // Dragging a folder
      if (overFolder && overFolder.id !== activeFolder.parentId) {
        // Prevent dropping folder into itself or its children
        const isDescendant = (parentId: string, childId: string): boolean => {
          const child = folders.find((f) => f.id === childId);
          if (!child) return false;
          if (child.parentId === parentId) return true;
          if (child.parentId) return isDescendant(parentId, child.parentId);
          return false;
        };
        if (!isDescendant(activeFolder.id, overFolder.id) && activeFolder.id !== overFolder.id) {
          onMoveFolder(activeFolder.id, overFolder.id);
        }
      }
      return;
    }

    if (!activeItem) return;

    if (overFolder) {
      // Dropped item onto a folder → move item into it
      const folderItems = items
        .filter((i) => i.folderId === overFolder.id && i.id !== activeItem.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      onMove([
        ...folderItems.map((i, idx) => ({ id: i.id, folderId: overFolder.id, sortOrder: idx })),
        { id: activeItem.id, folderId: overFolder.id, sortOrder: folderItems.length },
      ]);
    } else if (overItem) {
      // Dropped onto another item → move to same folder, reorder
      const targetFolderId = overItem.folderId;
      const siblings = items
        .filter((i) => i.folderId === targetFolderId)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const withoutActive = siblings.filter((i) => i.id !== activeItem.id);
      const overIndex = withoutActive.findIndex((i) => i.id === overItem.id);
      const insertAt = overIndex >= 0 ? overIndex + 1 : withoutActive.length;

      const reordered = [...withoutActive];
      reordered.splice(insertAt, 0, activeItem);

      onMove(reordered.map((i, idx) => ({
        id: i.id,
        folderId: targetFolderId,
        sortOrder: idx,
      })));
    }
  }, [items, folders, onMove, onMoveFolder]);

  // All IDs for SortableContext (folders as drop targets + items as draggable)
  const allSortableIds = useMemo(() => {
    const ids: string[] = [];
    for (const f of folders) ids.push(f.id);
    for (const i of items) ids.push(i.id);
    return ids;
  }, [folders, items]);

  const dragItem = dragActiveId ? items.find((i) => i.id === dragActiveId) : null;
  const dragFolder = dragActiveId ? folders.find((f) => f.id === dragActiveId) : null;

  /* -- Render folder node recursively ------------------------------ */
  const ItemIcon = itemIcon === 'query' ? FileCode : Package;

  function renderFolderNode(node: FolderNode, depth: number) {
    const isExpanded = expanded.has(node.folder.id);
    const isFolderEditing = editingId === node.folder.id && editingType === 'folder';
    const isDropTarget = dropTargetFolderId === node.folder.id;

    return (
      <DraggableFolder key={node.folder.id} id={node.folder.id}>
        {/* Folder row */}
        <div
          className={`group flex w-full cursor-pointer items-center gap-1 py-1 text-xs transition-colors hover:bg-muted/50 ${
            isDropTarget ? 'bg-accent/30 ring-1 ring-accent' : ''
          }`}
          style={{ paddingLeft: `${4 + depth * 16}px`, paddingRight: '4px' }}
          onClick={() => toggleFolder(node.folder.id)}
          onContextMenu={(e) => handleFolderContextMenu(e, node.folder)}
          onDoubleClick={(e) => { e.stopPropagation(); startEdit(node.folder.id, node.folder.name, 'folder'); }}
          role="button"
          tabIndex={0}
        >
          {isExpanded ? (
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
          )}
          {isExpanded ? (
            <FolderOpen className="size-3 shrink-0 text-amber-500" />
          ) : (
            <Folder className="size-3 shrink-0 text-amber-500" />
          )}
          {isFolderEditing ? (
            <InlineInput
              value={editValue}
              onChange={setEditValue}
              onCommit={commitEdit}
              onCancel={cancelEdit}
            />
          ) : (
            <>
              <span className="min-w-0 flex-1 truncate font-medium">{node.folder.name}</span>
              <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100">
                {node.items.length + node.children.length}
              </span>
            </>
          )}
        </div>

        {/* Children */}
        {isExpanded && (
          <div>
            {node.children.map((child) => renderFolderNode(child, depth + 1))}
            {node.items.map((item) => renderItemRow(item, depth + 1))}
          </div>
        )}
      </DraggableFolder>
    );
  }

  function renderItemRow(item: TreeItem, depth: number) {
    return (
      <DraggableItem
        key={item.id}
        item={item}
        depth={depth}
        isSelected={item.id === selectedId}
        isEditing={editingId === item.id && editingType === 'item'}
        isDragActive={dragActiveId === item.id}
        editValue={editValue}
        onEditChange={setEditValue}
        onEditCommit={commitEdit}
        onEditCancel={cancelEdit}
        onSelect={onSelect}
        onStartEdit={(id, name) => startEdit(id, name, 'item')}
        onContextMenu={handleItemContextMenu}
        Icon={ItemIcon}
      />
    );
  }

  /* -- Move-to submenu folders ------------------------------------ */
  const moveTargetFolders = useMemo(() => {
    if (!contextMenu || contextMenu.type !== 'item') return [];
    const currentFolderId = items.find((i) => i.id === contextMenu.id)?.folderId ?? null;
    const targets: { id: string | null; name: string }[] = [];

    // Add "Root" option if item is inside a folder
    if (currentFolderId !== null) {
      targets.push({ id: null, name: '(Root)' });
    }

    // Add all folders except current parent
    for (const f of folders) {
      if (f.id !== currentFolderId) {
        targets.push({ id: f.id, name: f.name });
      }
    }
    return targets;
  }, [contextMenu, items, folders]);

  return (
    <div className="flex h-full w-[220px] shrink-0 flex-col border-r border-border bg-background">
      {/* Header with create buttons */}
      <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {itemIcon === 'query' ? 'Queries' : 'Collections'}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="New Folder"
            onClick={() => onCreateFolder(null)}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <FolderPlus className="size-3.5" />
          </button>
          <button
            type="button"
            title={createItemLabel}
            onClick={() => onCreateItem(null)}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-border px-2 py-1.5">
        <div className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
          <Search className="size-3 text-muted-foreground" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 && filteredFolders.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">
            {items.length === 0 && folders.length === 0 ? 'No items yet.' : 'No matches.'}
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={allSortableIds}>
              <div className="py-1">
                {rootFolders.map((node) => renderFolderNode(node, 0))}
                {rootItems.map((item) => renderItemRow(item, 0))}
              </div>
            </SortableContext>
            <DragOverlay>
              {dragItem ? (
                <div className="flex items-center gap-1 rounded bg-background px-2 py-1 text-xs shadow-md border border-border">
                  <ItemIcon className="size-3 text-muted-foreground" />
                  <span className="truncate">{dragItem.name}</span>
                </div>
              ) : dragFolder ? (
                <div className="flex items-center gap-1 rounded bg-background px-2 py-1 text-xs shadow-md border border-border">
                  <Folder className="size-3 text-amber-500" />
                  <span className="truncate font-medium">{dragFolder.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-md border border-border bg-popover p-1 shadow-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Rename */}
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
            onClick={() => startEdit(contextMenu.id, contextMenu.name, contextMenu.type)}
          >
            <Pencil className="size-3" />
            Rename
          </button>

          {/* Folder-specific: create subfolder and item inside */}
          {contextMenu.type === 'folder' && (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
                onClick={handleCreateSubfolder}
              >
                <FolderPlus className="size-3" />
                New Subfolder
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
                onClick={handleCreateItemInFolder}
              >
                <Plus className="size-3" />
                New {itemIcon === 'query' ? 'Query' : 'Collection'} Here
              </button>
            </>
          )}

          {/* Item-specific: move to folder */}
          {contextMenu.type === 'item' && moveTargetFolders.length > 0 && (
            <div className="border-t border-border pt-1 mt-1">
              <span className="flex items-center gap-2 px-2 py-1 text-[10px] text-muted-foreground">
                <FolderInput className="size-3" />
                Move to...
              </span>
              {moveTargetFolders.map((target) => (
                <button
                  key={target.id ?? '__root__'}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-4 py-1 text-xs hover:bg-accent"
                  onClick={() => handleMoveToFolder(target.id)}
                >
                  {target.id ? <Folder className="size-3 text-amber-500" /> : <span className="size-3" />}
                  {target.name}
                </button>
              ))}
            </div>
          )}

          {/* Divider + Delete */}
          <div className="border-t border-border pt-1 mt-1">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-destructive hover:bg-accent"
              onClick={handleDelete}
            >
              <Trash2 className="size-3" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Delete alert for referenced collections */}
      {deleteAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-80 rounded-lg border border-border bg-background p-4 shadow-lg">
            <h3 className="mb-2 text-sm font-semibold">Cannot Delete</h3>
            <p className="mb-2 text-xs text-muted-foreground">
              This query is referenced by the following collections:
            </p>
            <ul className="mb-3 list-inside list-disc text-xs">
              {deleteAlert.collections.map((c) => (
                <li key={c.id}>{c.name}</li>
              ))}
            </ul>
            <button
              type="button"
              className="w-full rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
              onClick={() => setDeleteAlert(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
