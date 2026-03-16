import { useState, useEffect, useRef, useMemo } from 'react';
import { Table2, Eye as EyeIcon, Search, ChevronDown, ChevronRight, GitBranch } from 'lucide-react';
import type { ITable } from '~/shared/types/db';

interface DataTableListPanelProps {
  tables: ITable[];
  selectedTableName: string;
  onTableSelect: (tableName: string) => void;
}

export function DataTableListPanel({ tables, selectedTableName, onTableSelect }: DataTableListPanelProps) {
  const [search, setSearch] = useState('');
  const [tablesExpanded, setTablesExpanded] = useState(true);
  const [viewsExpanded, setViewsExpanded] = useState(true);
  const [partitionsExpanded, setPartitionsExpanded] = useState(true);
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  const filtered = search
    ? tables.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : tables;

  // Split into regular tables, partition tables, and views
  const regularTables = filtered.filter((t) => !t.isView && !t.isPartition);
  const partitionTables = filtered.filter((t) => t.isPartition);
  const viewTables = filtered.filter((t) => t.isView);

  // Group partitions by parent table
  const partitionGroups = useMemo(() => {
    const groups = new Map<string, ITable[]>();
    for (const t of partitionTables) {
      const parent = t.parentTableName ?? 'unknown';
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent)!.push(t);
    }
    return groups;
  }, [partitionTables]);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedTableName]);

  const toggleParent = (parentName: string) => {
    setCollapsedParents((prev) => {
      const next = new Set(prev);
      if (next.has(parentName)) next.delete(parentName);
      else next.add(parentName);
      return next;
    });
  };

  function renderTableItem(table: ITable, indent = false) {
    return (
      <button
        key={table.id}
        ref={table.name === selectedTableName ? selectedRef : undefined}
        type="button"
        onClick={() => onTableSelect(table.name)}
        className={`flex w-full items-center gap-1 py-1.5 text-left text-xs transition-colors hover:bg-muted ${
          indent ? 'pl-5 pr-2' : 'px-2'
        } ${table.name === selectedTableName ? 'bg-primary/10 font-semibold text-primary' : ''}`}
      >
        <span className="min-w-0 flex-1 truncate">{table.name}</span>
        {table.isView && (
          <span className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold leading-none ${
            table.isMaterialized
              ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
              : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
          }`}>
            {table.isMaterialized ? 'MV' : 'V'}
          </span>
        )}
        {table.isPartition && (
          <span className="shrink-0 rounded bg-orange-500/20 px-1 py-0.5 text-[8px] font-bold leading-none text-orange-600 dark:text-orange-400">
            P
          </span>
        )}
        <span className="w-5 shrink-0 text-right text-[10px] text-muted-foreground">
          {table.columns.length}
        </span>
      </button>
    );
  }

  return (
    <div className="flex h-full w-[180px] shrink-0 flex-col border-r border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Table2 className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Tables ({tables.length})</span>
        </div>
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

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">
            {tables.length === 0 ? 'No tables. Sync schema first.' : 'No matches.'}
          </p>
        ) : (
          <>
            {/* Regular Tables */}
            <div>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50"
                onClick={() => setTablesExpanded((v) => !v)}
              >
                {tablesExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                <Table2 className="size-3" />
                <span className="flex-1 text-left">Tables</span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px]">{regularTables.length}</span>
              </button>
              {tablesExpanded && <div className="pb-1">{regularTables.map((t) => renderTableItem(t))}</div>}
            </div>

            {/* Partition Tables */}
            {partitionTables.length > 0 && (
              <div className="border-t border-border/50">
                <button
                  type="button"
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50"
                  onClick={() => setPartitionsExpanded((v) => !v)}
                >
                  {partitionsExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                  <GitBranch className="size-3" />
                  <span className="flex-1 text-left">Partitions</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px]">{partitionTables.length}</span>
                </button>
                {partitionsExpanded && (
                  <div className="pb-1">
                    {[...partitionGroups.entries()].map(([parentName, children]) => (
                      <div key={parentName}>
                        <button
                          type="button"
                          onClick={() => toggleParent(parentName)}
                          className="flex w-full items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted/50"
                        >
                          {collapsedParents.has(parentName) ? (
                            <ChevronRight className="size-2.5" />
                          ) : (
                            <ChevronDown className="size-2.5" />
                          )}
                          <span className="truncate font-medium">{parentName}</span>
                          <span className="ml-auto text-[9px] text-muted-foreground/60">{children.length}</span>
                        </button>
                        {!collapsedParents.has(parentName) &&
                          children.map((t) => renderTableItem(t, true))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Views */}
            {viewTables.length > 0 && (
              <div className="border-t border-border/50">
                <button
                  type="button"
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50"
                  onClick={() => setViewsExpanded((v) => !v)}
                >
                  {viewsExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                  <EyeIcon className="size-3" />
                  <span className="flex-1 text-left">Views</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px]">{viewTables.length}</span>
                </button>
                {viewsExpanded && <div className="pb-1">{viewTables.map((t) => renderTableItem(t))}</div>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
