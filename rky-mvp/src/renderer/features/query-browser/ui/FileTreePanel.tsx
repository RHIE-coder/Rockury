import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
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

  // Sort children by sortOrder
  for (const node of folderMap.values()) {
    node.children.sort((a, b) => a.folder.sortOrder - b.folder.sortOrder);
  }

  // Distribute items to folders
  const rootItems: TreeItem[] = [];
  for (const item of items) {
    if (item.folderId && folderMap.has(item.folderId)) {
      folderMap.get(item.folderId)!.items.push(item);
    } else {
      rootItems.push(item);
    }
  }

  // Sort items inside each folder
  for (const node of folderMap.values()) {
    node.items.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  rootItems.sort((a, b) => a.sortOrder - b.sortOrder);
  rootFolders.sort((a, b) => a.folder.sortOrder - b.folder.sortOrder);

  return { rootFolders, rootItems, folderMap };
}

/** Flatten items into a sortable order for DnD */
function flattenItemIds(
  rootFolders: FolderNode[],
  rootItems: TreeItem[],
  expanded: Set<string>,
): string[] {
  const ids: string[] = [];

  function visitFolder(node: FolderNode) {
    if (expanded.has(node.folder.id)) {
      for (const child of node.children) visitFolder(child);
      for (const item of node.items) ids.push(item.id);
    }
  }

  for (const f of rootFolders) visitFolder(f);
  for (const item of rootItems) ids.push(item.id);
  return ids;
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
}

/* ------------------------------------------------------------------ */
/*  Sortable item                                                      */
/* ------------------------------------------------------------------ */

interface SortableItemRowProps {
  item: TreeItem;
  isSelected: boolean;
  depth: number;
  icon: 'query' | 'collection';
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, item: TreeItem) => void;
  editingId: string | null;
  editValue: string;
  onEditChange: (val: string) => void;
  onEditCommit: () => void;
  onEditCancel: () => void;
  onStartEdit: (id: string, name: string) => void;
}

function SortableItemRow({
  item,
  isSelected,
  depth,
  icon,
  onSelect,
  onContextMenu,
  editingId,
  editValue,
  onEditChange,
  onEditCommit,
  onEditCancel,
  onStartEdit,
}: SortableItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const Icon = icon === 'query' ? FileCode : Package;
  const isEditing = editingId === item.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex w-full cursor-pointer items-center gap-1 py-1 text-xs transition-colors hover:bg-muted ${
        isSelected ? 'bg-primary/10 font-semibold text-primary' : ''
      }`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item.id)}
      onDoubleClick={() => onStartEdit(item.id, item.name)}
      onContextMenu={(e) => onContextMenu(e, item)}
      style={{ ...style, paddingLeft: `${8 + depth * 12}px`, paddingRight: '8px' }}
    >
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
  const menuRef = useRef<HTMLDivElement>(null);

  // Expand new folders automatically
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const f of folders) {
        if (!next.has(f.id)) next.add(f.id);
      }
      return next;
    });
  }, [folders]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [contextMenu]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!search) return items;
    const lower = search.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(lower));
  }, [items, search]);

  const filteredFolders = useMemo(() => {
    if (!search) return folders;
    // Show folders that match or contain matching items
    const lower = search.toLowerCase();
    const folderIdsWithItems = new Set(filteredItems.map((i) => i.folderId).filter(Boolean));
    return folders.filter(
      (f) => f.name.toLowerCase().includes(lower) || folderIdsWithItems.has(f.id),
    );
  }, [folders, search, filteredItems]);

  const { rootFolders, rootItems, folderMap } = useMemo(
    () => buildTree(filteredFolders, filteredItems),
    [filteredFolders, filteredItems],
  );

  const sortableIds = useMemo(
    () => flattenItemIds(rootFolders, rootItems, expanded),
    [rootFolders, rootItems, expanded],
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
      setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', id: folder.id, name: folder.name });
    },
    [],
  );

  const handleItemContextMenu = useCallback(
    (e: React.MouseEvent, item: TreeItem) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, type: 'item', id: item.id, name: item.name });
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

  /* -- DnD handlers ------------------------------------------------ */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDragActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeItem = items.find((i) => i.id === active.id);
      if (!activeItem) return;

      // Determine target folder: if dropped over a folder row, move into it
      const overFolder = folders.find((f) => f.id === over.id);
      const overItem = items.find((i) => i.id === over.id);

      if (overFolder) {
        // Dropped onto a folder — move item into that folder
        const folderItems = items
          .filter((i) => i.folderId === overFolder.id && i.id !== active.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const movePayload = [
          ...folderItems.map((i, idx) => ({ id: i.id, folderId: overFolder.id, sortOrder: idx })),
          { id: activeItem.id, folderId: overFolder.id, sortOrder: folderItems.length },
        ];
        onMove(movePayload);
        return;
      }

      if (overItem) {
        // Reorder within same context
        const targetFolderId = overItem.folderId;
        const siblings = items
          .filter((i) => i.folderId === targetFolderId)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        const oldIndex = siblings.findIndex((i) => i.id === active.id);
        const newIndex = siblings.findIndex((i) => i.id === over.id);

        if (oldIndex === -1) {
          // Moving from different folder
          const newSiblings = [...siblings];
          const insertAt = newIndex >= 0 ? newIndex : newSiblings.length;
          newSiblings.splice(insertAt, 0, activeItem);
          const movePayload = newSiblings.map((i, idx) => ({
            id: i.id,
            folderId: targetFolderId,
            sortOrder: idx,
          }));
          onMove(movePayload);
        } else if (newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = arrayMove(siblings, oldIndex, newIndex);
          const movePayload = reordered.map((i, idx) => ({
            id: i.id,
            folderId: targetFolderId,
            sortOrder: idx,
          }));
          onMove(movePayload);
        }
      }
    },
    [items, folders, onMove],
  );

  /* -- Render folder node recursively ------------------------------ */
  function renderFolderNode(node: FolderNode, depth: number) {
    const isExpanded = expanded.has(node.folder.id);
    const isFolderEditing = editingId === node.folder.id && editingType === 'folder';

    return (
      <div key={node.folder.id}>
        <div
          className="flex w-full cursor-pointer items-center gap-1 py-1 text-xs transition-colors hover:bg-muted/50"
          style={{ paddingLeft: `${4 + depth * 12}px`, paddingRight: '4px' }}
          onClick={() => toggleFolder(node.folder.id)}
          onContextMenu={(e) => handleFolderContextMenu(e, node.folder)}
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
            <span className="min-w-0 flex-1 truncate font-medium">{node.folder.name}</span>
          )}
        </div>
        {isExpanded && (
          <div>
            {node.children.map((child) => renderFolderNode(child, depth + 1))}
            {node.items.map((item) => (
              <SortableItemRow
                key={item.id}
                item={item}
                isSelected={item.id === selectedId}
                depth={depth + 1}
                icon={itemIcon}
                onSelect={onSelect}
                onContextMenu={handleItemContextMenu}
                editingId={editingId}
                editValue={editValue}
                onEditChange={setEditValue}
                onEditCommit={commitEdit}
                onEditCancel={cancelEdit}
                onStartEdit={(id, name) => startEdit(id, name, 'item')}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const dragItem = dragActiveId ? items.find((i) => i.id === dragActiveId) : null;
  const DragIcon = itemIcon === 'query' ? FileCode : Package;

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
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <div className="py-1">
                {rootFolders.map((node) => renderFolderNode(node, 0))}
                {rootItems.map((item) => (
                  <SortableItemRow
                    key={item.id}
                    item={item}
                    isSelected={item.id === selectedId}
                    depth={0}
                    icon={itemIcon}
                    onSelect={onSelect}
                    onContextMenu={handleItemContextMenu}
                    editingId={editingId}
                    editValue={editValue}
                    onEditChange={setEditValue}
                    onEditCommit={commitEdit}
                    onEditCancel={cancelEdit}
                    onStartEdit={(id, name) => startEdit(id, name, 'item')}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {dragItem ? (
                <div className="flex items-center gap-1 rounded bg-background px-2 py-1 text-xs shadow-md">
                  <DragIcon className="size-3 text-muted-foreground" />
                  <span className="truncate">{dragItem.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[120px] rounded-md border border-border bg-popover p-1 shadow-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
            onClick={() => startEdit(contextMenu.id, contextMenu.name, contextMenu.type)}
          >
            <Pencil className="size-3" />
            Rename
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-destructive hover:bg-accent"
            onClick={handleDelete}
          >
            <Trash2 className="size-3" />
            Delete
          </button>
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
