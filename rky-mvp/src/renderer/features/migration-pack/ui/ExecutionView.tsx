import { CheckCircle2, XCircle, Loader2, Circle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { IMigrationPack, IMigrationLog } from '~/shared/types/db';

interface ExecutionViewProps {
  pack: IMigrationPack;
  onRollback: () => void;
  onNext: () => void;
  isRollingBack: boolean;
}

const PHASE_LABELS = { ddl: 'Update DDL', dml: 'Seed DML', rollback: 'Rollback' };

function LogEntry({ log }: { log: IMigrationLog }) {
  const Icon = log.status === 'success' ? CheckCircle2
    : log.status === 'failed' ? XCircle
    : Circle;
  const color = log.status === 'success' ? 'text-green-500'
    : log.status === 'failed' ? 'text-red-500'
    : 'text-muted-foreground';

  return (
    <div className="flex items-start gap-2 py-1">
      <Icon className={`mt-0.5 size-3.5 shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <code className="block truncate text-[11px]">{log.sql}</code>
        {log.error && (
          <span className="text-[10px] text-red-500">{log.error}</span>
        )}
      </div>
      <span className="shrink-0 text-[10px] text-muted-foreground">{log.durationMs}ms</span>
    </div>
  );
}

export function ExecutionView({ pack, onRollback, onNext, isRollingBack }: ExecutionViewProps) {
  const logs = pack.executionLog ?? [];
  const isApplied = pack.status === 'applied';
  const isFailed = pack.status === 'failed';
  const isExecuting = pack.status === 'executing';

  const ddlLogs = logs.filter((l) => l.phase === 'ddl');
  const dmlLogs = logs.filter((l) => l.phase === 'dml');
  const successCount = logs.filter((l) => l.status === 'success').length;
  const totalDuration = logs.reduce((sum, l) => sum + l.durationMs, 0);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Step 3: Execution</h3>

      {/* Status */}
      <div className={`rounded-md px-3 py-2 text-xs font-medium ${
        isApplied ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
        : isFailed ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
        : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
      }`}>
        {isApplied && `Migration applied successfully. ${successCount} statements in ${(totalDuration / 1000).toFixed(2)}s`}
        {isFailed && 'Migration failed. Check logs below for details.'}
        {isExecuting && (
          <span className="flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin" />
            Executing...
          </span>
        )}
      </div>

      {/* DDL Logs */}
      {ddlLogs.length > 0 && (
        <div>
          <span className="text-[10px] font-medium text-muted-foreground">{PHASE_LABELS.ddl} ({ddlLogs.length})</span>
          <div className="mt-1 rounded-md border border-border bg-card p-2">
            {ddlLogs.map((log, i) => <LogEntry key={i} log={log} />)}
          </div>
        </div>
      )}

      {/* DML Logs */}
      {dmlLogs.length > 0 && (
        <div>
          <span className="text-[10px] font-medium text-muted-foreground">{PHASE_LABELS.dml} ({dmlLogs.length})</span>
          <div className="mt-1 rounded-md border border-border bg-card p-2">
            {dmlLogs.map((log, i) => <LogEntry key={i} log={log} />)}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        {(isApplied || isFailed) && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRollback}
            disabled={isRollingBack}
            className={isFailed ? 'border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400' : ''}
          >
            {isRollingBack ? 'Rolling back...' : 'Rollback'}
          </Button>
        )}
        {isApplied && (
          <Button size="sm" onClick={onNext}>
            Verify →
          </Button>
        )}
      </div>
    </div>
  );
}
