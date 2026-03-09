import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { IMigrationPack } from '~/shared/types/db';

interface VerificationViewProps {
  pack: IMigrationPack;
  onComplete: () => void;
}

export function VerificationView({ pack, onComplete }: VerificationViewProps) {
  const logs = pack.executionLog ?? [];
  const successCount = logs.filter((l) => l.status === 'success').length;
  const ddlCount = logs.filter((l) => l.phase === 'ddl' && l.status === 'success').length;
  const dmlCount = logs.filter((l) => l.phase === 'dml' && l.status === 'success').length;
  const totalDuration = logs.reduce((sum, l) => sum + l.durationMs, 0);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Step 4: Verification</h3>

      <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
          <span className="text-sm font-semibold text-green-700 dark:text-green-300">
            Migration Pack Applied Successfully
          </span>
        </div>
        <p className="mt-1 pl-7 text-xs text-green-600 dark:text-green-400">
          {ddlCount} DDL + {dmlCount} DML statements in {(totalDuration / 1000).toFixed(2)}s
        </p>
      </div>

      <div className="space-y-2 rounded-md border border-border p-3">
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle2 className="size-3.5 text-green-500" />
          <span>{successCount} statements executed successfully</span>
        </div>
        {pack.preSnapshotId && (
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="size-3.5 text-green-500" />
            <span>Pre-migration snapshot saved</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle2 className="size-3.5 text-green-500" />
          <span>Applied at {pack.appliedAt ? new Date(pack.appliedAt).toLocaleString() : 'N/A'}</span>
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={onComplete}>
          Complete
        </Button>
      </div>
    </div>
  );
}
