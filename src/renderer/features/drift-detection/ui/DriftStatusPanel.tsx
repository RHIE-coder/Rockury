import { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useLightweightDriftCheck, useFullDriftCheck } from '../model/useDriftDetection';
import type { IDriftCheckResult } from '~/shared/types/db';

interface DriftStatusPanelProps {
  connectionId: string;
}

export function DriftStatusPanel({ connectionId }: DriftStatusPanelProps) {
  const [fullResult, setFullResult] = useState<IDriftCheckResult | null>(null);
  const { data: lightweight, isLoading: isLightweightLoading } = useLightweightDriftCheck(connectionId);
  const fullCheck = useFullDriftCheck();

  const handleFullCheck = () => {
    fullCheck.mutate({ connectionId }, {
      onSuccess: (data) => setFullResult(data),
    });
  };

  const hasDrift = lightweight?.hasDrift || fullResult?.hasDrift;
  const isChecking = isLightweightLoading || fullCheck.isPending;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Drift Detection</h3>
        </div>
        <DriftBadge hasDrift={hasDrift} isChecking={isChecking} />
      </div>

      {lightweight && !lightweight.hasDrift && !fullResult && (
        <p className="text-xs text-muted-foreground">
          Lightweight check: no drift detected. Last checked {new Date(lightweight.checkedAt).toLocaleTimeString()}.
        </p>
      )}

      {lightweight?.hasDrift && !fullResult && (
        <div className="flex items-center gap-2 rounded bg-warning/10 px-3 py-2">
          <AlertTriangle className="size-3.5 text-warning" />
          <span className="text-xs text-warning">Schema change detected — run full check for details.</span>
        </div>
      )}

      {fullResult && fullResult.hasDrift && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded bg-destructive/10 px-3 py-2">
            <AlertTriangle className="size-3.5 text-destructive" />
            <span className="text-xs text-destructive">
              {fullResult.changes.length} table(s) drifted
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto text-xs">
            {fullResult.changes.map((change) => (
              <div key={change.tableName} className="flex items-center gap-2 border-b border-border/50 py-1.5 last:border-0">
                <DiffActionBadge action={change.action} />
                <span className="font-mono">{change.tableName}</span>
                {change.columnChanges.length > 0 && (
                  <span className="text-muted-foreground">
                    ({change.columnChanges.length} column changes)
                  </span>
                )}
              </div>
            ))}
          </div>
          {fullResult.correspondingDdl && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Migration DDL
              </summary>
              <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 font-mono text-[11px]">
                {fullResult.correspondingDdl}
              </pre>
            </details>
          )}
        </div>
      )}

      {fullResult && !fullResult.hasDrift && (
        <div className="flex items-center gap-2 rounded bg-green-500/10 px-3 py-2">
          <CheckCircle className="size-3.5 text-green-500" />
          <span className="text-xs text-green-500">No drift — schema matches latest snapshot.</span>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleFullCheck}
          disabled={isChecking}
          className="gap-1.5"
        >
          {fullCheck.isPending ? (
            <RefreshCw className="size-3.5 animate-spin" />
          ) : (
            <Search className="size-3.5" />
          )}
          Full Check
        </Button>
      </div>
    </div>
  );
}

function DriftBadge({ hasDrift, isChecking }: { hasDrift?: boolean; isChecking: boolean }) {
  if (isChecking) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        <RefreshCw className="size-3 animate-spin" /> Checking
      </span>
    );
  }
  if (hasDrift) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-medium text-warning">
        <AlertTriangle className="size-3" /> Drifted
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-500">
      <CheckCircle className="size-3" /> Synced
    </span>
  );
}

function DiffActionBadge({ action }: { action: string }) {
  const styles = {
    added: 'bg-green-500/20 text-green-500',
    removed: 'bg-destructive/20 text-destructive',
    modified: 'bg-warning/20 text-warning',
  };
  const style = styles[action as keyof typeof styles] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${style}`}>
      {action}
    </span>
  );
}
