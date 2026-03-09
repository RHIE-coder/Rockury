import { Plus, Minus, Pencil, Equal } from 'lucide-react';
import type { IDiffResult } from '../model/types';

interface DiffSummaryProps {
  diff: IDiffResult;
}

export function DiffSummary({ diff }: DiffSummaryProps) {
  const added = diff.tableDiffs.filter((t) => t.action === 'added').length;
  const modified = diff.tableDiffs.filter((t) => t.action === 'modified').length;
  const removed = diff.tableDiffs.filter((t) => t.action === 'removed').length;

  if (!diff.hasDifferences) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2">
        <Equal className="size-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">No differences found</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-md bg-muted/50 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">Summary</span>
      {added > 0 && (
        <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
          <Plus className="size-3" />
          {added} added
        </span>
      )}
      {modified > 0 && (
        <span className="flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
          <Pencil className="size-3" />
          {modified} modified
        </span>
      )}
      {removed > 0 && (
        <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
          <Minus className="size-3" />
          {removed} removed
        </span>
      )}
    </div>
  );
}
