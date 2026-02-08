import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { ValidationRunner, ValidationReport } from '@/features/schema-validation';
import { validationApi } from '@/features/schema-validation/api/validationApi';
import type { IValidationReport } from '~/shared/types/db';

export function DbValidationPage() {
  const [selectedDiagramId, setSelectedDiagramId] = useState('');
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [report, setReport] = useState<IValidationReport | null>(null);

  const runValidation = useMutation({
    mutationFn: () =>
      validationApi.run({
        virtualDiagramId: selectedDiagramId,
        connectionId: selectedConnectionId,
      }),
    onSuccess: (result) => {
      if (result.success) {
        setReport(result.data);
      }
    },
  });

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5" />
        <h1 className="text-xl font-semibold">Validation</h1>
      </div>
      <p className="text-muted-foreground">
        DB 스키마와 구조를 검증합니다.
      </p>

      <ValidationRunner
        selectedDiagramId={selectedDiagramId}
        selectedConnectionId={selectedConnectionId}
        onDiagramChange={setSelectedDiagramId}
        onConnectionChange={setSelectedConnectionId}
        onRun={() => runValidation.mutate()}
        isRunning={runValidation.isPending}
      />

      {runValidation.isError && (
        <p className="text-sm text-destructive">Validation failed. Please check your selections.</p>
      )}

      {report && <ValidationReport report={report} />}
    </div>
  );
}
