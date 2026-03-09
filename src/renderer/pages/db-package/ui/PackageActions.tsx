import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sprout,
  Shuffle,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getElectronApi } from '@/shared/api/electronApi';
import type { IDiffResult } from '~/shared/types/db';

interface PackageActionsProps {
  connectionId: string;
  diagramId: string;
  versionId: string;
  seedId: string;
}

type ActionStatus = 'idle' | 'pending' | 'success' | 'error';

interface ActionState {
  status: ActionStatus;
  message?: string;
}

export function PackageActions({ connectionId, diagramId, versionId, seedId }: PackageActionsProps) {
  const api = getElectronApi();
  const [forwardState, setForwardState] = useState<ActionState>({ status: 'idle' });
  const [reverseState, setReverseState] = useState<ActionState>({ status: 'idle' });
  const [validationState, setValidationState] = useState<ActionState>({ status: 'idle' });
  const [seedState, setSeedState] = useState<ActionState>({ status: 'idle' });
  const [mockState, setMockState] = useState<ActionState>({ status: 'idle' });
  const [diffPreview, setDiffPreview] = useState<IDiffResult | null>(null);

  const forwardPreCheck = useMutation({
    mutationFn: () => api.FORWARD_PRE_CHECK({ connectionId, diagramId, targetVersionId: versionId }),
    onMutate: () => setForwardState({ status: 'pending' }),
    onSuccess: (res) => {
      if (res.success) {
        setForwardState({ status: 'success', message: `${res.data.migrationStatements.length} statements ready` });
        setDiffPreview(res.data.diff);
      } else {
        setForwardState({ status: 'error', message: 'Pre-check failed' });
      }
    },
    onError: () => setForwardState({ status: 'error', message: 'Pre-check failed' }),
  });

  const reverseSync = useMutation({
    mutationFn: () => api.SCHEMA_APPLY_REAL_TO_VIRTUAL({ virtualDiagramId: diagramId, connectionId }),
    onMutate: () => setReverseState({ status: 'pending' }),
    onSuccess: (res) => {
      if (res.success) {
        setReverseState({ status: 'success', message: 'Schema imported' });
      } else {
        setReverseState({ status: 'error', message: 'Reverse failed' });
      }
    },
    onError: () => setReverseState({ status: 'error', message: 'Reverse failed' }),
  });

  const validationRun = useMutation({
    mutationFn: () => api.VALIDATION_RUN({ virtualDiagramId: diagramId, connectionId }),
    onMutate: () => setValidationState({ status: 'pending' }),
    onSuccess: (res) => {
      if (res.success) {
        const { summary } = res.data;
        setValidationState({
          status: res.data.isValid ? 'success' : 'error',
          message: `${summary.errors} errors, ${summary.warnings} warnings`,
        });
      } else {
        setValidationState({ status: 'error', message: 'Validation failed' });
      }
    },
    onError: () => setValidationState({ status: 'error', message: 'Validation failed' }),
  });

  const seedApply = useMutation({
    mutationFn: () => api.SEED_APPLY({ seedId, connectionId }),
    onMutate: () => setSeedState({ status: 'pending' }),
    onSuccess: (res) => {
      if (res.success) {
        setSeedState({ status: 'success', message: `${res.data.appliedRows} rows applied` });
      } else {
        setSeedState({ status: 'error', message: 'Seed apply failed' });
      }
    },
    onError: () => setSeedState({ status: 'error', message: 'Seed apply failed' }),
  });

  const mockGenerate = useMutation({
    mutationFn: async () => {
      const diagramRes = await api.DIAGRAM_GET({ id: diagramId });
      if (!diagramRes.success) throw new Error('Failed to get diagram');
      const tableIds = diagramRes.data.tables.map((t) => t.id);
      const mockRes = await api.MOCK_GENERATE({ tableIds, diagramId, rowCount: 10 });
      if (!mockRes.success) throw new Error('Mock generation failed');
      const applyRes = await api.MOCK_APPLY({ connectionId, mockResult: mockRes.data });
      return applyRes;
    },
    onMutate: () => setMockState({ status: 'pending' }),
    onSuccess: (res) => {
      if (res.success) {
        setMockState({ status: 'success', message: `${res.data.appliedRows} rows inserted` });
      } else {
        setMockState({ status: 'error', message: 'Mock apply failed' });
      }
    },
    onError: () => setMockState({ status: 'error', message: 'Mock generation failed' }),
  });

  const isDisabled = !connectionId || !diagramId;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <ActionCard
          icon={<ArrowRight className="size-4" />}
          label="Forward"
          description="Apply design to Real DB"
          state={forwardState}
          onClick={() => forwardPreCheck.mutate()}
          disabled={isDisabled || !versionId}
          color="text-blue-500"
        />
        <ActionCard
          icon={<ArrowLeft className="size-4" />}
          label="Reverse"
          description="Import Real DB to design"
          state={reverseState}
          onClick={() => reverseSync.mutate()}
          disabled={isDisabled}
          color="text-purple-500"
        />
        <ActionCard
          icon={<ShieldCheck className="size-4" />}
          label="Validation Run"
          description="Execute validation suite"
          state={validationState}
          onClick={() => validationRun.mutate()}
          disabled={isDisabled}
          color="text-amber-500"
        />
        <ActionCard
          icon={<Sprout className="size-4" />}
          label="Seed Apply"
          description="Apply seed data to DB"
          state={seedState}
          onClick={() => seedApply.mutate()}
          disabled={isDisabled || !seedId}
          color="text-green-500"
        />
        <ActionCard
          icon={<Shuffle className="size-4" />}
          label="Mocking Run"
          description="Generate mock data"
          state={mockState}
          onClick={() => mockGenerate.mutate()}
          disabled={isDisabled}
          color="text-orange-500"
        />
      </div>

      {/* Diff Preview */}
      {diffPreview && diffPreview.hasDifferences && (
        <DiffPreview diff={diffPreview} onClose={() => setDiffPreview(null)} />
      )}
    </div>
  );
}

function ActionCard({
  icon,
  label,
  description,
  state,
  onClick,
  disabled,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  state: ActionState;
  onClick: () => void;
  disabled: boolean;
  color: string;
}) {
  const isPending = state.status === 'pending';

  return (
    <button
      onClick={onClick}
      disabled={disabled || isPending}
      className="flex items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className={color}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {state.status === 'success' && <CheckCircle2 className="size-3 text-green-500" />}
          {state.status === 'error' && <XCircle className="size-3 text-destructive" />}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {state.message ?? description}
        </div>
      </div>
    </button>
  );
}

function DiffPreview({ diff, onClose }: { diff: IDiffResult; onClose: () => void }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="rounded-lg border border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-accent/50"
      >
        <span className="text-sm font-medium text-foreground">
          Migration Preview ({diff.tableDiffs.length} table changes)
        </span>
        {isExpanded ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <div className="border-t border-border p-4">
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-muted/30 p-3 font-mono text-xs text-foreground">
            {diff.migrationDdl || 'No migration DDL generated'}
          </pre>
          <div className="mt-3 flex justify-end">
            <button
              onClick={onClose}
              className="rounded px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
