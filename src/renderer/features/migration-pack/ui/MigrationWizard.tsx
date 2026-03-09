import { useState } from 'react';
import { useCreateMigrationPack, useExecuteMigrationPack, useRollbackMigrationPack } from '../model/useMigrationPacks';
import { VersionSelector } from './VersionSelector';
import { MigrationReview } from './MigrationReview';
import { ExecutionView } from './ExecutionView';
import { VerificationView } from './VerificationView';
import type { IDiagramVersion, IMigrationPack } from '~/shared/types/db';

interface MigrationWizardProps {
  diagramId: string;
  connectionId: string;
  versions: IDiagramVersion[];
  onComplete?: () => void;
}

type WizardStep = 'select' | 'review' | 'execute' | 'verify';

const STEP_LABELS: Record<WizardStep, string> = {
  select: 'Select Versions',
  review: 'Review',
  execute: 'Execute',
  verify: 'Verify',
};

const STEPS: WizardStep[] = ['select', 'review', 'execute', 'verify'];

export function MigrationWizard({ diagramId, connectionId, versions, onComplete }: MigrationWizardProps) {
  const [step, setStep] = useState<WizardStep>('select');
  const [pack, setPack] = useState<IMigrationPack | null>(null);

  const createPack = useCreateMigrationPack();
  const executePack = useExecuteMigrationPack();
  const rollbackPack = useRollbackMigrationPack();

  function handleGenerate(sourceVersionId: string | null, targetVersionId: string) {
    createPack.mutate(
      { connectionId, diagramId, sourceVersionId, targetVersionId },
      {
        onSuccess: (result) => {
          if (result.success) {
            setPack(result.data);
            setStep('review');
          }
        },
      },
    );
  }

  function handleApply() {
    if (!pack) return;
    executePack.mutate(
      { id: pack.id },
      {
        onSuccess: (result) => {
          if (result.success) {
            setPack(result.data);
            setStep(result.data.status === 'applied' ? 'execute' : 'execute');
          }
        },
      },
    );
  }

  function handleRollback() {
    if (!pack) return;
    rollbackPack.mutate(
      { id: pack.id },
      {
        onSuccess: (result) => {
          if (result.success) {
            setPack(result.data);
          }
        },
      },
    );
  }

  const currentStepIndex = STEPS.indexOf(step);

  return (
    <div className="space-y-4">
      {/* Step indicators */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <span className={`flex size-5 items-center justify-center rounded-full text-[10px] font-medium ${
              i < currentStepIndex
                ? 'bg-primary text-primary-foreground'
                : i === currentStepIndex
                  ? 'bg-primary/20 text-primary ring-1 ring-primary'
                  : 'bg-muted text-muted-foreground'
            }`}>
              {i + 1}
            </span>
            <span className={`text-[10px] ${i === currentStepIndex ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
              {STEP_LABELS[s]}
            </span>
            {i < STEPS.length - 1 && (
              <span className="mx-1 text-muted-foreground/40">—</span>
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 'select' && (
        <VersionSelector
          connectionId={connectionId}
          versions={versions}
          onGenerate={handleGenerate}
          isGenerating={createPack.isPending}
        />
      )}

      {step === 'review' && pack && (
        <MigrationReview
          pack={pack}
          onBack={() => setStep('select')}
          onApply={handleApply}
          isApplying={executePack.isPending}
        />
      )}

      {step === 'execute' && pack && (
        <ExecutionView
          pack={pack}
          onRollback={handleRollback}
          onNext={() => setStep('verify')}
          isRollingBack={rollbackPack.isPending}
        />
      )}

      {step === 'verify' && pack && (
        <VerificationView
          pack={pack}
          onComplete={() => onComplete?.()}
        />
      )}
    </div>
  );
}
