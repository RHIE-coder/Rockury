import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface DmlResultPanelProps {
  dmlType: string;
  affectedRows: number;
  isDdlWarning?: boolean;
  onConfirm: () => void;
  onRollback: () => void;
  isProcessing?: boolean;
}

export function DmlResultPanel({
  dmlType,
  affectedRows,
  isDdlWarning = false,
  onConfirm,
  onRollback,
  isProcessing = false,
}: DmlResultPanelProps) {
  if (isDdlWarning) {
    return (
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-amber-500">DDL Result</p>
            <p className="text-muted-foreground">
              Statement executed immediately.
            </p>
            <p className="text-muted-foreground">
              Not in transaction (rollback unavailable).
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0 text-amber-500" />
          <span className="font-medium">DML Result</span>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 pl-6 text-xs">
          <span className="text-muted-foreground">Type:</span>
          <span className="font-mono font-medium">{dmlType}</span>

          <span className="text-muted-foreground">Affected Rows:</span>
          <span className="font-mono font-medium">{affectedRows}</span>

          <span className="text-muted-foreground">Transaction:</span>
          <span className="text-amber-500">awaiting decision...</span>
        </div>

        <div className="flex items-center gap-2 pl-6 pt-1">
          <Button
            variant="default"
            size="xs"
            onClick={onConfirm}
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="mr-1 size-3" />
            Confirm
          </Button>
          <Button
            variant="destructive"
            size="xs"
            onClick={onRollback}
            disabled={isProcessing}
          >
            <XCircle className="mr-1 size-3" />
            Rollback
          </Button>
        </div>
      </div>
    </div>
  );
}
