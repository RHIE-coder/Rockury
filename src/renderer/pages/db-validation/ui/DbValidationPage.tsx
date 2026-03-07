import { useState } from 'react';
import { ShieldCheck, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { ValidationRunner, ValidationReport } from '@/features/schema-validation';
import { validationApi } from '@/features/schema-validation/api/validationApi';
import type { IValidationReport } from '~/shared/types/db';

const VALIDATION_RULES = [
  { icon: '🔑', name: 'Primary Key', description: '모든 테이블에 PK 존재 여부 검증' },
  { icon: '🔗', name: 'Foreign Key', description: 'FK 참조 대상 테이블/컬럼 존재 여부' },
  { icon: '📝', name: 'Data Type', description: 'Virtual ↔ Real 간 데이터 타입 일치 검증' },
  { icon: '⚠️', name: 'Nullable', description: 'NOT NULL 제약 조건 불일치 감지' },
  { icon: '📊', name: 'Column Count', description: '테이블 간 컬럼 수 차이 감지' },
  { icon: '🏷️', name: 'Naming', description: '네이밍 컨벤션 위반 감지' },
];

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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5" />
          <h1 className="text-lg font-semibold">Schema Validation</h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Virtual 다이어그램과 Real DB 스키마를 비교하여 불일치를 검증합니다.
        </p>
      </div>

      {/* Runner */}
      <div className="border-b border-border px-6 py-3">
        <ValidationRunner
          selectedDiagramId={selectedDiagramId}
          selectedConnectionId={selectedConnectionId}
          onDiagramChange={setSelectedDiagramId}
          onConnectionChange={setSelectedConnectionId}
          onRun={() => runValidation.mutate()}
          isRunning={runValidation.isPending}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {runValidation.isError && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            <XCircle className="size-4 text-destructive" />
            <span className="text-sm text-destructive">Validation failed. Please check your selections.</span>
          </div>
        )}

        {report ? (
          <div className="p-6">
            {/* Summary Banner */}
            <div className={`mb-4 flex items-center gap-3 rounded-lg border p-4 ${
              report.isValid
                ? 'border-green-500/20 bg-green-500/5'
                : 'border-destructive/20 bg-destructive/5'
            }`}>
              {report.isValid ? (
                <CheckCircle className="size-6 text-green-500" />
              ) : (
                <XCircle className="size-6 text-destructive" />
              )}
              <div>
                <div className="font-semibold">
                  {report.isValid ? 'Validation Passed' : 'Validation Failed'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {report.errors.length} error(s) · {report.warnings.length} warning(s)
                </div>
              </div>
            </div>

            <ValidationReport report={report} />
          </div>
        ) : (
          /* Empty State: Validation Rules Guide */
          <div className="p-6">
            <div className="rounded-lg border border-border">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Info className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Validation Rules</span>
              </div>
              <div className="grid gap-0 divide-y divide-border/50">
                {VALIDATION_RULES.map((rule) => (
                  <div key={rule.name} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-lg">{rule.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{rule.name}</div>
                      <div className="text-xs text-muted-foreground">{rule.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 px-4 py-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Virtual 다이어그램과 Connection을 선택한 후 "Run Validation"을 실행하세요.
                Schema Studio에서 정의한 설계와 실제 DB의 차이점을 상세히 보고합니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
