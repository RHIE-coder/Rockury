import { Badge } from '@/shared/components/ui/badge';
import type { IDiffResult } from '../model/types';

interface DiffSummaryProps {
  diff: IDiffResult;
}

export function DiffSummary({ diff }: DiffSummaryProps) {
  const added = diff.tableDiffs.filter((t) => t.action === 'added').length;
  const modified = diff.tableDiffs.filter((t) => t.action === 'modified').length;
  const removed = diff.tableDiffs.filter((t) => t.action === 'removed').length;

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
      <span className="text-sm font-medium">Diff Summary:</span>
      <Badge className="bg-green-600 text-white">{added} added</Badge>
      <Badge className="bg-yellow-600 text-white">{modified} modified</Badge>
      <Badge variant="destructive">{removed} removed</Badge>
      {!diff.hasDifferences && (
        <span className="text-sm text-muted-foreground">No differences found</span>
      )}
    </div>
  );
}
