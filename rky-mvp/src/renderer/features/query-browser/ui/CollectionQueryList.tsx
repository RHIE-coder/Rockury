import { useState, useCallback, useMemo } from 'react';
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
  Play,
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Eye,
  MinusCircle,
} from 'lucide-react';
import type { ICollectionItem } from '~/shared/types/db';
import type { TItemStatus } from '../model/useCollectionRunner';

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status?: TItemStatus }) {
  if (!status || status === 'pending') {
    return <Clock className="size-3 text-muted-foreground" />;
  }
  if (status === 'running') {
    return <Loader2 className="size-3 animate-spin text-blue-500" />;
  }
  if (status === 'success') {
    return <CheckCircle2 className="size-3 text-green-500" />;
  }
  if (status === 'error') {
    return <XCircle className="size-3 text-red-500" />;
  }
  if (status === 'skipped') {
    return <MinusCircle className="size-3 text-muted-foreground/50" />;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Simple SQL highlight (inline, no external dep)                     */
/* ------------------------------------------------------------------ */

const SQL_KEYWORDS =
  /\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|SET|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|IN|IS|NULL|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|VALUES|BEGIN|COMMIT|ROLLBACK|TRUNCATE|UNION|ALL|DISTINCT|CASE|WHEN|THEN|ELSE|END|EXISTS|BETWEEN|LIKE|COUNT|SUM|AVG|MIN|MAX)\b/gi;

function highlightSql(sql: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(SQL_KEYWORDS.source, 'gi');

  while ((match = regex.exec(sql)) !== null) {
    if (match.index > lastIndex) {
      parts.push(sql.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="font-semibold text-blue-600 dark:text-blue-400">
        {match[0]}
      </span>,
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < sql.length) {
    parts.push(sql.slice(lastIndex));
  }
  return parts;
}

/* ------------------------------------------------------------------ */
/*  Sortable item row                                                  */
/* ------------------------------------------------------------------ */

interface SortableQueryRowProps {
  item: ICollectionItem;
  index: number;
  status?: TItemStatus;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onRunSingle?: (item: ICollectionItem) => void;
  onRemove: (itemId: string) => void;
  onViewResult?: (itemId: string) => void;
  hasResult?: boolean;
}

function SortableQueryRow({
  item,
  index,
  status,
  isExpanded,
  onToggleExpand,
  onRunSingle,
  onRemove,
  onViewResult,
  hasResult,
}: SortableQueryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const sqlPreview = item.sqlContent
    ? item.sqlContent.split('\n').slice(0, 3).join('\n')
    : '';

  return (
    <div ref={setNodeRef} style={style} className="border-b border-border last:border-b-0">
      {/* Main row */}
      <div
        className="group flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/50"
        {...attributes}
        {...listeners}
      >
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => onToggleExpand(item.id)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </button>

        {/* Number */}
        <span className="w-5 shrink-0 text-center text-muted-foreground">{index + 1}</span>

        {/* Query name */}
        <span className="min-w-0 flex-1 truncate" title={sqlPreview}>
          {item.queryName ?? 'Unnamed'}
        </span>

        {/* Status */}
        <StatusBadge status={status} />

        {/* View result button (for SELECT results) */}
        {hasResult && onViewResult && (
          <button
            type="button"
            onClick={() => onViewResult(item.id)}
            className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100"
            title="View result"
          >
            <Eye className="size-3" />
          </button>
        )}

        {/* Run button */}
        {onRunSingle && (
          <button
            type="button"
            onClick={() => onRunSingle(item)}
            className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100"
            title="Run this query"
          >
            <Play className="size-3" />
          </button>
        )}

        {/* Remove button */}
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-destructive group-hover:opacity-100"
          title="Remove from collection"
        >
          <X className="size-3" />
        </button>
      </div>

      {/* Expanded SQL */}
      {isExpanded && item.sqlContent && (
        <div className="mx-2 mb-2 rounded border border-border bg-muted/30 p-2">
          <pre className="whitespace-pre-wrap text-[11px] font-mono leading-relaxed text-foreground/80">
            {highlightSql(item.sqlContent)}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface CollectionQueryListProps {
  items: ICollectionItem[];
  itemStatuses?: Map<string, TItemStatus>;
  onRunSingle?: (item: ICollectionItem) => void;
  onReorder: (items: { queryId: string; sortOrder: number }[]) => void;
  onRemove: (itemId: string) => void;
  onViewResult?: (itemId: string) => void;
  selectResultIds?: Set<string>;
}

export function CollectionQueryList({
  items,
  itemStatuses,
  onRunSingle,
  onReorder,
  onRemove,
  onViewResult,
  selectResultIds,
}: CollectionQueryListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const sortableIds = useMemo(() => items.map((i) => i.id), [items]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDragActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(items, oldIndex, newIndex);
      onReorder(
        reordered.map((item, idx) => ({
          queryId: item.queryId,
          sortOrder: idx,
        })),
      );
    },
    [items, onReorder],
  );

  const dragItem = dragActiveId ? items.find((i) => i.id === dragActiveId) : null;

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-xs text-muted-foreground">No queries in this collection</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto">
          {items.map((item, index) => (
            <SortableQueryRow
              key={item.id}
              item={item}
              index={index}
              status={itemStatuses?.get(item.id)}
              isExpanded={expandedIds.has(item.id)}
              onToggleExpand={toggleExpand}
              onRunSingle={onRunSingle}
              onRemove={onRemove}
              onViewResult={onViewResult}
              hasResult={selectResultIds?.has(item.id)}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {dragItem ? (
          <div className="flex items-center gap-2 rounded bg-background px-2 py-1.5 text-xs shadow-md">
            <span className="text-muted-foreground">#</span>
            <span className="truncate">{dragItem.queryName ?? 'Unnamed'}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
