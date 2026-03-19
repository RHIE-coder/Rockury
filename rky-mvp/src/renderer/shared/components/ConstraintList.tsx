import { useState, useMemo } from 'react';
import { Key, Link2, Fingerprint, ListOrdered, ShieldCheck, CircleDot, Search } from 'lucide-react';
import type { ITable, IConstraint, TConstraintType } from '~/shared/types/db';

const TYPE_CONFIG: Record<TConstraintType, { icon: typeof Key; color: string }> = {
  PK: { icon: Key, color: 'bg-amber-500/20 text-amber-700 dark:text-amber-400' },
  FK: { icon: Link2, color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400' },
  UK: { icon: Fingerprint, color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  IDX: { icon: ListOrdered, color: 'bg-purple-500/20 text-purple-700 dark:text-purple-400' },
  CHECK: { icon: ShieldCheck, color: 'bg-orange-500/20 text-orange-700 dark:text-orange-400' },
  NOT_NULL: { icon: CircleDot, color: 'bg-gray-500/20 text-gray-700 dark:text-gray-400' },
};

function getColumnsText(columns: unknown): string {
  if (Array.isArray(columns)) return columns.join(', ');
  if (typeof columns === 'string') return columns;
  return '';
}

function columnsMatch(columns: unknown, query: string): boolean {
  if (Array.isArray(columns)) return columns.some((col) => String(col).toLowerCase().includes(query));
  if (typeof columns === 'string') return columns.toLowerCase().includes(query);
  return false;
}

interface ConstraintWithTable {
  constraint: IConstraint;
  tableName: string;
}

interface ConstraintListProps {
  tables: ITable[];
  onSelect: (tableName: string) => void;
}

/** Full constraint list view — intended to be used as a tab content panel */
export function ConstraintList({ tables, onSelect }: ConstraintListProps) {
  const [filterType, setFilterType] = useState<TConstraintType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const allConstraints = useMemo<ConstraintWithTable[]>(() => {
    const list: ConstraintWithTable[] = [];
    for (const t of tables) {
      for (const c of t.constraints) {
        list.push({ constraint: c, tableName: t.name });
      }
    }
    return list;
  }, [tables]);

  const typeCounts = useMemo(() => {
    const counts = new Map<TConstraintType, number>();
    for (const { constraint } of allConstraints) {
      counts.set(constraint.type, (counts.get(constraint.type) ?? 0) + 1);
    }
    return counts;
  }, [allConstraints]);

  const filtered = useMemo(() => {
    let list = allConstraints;
    if (filterType !== 'ALL') {
      list = list.filter((c) => c.constraint.type === filterType);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.constraint.name.toLowerCase().includes(q) ||
          c.tableName.toLowerCase().includes(q) ||
          columnsMatch(c.constraint.columns, q),
      );
    }
    return list;
  }, [allConstraints, filterType, search]);

  if (allConstraints.length === 0) {
    return <p className="p-3 text-xs text-muted-foreground">No constraints found.</p>;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
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

      {/* Type filter chips */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border/50 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setFilterType('ALL')}
          className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
            filterType === 'ALL' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          ALL ({allConstraints.length})
        </button>
        {(['PK', 'FK', 'UK', 'IDX', 'CHECK'] as TConstraintType[]).map((type) => {
          const count = typeCounts.get(type);
          if (!count) return null;
          const cfg = TYPE_CONFIG[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType((prev) => (prev === type ? 'ALL' : type))}
              className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
                filterType === type ? cfg.color : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {type}
              <span className="ml-0.5 text-[7px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Constraint list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-[10px] text-muted-foreground">No matches</p>
        ) : (
          filtered.map(({ constraint: c, tableName }, i) => {
            const cfg = TYPE_CONFIG[c.type];
            const Icon = cfg.icon;
            return (
              <button
                key={`${c.name}-${i}`}
                type="button"
                onClick={() => onSelect(tableName)}
                className="flex w-full items-start gap-1.5 border-b border-border/20 px-2 py-1.5 text-left text-[10px] hover:bg-muted/50"
              >
                <span className={`mt-px inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-bold leading-none ${cfg.color}`}>
                  <Icon className="size-2.5" />
                  {c.type}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-[10px]" title={c.name}>
                    {c.name}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <span className="truncate">{tableName}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="truncate font-mono">{getColumnsText(c.columns)}</span>
                  </div>
                  {c.reference && (
                    <div className="mt-0.5 truncate font-mono text-[9px] text-blue-500/80">
                      → {c.reference.table}.{c.reference.column}
                      {c.reference.onDelete && c.reference.onDelete !== 'NO ACTION' && (
                        <span className="ml-1 text-[8px] text-muted-foreground/60">
                          DEL:{c.reference.onDelete}
                        </span>
                      )}
                    </div>
                  )}
                  {c.checkExpression && (
                    <div className="mt-0.5 truncate font-mono text-[9px] text-orange-500/80">
                      {c.checkExpression}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
