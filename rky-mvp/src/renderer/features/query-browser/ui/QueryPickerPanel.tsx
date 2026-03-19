import { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Search, FileCode, FolderOpen, Folder, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import type { IQuery, IQueryFolder } from '~/shared/types/db';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface QueryPickerPanelProps {
  folders: IQueryFolder[];
  queries: IQuery[];
}

interface FolderNode {
  folder: IQueryFolder;
  children: FolderNode[];
  items: IQuery[];
}

/* ------------------------------------------------------------------ */
/*  Tree builder                                                       */
/* ------------------------------------------------------------------ */

function buildTree(folders: IQueryFolder[], queries: IQuery[]) {
  const map = new Map<string, FolderNode>();
  for (const f of folders) map.set(f.id, { folder: f, children: [], items: [] });

  const roots: FolderNode[] = [];
  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parentId && map.has(f.parentId)) {
      map.get(f.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const rootItems: IQuery[] = [];
  for (const q of queries) {
    if (q.folderId && map.has(q.folderId)) {
      map.get(q.folderId)!.items.push(q);
    } else {
      rootItems.push(q);
    }
  }

  return { roots, rootItems };
}

/* ------------------------------------------------------------------ */
/*  Draggable query row                                                */
/* ------------------------------------------------------------------ */

function DraggableQuery({ query }: { query: IQuery }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `picker-${query.id}`,
    data: { type: 'picker-query', queryId: query.id, queryName: query.name },
  });

  return (
    <div
      ref={setNodeRef}
      className={`group flex items-center gap-1 py-1 text-xs hover:bg-muted ${isDragging ? 'opacity-30' : ''}`}
      style={{ paddingRight: '8px' }}
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab opacity-0 group-hover:opacity-40"
      >
        <GripVertical className="size-3" />
      </span>
      <FileCode className="size-3 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{query.name}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function QueryPickerPanel({ folders, queries }: QueryPickerPanelProps) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(folders.map((f) => f.id)));

  const filtered = useMemo(() => {
    if (!search) return queries;
    const lower = search.toLowerCase();
    return queries.filter((q) => q.name.toLowerCase().includes(lower));
  }, [queries, search]);

  const filteredFolders = useMemo(() => {
    if (!search) return folders;
    const lower = search.toLowerCase();
    const folderIdsWithItems = new Set(filtered.map((q) => q.folderId).filter(Boolean));
    return folders.filter(
      (f) => f.name.toLowerCase().includes(lower) || folderIdsWithItems.has(f.id),
    );
  }, [folders, search, filtered]);

  const { roots, rootItems } = useMemo(
    () => buildTree(filteredFolders, filtered),
    [filteredFolders, filtered],
  );

  function toggleFolder(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderFolder(node: FolderNode, depth: number): React.ReactNode {
    const isExpanded = expanded.has(node.folder.id);
    return (
      <div key={node.folder.id}>
        <div
          className="flex cursor-pointer items-center gap-1 py-1 text-xs hover:bg-muted/50"
          style={{ paddingLeft: `${4 + depth * 14}px` }}
          onClick={() => toggleFolder(node.folder.id)}
        >
          {isExpanded ? <ChevronDown className="size-3 text-muted-foreground" /> : <ChevronRight className="size-3 text-muted-foreground" />}
          {isExpanded ? <FolderOpen className="size-3 text-amber-500" /> : <Folder className="size-3 text-amber-500" />}
          <span className="truncate font-medium">{node.folder.name}</span>
        </div>
        {isExpanded && (
          <div style={{ paddingLeft: `${depth * 14}px` }}>
            {node.children.map((c) => renderFolder(c, depth + 1))}
            {node.items.map((q) => (
              <div key={q.id} style={{ paddingLeft: `${14 + depth * 14}px` }}>
                <DraggableQuery query={q} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full w-[200px] shrink-0 flex-col border-l border-border bg-background">
      <div className="flex items-center border-b border-border px-2 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Queries
        </span>
      </div>

      <div className="border-b border-border px-2 py-1.5">
        <div className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
          <Search className="size-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {roots.map((node) => renderFolder(node, 0))}
        {rootItems.map((q) => (
          <div key={q.id} style={{ paddingLeft: '4px' }}>
            <DraggableQuery query={q} />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="p-3 text-xs text-muted-foreground">No queries</p>
        )}
      </div>

      <div className="border-t border-border px-2 py-1.5">
        <p className="text-[10px] text-muted-foreground">Drag a query to add</p>
      </div>
    </div>
  );
}
