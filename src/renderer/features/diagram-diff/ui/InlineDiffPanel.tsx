import { Plus, Minus, Pencil, ArrowRight, Equal } from 'lucide-react';
import type { ITable, IColumn } from '~/shared/types/db';

interface InlineDiffPanelProps {
  sourceTable: ITable;
  targetTable: ITable | null;
  sourceName: string;
  targetName: string;
}

interface ColumnDiffRow {
  name: string;
  action: 'added' | 'removed' | 'modified' | 'unchanged';
  sourceCol?: IColumn;
  targetCol?: IColumn;
  changes: string[];
}

function diffColumns(source: IColumn[], target: IColumn[]): ColumnDiffRow[] {
  const rows: ColumnDiffRow[] = [];
  const targetMap = new Map(target.map((c) => [c.name.toLowerCase(), c]));
  const sourceMap = new Map(source.map((c) => [c.name.toLowerCase(), c]));

  for (const sCol of source) {
    const key = sCol.name.toLowerCase();
    const tCol = targetMap.get(key);

    if (!tCol) {
      rows.push({ name: sCol.name, action: 'added', sourceCol: sCol, changes: [] });
    } else {
      const changes: string[] = [];
      if (sCol.dataType.toLowerCase() !== tCol.dataType.toLowerCase()) {
        changes.push(`type: ${tCol.dataType} → ${sCol.dataType}`);
      }
      if (sCol.nullable !== tCol.nullable) {
        changes.push(`nullable: ${tCol.nullable} → ${sCol.nullable}`);
      }
      if ((sCol.defaultValue ?? '') !== (tCol.defaultValue ?? '')) {
        changes.push(`default: ${tCol.defaultValue ?? 'NULL'} → ${sCol.defaultValue ?? 'NULL'}`);
      }
      const sKeys = (sCol.keyTypes ?? []).join(',') || 'none';
      const tKeys = (tCol.keyTypes ?? []).join(',') || 'none';
      if (sKeys !== tKeys) {
        changes.push(`key: ${tKeys} → ${sKeys}`);
      }

      rows.push({
        name: sCol.name,
        action: changes.length > 0 ? 'modified' : 'unchanged',
        sourceCol: sCol,
        targetCol: tCol,
        changes,
      });
    }
  }

  for (const tCol of target) {
    const key = tCol.name.toLowerCase();
    if (!sourceMap.has(key)) {
      rows.push({ name: tCol.name, action: 'removed', targetCol: tCol, changes: [] });
    }
  }

  return rows;
}

const ACTION_ICON = {
  added: Plus,
  removed: Minus,
  modified: Pencil,
  unchanged: Equal,
} as const;

const ACTION_ACCENT = {
  added: 'border-l-green-500',
  removed: 'border-l-red-500',
  modified: 'border-l-yellow-500',
  unchanged: 'border-l-transparent',
} as const;

const ACTION_ICON_COLOR = {
  added: 'text-green-500 bg-green-500/10',
  removed: 'text-red-500 bg-red-500/10',
  modified: 'text-yellow-500 bg-yellow-500/10',
  unchanged: 'text-muted-foreground/40 bg-muted/50',
} as const;

export function InlineDiffPanel({ sourceTable, targetTable, sourceName, targetName }: InlineDiffPanelProps) {
  if (!targetTable) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Minus className="size-4 text-muted-foreground" />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{sourceTable.name}</span> does not exist in{' '}
          <span className="font-medium text-foreground">{targetName}</span>
        </p>
      </div>
    );
  }

  const columnDiffs = diffColumns(sourceTable.columns, targetTable.columns);
  const changedRows = columnDiffs.filter((r) => r.action !== 'unchanged');
  const unchangedRows = columnDiffs.filter((r) => r.action === 'unchanged');
  const hasChanges = changedRows.length > 0;

  const stats = {
    added: columnDiffs.filter((r) => r.action === 'added').length,
    removed: columnDiffs.filter((r) => r.action === 'removed').length,
    modified: columnDiffs.filter((r) => r.action === 'modified').length,
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="truncate font-medium text-foreground">{sourceName}</span>
        <ArrowRight className="size-3 shrink-0" />
        <span className="truncate font-medium text-foreground">{targetName}</span>
      </div>

      {/* Stats bar */}
      {hasChanges ? (
        <div className="flex gap-3 rounded-md bg-muted/50 px-3 py-1.5">
          {stats.added > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400">
              <Plus className="size-2.5" />
              {stats.added}
            </span>
          )}
          {stats.removed > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400">
              <Minus className="size-2.5" />
              {stats.removed}
            </span>
          )}
          {stats.modified > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-yellow-600 dark:text-yellow-400">
              <Pencil className="size-2.5" />
              {stats.modified}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {unchangedRows.length} unchanged
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2">
          <Equal className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">No column differences</span>
        </div>
      )}

      {/* Changed columns */}
      {changedRows.length > 0 && (
        <div className="space-y-1">
          {changedRows.map((row) => {
            const Icon = ACTION_ICON[row.action];
            return (
              <div
                key={row.name}
                className={`rounded-md border-l-2 bg-card px-2.5 py-2 ${ACTION_ACCENT[row.action]}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`flex size-5 shrink-0 items-center justify-center rounded ${ACTION_ICON_COLOR[row.action]}`}>
                    <Icon className="size-2.5" />
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-xs font-semibold ${row.action === 'removed' ? 'line-through opacity-60' : ''}`}>
                    {row.name}
                  </span>
                  {(row.sourceCol ?? row.targetCol) && (
                    <code className="shrink-0 rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">
                      {(row.sourceCol ?? row.targetCol)!.dataType}
                    </code>
                  )}
                </div>
                {row.changes.length > 0 && (
                  <div className="mt-1.5 space-y-0.5 pl-7">
                    {row.changes.map((change) => (
                      <div key={change} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <ArrowRight className="size-2 shrink-0 opacity-40" />
                        <span>{change}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unchanged columns (collapsed) */}
      {unchangedRows.length > 0 && hasChanges && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] text-muted-foreground hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
            <span className="text-[10px] transition-transform group-open:rotate-90">&#9654;</span>
            {unchangedRows.length} unchanged column{unchangedRows.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-1 space-y-px pl-1">
            {unchangedRows.map((row) => (
              <div
                key={row.name}
                className="flex items-center gap-2 rounded px-2.5 py-1 text-muted-foreground/60"
              >
                <span className="size-1 shrink-0 rounded-full bg-muted-foreground/20" />
                <span className="min-w-0 flex-1 truncate text-[11px]">{row.name}</span>
                {row.sourceCol && (
                  <code className="shrink-0 text-[9px] opacity-50">{row.sourceCol.dataType}</code>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
