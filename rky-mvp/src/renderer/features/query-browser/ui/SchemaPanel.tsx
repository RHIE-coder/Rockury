import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Key, ArrowRight, ChevronRight, ChevronDown, Eye } from 'lucide-react';
import type { ITable, IColumn } from '~/shared/types/db';

interface SchemaPanelProps {
  tables: ITable[];
  isLoading: boolean;
  onInsert?: (text: string) => void;
  onPreviewTable?: (tableName: string) => void;
  onClose: () => void;
}

export function SchemaPanel({ tables, isLoading, onInsert, onPreviewTable, onClose }: SchemaPanelProps) {
  const [search, setSearch] = useState('');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const tableRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const lowerSearch = search.toLowerCase();

  const filteredTables = search
    ? tables.filter(
        (t) =>
          t.name.toLowerCase().includes(lowerSearch) ||
          t.columns.some((c) => c.name.toLowerCase().includes(lowerSearch)),
      )
    : tables;

  // Auto-expand tables that match column search
  useEffect(() => {
    if (!search) return;
    const matched = new Set<string>();
    for (const t of tables) {
      if (t.columns.some((c) => c.name.toLowerCase().includes(lowerSearch))) {
        matched.add(t.name);
      }
    }
    if (matched.size > 0) {
      setExpandedTables((prev) => new Set([...prev, ...matched]));
    }
  }, [search, lowerSearch, tables]);

  const toggleTable = useCallback((tableName: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) next.delete(tableName);
      else next.add(tableName);
      return next;
    });
  }, []);

  const handleInsert = useCallback(
    (text: string) => {
      onInsert?.(text);
    },
    [onInsert],
  );

  const scrollToTable = useCallback((tableName: string) => {
    setExpandedTables((prev) => new Set([...prev, tableName]));
    requestAnimationFrame(() => {
      const el = tableRefs.current.get(tableName);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  const handleFkClick = useCallback(
    (refTable: string) => {
      scrollToTable(refTable);
    },
    [scrollToTable],
  );

  return (
    <div className="flex h-full w-[200px] flex-shrink-0 flex-col border-l border-border bg-background/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Schema
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-border px-2 py-1.5">
        <div className="flex items-center gap-1 rounded border border-border bg-background px-1.5 py-1">
          <Search className="size-3 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter..."
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')}>
              <X className="size-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Table Tree */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-1.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
            Loading schema...
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
            {search ? 'No matches' : 'No tables found'}
          </div>
        ) : (
          filteredTables.map((table) => (
            <TableNode
              key={table.name}
              table={table}
              expanded={expandedTables.has(table.name)}
              search={lowerSearch}
              onToggle={toggleTable}
              onInsert={handleInsert}
              onFkClick={handleFkClick}
              onPreview={onPreviewTable}
              nodeRef={(el) => {
                if (el) tableRefs.current.set(table.name, el);
                else tableRefs.current.delete(table.name);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TableNode                                                          */
/* ------------------------------------------------------------------ */

interface TableNodeProps {
  table: ITable;
  expanded: boolean;
  search: string;
  onToggle: (name: string) => void;
  onInsert: (text: string) => void;
  onFkClick: (refTable: string) => void;
  onPreview?: (tableName: string) => void;
  nodeRef: (el: HTMLDivElement | null) => void;
}

function TableNode({ table, expanded, search, onToggle, onInsert, onFkClick, onPreview, nodeRef }: TableNodeProps) {
  return (
    <div ref={nodeRef} className="mb-0.5">
      {/* Table header */}
      <div className="group flex w-full items-center gap-1 rounded px-1 py-0.5 text-xs hover:bg-muted/50">
        <button
          type="button"
          onClick={() => onToggle(table.name)}
          className="flex min-w-0 flex-1 items-center gap-1 text-left"
        >
          {expanded ? (
            <ChevronDown className="size-3 flex-shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3 flex-shrink-0 text-muted-foreground" />
          )}
          <span
            className={`truncate font-medium ${table.isView ? 'text-blue-400/80' : 'text-foreground/70'}`}
            title={table.isView ? `View: ${table.name}` : table.name}
          >
            {table.name}
          </span>
        </button>

        {/* Preview icon — visible on hover */}
        {onPreview && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(table.name);
            }}
            className="hidden flex-shrink-0 text-muted-foreground/50 hover:text-foreground group-hover:block"
            title={`Preview ${table.name}`}
          >
            <Eye className="size-3" />
          </button>
        )}

        <span className="flex-shrink-0 text-[10px] text-muted-foreground/40 group-hover:hidden">
          {table.columns.length}
        </span>
      </div>

      {/* Columns */}
      {expanded && (
        <div className="ml-2 border-l border-border/50 pl-1.5">
          {table.columns
            .filter((c) => !search || c.name.toLowerCase().includes(search) || table.name.toLowerCase().includes(search))
            .map((col) => (
              <ColumnNode
                key={col.id}
                column={col}
                onInsert={onInsert}
                onFkClick={onFkClick}
              />
            ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ColumnNode                                                         */
/* ------------------------------------------------------------------ */

interface ColumnNodeProps {
  column: IColumn;
  onInsert: (text: string) => void;
  onFkClick: (refTable: string) => void;
}

function ColumnNode({ column, onInsert, onFkClick }: ColumnNodeProps) {
  const isPk = column.keyTypes.includes('PK');
  const isFk = column.keyTypes.includes('FK');

  return (
    <button
      type="button"
      onClick={() => {
        if (isFk && column.reference) {
          onFkClick(column.reference.table);
        }
        onInsert(column.name);
      }}
      className="group flex w-full items-center gap-1 rounded px-1 py-px text-left text-[11px] hover:bg-muted/50"
      title={
        isFk && column.reference
          ? `FK → ${column.reference.table}.${column.reference.column}`
          : `${column.name} (${column.dataType})`
      }
    >
      {/* Icon */}
      <span className="flex w-3 flex-shrink-0 items-center justify-center">
        {isPk ? (
          <Key className="size-2.5 text-amber-400/70" />
        ) : isFk ? (
          <ArrowRight className="size-2.5 text-blue-400/70" />
        ) : null}
      </span>

      {/* Name */}
      <span
        className={`min-w-0 truncate ${isFk ? 'text-blue-400/70' : 'text-foreground/60'}`}
      >
        {column.name}
      </span>

      {/* Type */}
      <span className="ml-auto flex-shrink-0 text-[10px] text-muted-foreground/30 group-hover:text-muted-foreground/50">
        {isFk && column.reference
          ? `→${column.reference.table}`
          : column.dataType}
      </span>
    </button>
  );
}
