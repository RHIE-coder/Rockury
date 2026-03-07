import { useState } from 'react';
import { ShieldCheck, Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { useConnections } from '@/features/db-connection';
import { useConnectionStore } from '@/features/db-connection/model/connectionStore';
import { useDiagrams } from '@/features/virtual-diagram';
import { getElectronApi } from '@/shared/api/electronApi';
import type { IValidationReport } from '~/shared/types/db';

export function ValidationRunPage() {
  const { data: connections } = useConnections();
  const { selectedConnectionId } = useConnectionStore();
  const { data: diagrams } = useDiagrams();

  const [diagramId, setDiagramId] = useState('');
  const [report, setReport] = useState<IValidationReport | null>(null);

  const connectionId = selectedConnectionId ?? connections?.[0]?.id ?? '';
  const virtualDiagrams = diagrams?.filter((d) => d.type === 'virtual') ?? [];

  const runValidation = useMutation({
    mutationFn: async (args: { virtualDiagramId: string; connectionId: string }) => {
      const api = getElectronApi();
      const res = await api.VALIDATION_RUN(args);
      if (!res.success) throw new Error('Validation failed');
      return res.data;
    },
  });

  const handleRun = () => {
    if (!connectionId || !diagramId) return;
    runValidation.mutate(
      { virtualDiagramId: diagramId, connectionId },
      { onSuccess: (data) => setReport(data) },
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <ShieldCheck className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Validation Run</h2>
        <Select
          value={diagramId}
          onChange={(e) => setDiagramId(e.target.value)}
          className="ml-4 w-48"
        >
          <option value="">Select diagram...</option>
          {virtualDiagrams.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
        <Button
          variant="default"
          size="sm"
          onClick={handleRun}
          disabled={!connectionId || !diagramId || runValidation.isPending}
          className="gap-1.5"
        >
          <Play className="size-3.5" />
          Run
        </Button>
        {!connectionId && (
          <span className="text-xs text-muted-foreground">Connect to a database first</span>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {!report && !runValidation.isPending && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p className="text-sm">Select a virtual diagram and run validation against live DB</p>
          </div>
        )}

        {runValidation.isPending && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p className="text-sm">Running validation...</p>
          </div>
        )}

        {report && (
          <div className="p-4">
            {/* Summary */}
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-border p-3">
              {report.isValid ? (
                <CheckCircle className="size-5 text-green-500" />
              ) : (
                <XCircle className="size-5 text-destructive" />
              )}
              <div>
                <div className="text-sm font-semibold">
                  {report.isValid ? 'Validation Passed' : 'Validation Failed'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {report.errors.length} error(s), {report.warnings.length} warning(s)
                </div>
              </div>
            </div>

            {/* Errors */}
            {report.errors.length > 0 && (
              <div className="mb-3">
                <h3 className="mb-1.5 text-xs font-semibold text-destructive">Errors</h3>
                {report.errors.map((err, i) => (
                  <div key={i} className="mb-1 flex items-start gap-2 rounded border border-destructive/20 bg-destructive/5 px-3 py-2">
                    <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                    <div className="text-xs">
                      <span className="font-mono font-medium">{err.tableName}</span>
                      {err.columnName && <span className="font-mono">.{err.columnName}</span>}
                      <span className="text-muted-foreground"> — {err.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {report.warnings.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-xs font-semibold text-warning">Warnings</h3>
                {report.warnings.map((warn, i) => (
                  <div key={i} className="mb-1 flex items-start gap-2 rounded border border-warning/20 bg-warning/5 px-3 py-2">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                    <div className="text-xs">
                      <span className="font-mono font-medium">{warn.tableName}</span>
                      {warn.columnName && <span className="font-mono">.{warn.columnName}</span>}
                      <span className="text-muted-foreground"> — {warn.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
