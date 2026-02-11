import { Badge } from '@/shared/components/ui/badge';
import type { ITable, IColumn } from '~/shared/types/db';

interface InlineDiffPanelProps {
  sourceTable: ITable;
  targetTable: ITable | null;
  sourceName: string;
  targetName: string;
}

const ACTION_BG = {
  added: 'bg-green-50 dark:bg-green-950/50',
  removed: 'bg-red-50 dark:bg-red-950/50',
  modified: 'bg-yellow-50 dark:bg-yellow-950/50',
  unchanged: '',
} as const;

const ACTION_TEXT = {
  added: 'text-green-700 dark:text-green-400',
  removed: 'text-red-700 dark:text-red-400',
  modified: 'text-yellow-700 dark:text-yellow-400',
  unchanged: 'text-muted-foreground',
} as const;

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

  // Columns in source
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

  // Columns only in target (removed from source perspective)
  for (const tCol of target) {
    const key = tCol.name.toLowerCase();
    if (!sourceMap.has(key)) {
      rows.push({ name: tCol.name, action: 'removed', targetCol: tCol, changes: [] });
    }
  }

  return rows;
}

export function InlineDiffPanel({ sourceTable, targetTable, sourceName, targetName }: InlineDiffPanelProps) {
  if (!targetTable) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-muted-foreground">
          Table "{sourceTable.name}" not found in "{targetName}".
        </p>
      </div>
    );
  }

  const columnDiffs = diffColumns(sourceTable.columns, targetTable.columns);
  const hasChanges = columnDiffs.some((r) => r.action !== 'unchanged');

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{sourceName}</span>
        {' → '}
        <span className="font-medium text-foreground">{targetName}</span>
      </div>

      {!hasChanges ? (
        <p className="px-3 text-xs text-muted-foreground">No differences found for this table.</p>
      ) : (
        <div className="space-y-1">
          {columnDiffs.map((row) => (
            <div
              key={row.name}
              className={`rounded-md border border-transparent px-3 py-1.5 ${ACTION_BG[row.action]}`}
            >
              <div className="flex items-center gap-2">
                {row.action !== 'unchanged' && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${ACTION_TEXT[row.action]}`}
                  >
                    {row.action}
                  </Badge>
                )}
                <span className={`text-xs font-medium ${row.action === 'removed' ? 'line-through' : ''}`}>
                  {row.name}
                </span>
                {row.sourceCol && (
                  <span className="text-[10px] text-muted-foreground">
                    {row.sourceCol.dataType}
                  </span>
                )}
              </div>
              {row.changes.length > 0 && (
                <ul className="mt-1 space-y-0.5 pl-4">
                  {row.changes.map((change) => (
                    <li key={change} className="text-[10px] text-muted-foreground">
                      {change}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
