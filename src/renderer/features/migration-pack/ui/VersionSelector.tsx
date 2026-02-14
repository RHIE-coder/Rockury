import { useState } from 'react';
import { ArrowRight, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { useValidateAgainstVersion } from '@/features/schema-snapshot';
import type { IDiagramVersion, IValidationResult } from '~/shared/types/db';

interface VersionSelectorProps {
  connectionId: string;
  versions: IDiagramVersion[];
  onGenerate: (sourceVersionId: string | null, targetVersionId: string) => void;
  isGenerating: boolean;
}

export function VersionSelector({ connectionId, versions, onGenerate, isGenerating }: VersionSelectorProps) {
  const [sourceVersionId, setSourceVersionId] = useState<string>('');
  const [targetVersionId, setTargetVersionId] = useState<string>('');
  const [validation, setValidation] = useState<IValidationResult | null>(null);

  const validateMutation = useValidateAgainstVersion();

  function handleValidate() {
    if (!sourceVersionId) return;
    validateMutation.mutate(
      { connectionId, versionId: sourceVersionId },
      {
        onSuccess: (result) => {
          if (result.success) setValidation(result.data);
        },
      },
    );
  }

  const canGenerate = !!targetVersionId && sourceVersionId !== targetVersionId;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Step 1: Select Versions</h3>

      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">Source Version (current state)</label>
          <Select
            className="h-8 w-full text-sm"
            value={sourceVersionId}
            onChange={(e) => { setSourceVersionId(e.target.value); setValidation(null); }}
          >
            <option value="">(empty schema)</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.schemaSnapshot?.tables?.length ?? 0}t)
              </option>
            ))}
          </Select>
        </div>

        <ArrowRight className="mt-5 size-4 shrink-0 text-muted-foreground" />

        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">Target Version (desired state)</label>
          <Select
            className="h-8 w-full text-sm"
            value={targetVersionId}
            onChange={(e) => setTargetVersionId(e.target.value)}
          >
            <option value="">Select target...</option>
            {versions
              .filter((v) => v.id !== sourceVersionId)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.schemaSnapshot?.tables?.length ?? 0}t)
                </option>
              ))}
          </Select>
        </div>
      </div>

      {/* Pre-Apply Validation */}
      {sourceVersionId && (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Pre-Apply Validation</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 gap-1 px-2 text-xs"
              onClick={handleValidate}
              disabled={validateMutation.isPending}
            >
              {validateMutation.isPending ? (
                <><Loader2 className="size-3 animate-spin" />Validating...</>
              ) : (
                <><ShieldCheck className="size-3" />Validate DB State</>
              )}
            </Button>
          </div>

          {validation && (
            <div className="mt-2">
              {validation.isValid ? (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <ShieldCheck className="size-3.5" />
                  DB matches source version ({validation.matchedTables}/{validation.totalTables} tables)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="size-3.5" />
                  {validation.diffs.length} table(s) differ from source version
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => onGenerate(sourceVersionId || null, targetVersionId)}
          disabled={!canGenerate || isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Migration Pack →'}
        </Button>
      </div>
    </div>
  );
}
