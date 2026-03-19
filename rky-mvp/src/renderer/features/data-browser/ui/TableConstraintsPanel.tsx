import { useState } from 'react';
import { ChevronDown, ChevronRight, Key, Link2, Fingerprint, ListOrdered, ShieldCheck, CircleDot, Plus, PenLine, Trash2 } from 'lucide-react';
import type { IConstraint, TConstraintType } from '~/shared/types/db';
import type { TConstraintEditMode } from './ConstraintEditorModal';

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

interface TableConstraintsPanelProps {
  constraints: IConstraint[];
  open: boolean;
  onToggle: () => void;
  onEditConstraint?: (mode: TConstraintEditMode) => void;
}

export function TableConstraintsPanel({ constraints, open, onToggle, onEditConstraint }: TableConstraintsPanelProps) {
  const [filterType, setFilterType] = useState<TConstraintType | 'ALL'>('ALL');

  const filtered = filterType === 'ALL'
    ? constraints
    : constraints.filter((c) => c.type === filterType);

  const typeCounts = new Map<TConstraintType, number>();
  for (const c of constraints) {
    typeCounts.set(c.type, (typeCounts.get(c.type) ?? 0) + 1);
  }

  // Determine available edit actions per constraint type
  function getEditActions(c: IConstraint) {
    const actions: { label: string; mode: TConstraintEditMode }[] = [];

    // Rename (not for NOT_NULL)
    if (c.type !== 'NOT_NULL') {
      actions.push({ label: 'Name', mode: { kind: 'rename', constraint: c } });
    }

    // Edit columns (PK, UK, IDX)
    if (c.type === 'PK' || c.type === 'UK' || c.type === 'IDX') {
      actions.push({ label: 'Columns', mode: { kind: 'editColumns', constraint: c } });
    }

    // Edit FK actions (ON DELETE / ON UPDATE)
    if (c.type === 'FK' && c.reference) {
      actions.push({ label: 'Actions', mode: { kind: 'editFk', constraint: c } });
    }

    // Edit CHECK expression
    if (c.type === 'CHECK') {
      actions.push({ label: 'Expr', mode: { kind: 'editCheck', constraint: c } });
    }

    return actions;
  }

  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        <span>Constraints</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
          {constraints.length}
        </span>
        {onEditConstraint && (
          <span
            role="button"
            tabIndex={0}
            className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onEditConstraint({ kind: 'add' });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                onEditConstraint({ kind: 'add' });
              }
            }}
            title="Add constraint"
          >
            <Plus className="size-3" />
          </span>
        )}
      </button>

      {open && (
        <div className="max-h-[200px] overflow-auto">
          {constraints.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 border-t border-border/50 px-3 py-1.5">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                  filterType === 'ALL' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ALL ({constraints.length})
              </button>
              {(['PK', 'FK', 'UK', 'IDX', 'CHECK', 'NOT_NULL'] as TConstraintType[]).map((type) => {
                const count = typeCounts.get(type);
                if (!count) return null;
                const cfg = TYPE_CONFIG[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilterType((prev) => (prev === type ? 'ALL' : type))}
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      filterType === type ? cfg.color : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {type} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No constraints</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted text-[10px] text-muted-foreground">
                <tr>
                  <th className="px-3 py-1 text-left font-medium">Type</th>
                  <th className="px-3 py-1 text-left font-medium">Name</th>
                  <th className="px-3 py-1 text-left font-medium">Columns</th>
                  <th className="px-3 py-1 text-left font-medium">Reference</th>
                  {onEditConstraint && (
                    <th className="px-2 py-1 text-right font-medium">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const cfg = TYPE_CONFIG[c.type];
                  const Icon = cfg.icon;
                  const editActions = onEditConstraint ? getEditActions(c) : [];
                  return (
                    <tr key={`${c.name}-${i}`} className="group border-t border-border/30 hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-1">
                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold leading-none ${cfg.color}`}>
                          <Icon className="size-2.5" />
                          {c.type}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-1 font-mono text-[11px]" title={c.name}>
                        {c.name}
                      </td>
                      <td className="px-3 py-1 font-mono text-[11px]">
                        {getColumnsText(c.columns)}
                      </td>
                      <td className="px-3 py-1 text-[11px] text-muted-foreground">
                        {c.reference ? (
                          <span className="font-mono">
                            {c.reference.table}.{c.reference.column}
                            {(c.reference.onDelete || c.reference.onUpdate) && (
                              <span className="ml-1 text-[9px] text-muted-foreground/70">
                                {c.reference.onDelete && `DEL:${c.reference.onDelete}`}
                                {c.reference.onDelete && c.reference.onUpdate && ' '}
                                {c.reference.onUpdate && `UPD:${c.reference.onUpdate}`}
                              </span>
                            )}
                          </span>
                        ) : c.checkExpression ? (
                          <span className="font-mono text-muted-foreground/70">{c.checkExpression}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      {onEditConstraint && (
                        <td className="whitespace-nowrap px-2 py-1 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {editActions.map((action) => (
                              <button
                                key={action.label}
                                type="button"
                                onClick={() => onEditConstraint(action.mode)}
                                className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                <PenLine className="size-2.5" />
                                {action.label}
                              </button>
                            ))}
                            <button
                              type="button"
                              title="Drop"
                              onClick={() => onEditConstraint({ kind: 'drop', constraint: c })}
                              className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
