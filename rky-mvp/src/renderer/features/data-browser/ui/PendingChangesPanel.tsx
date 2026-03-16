import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface PendingChangesPanelProps {
  changeCount: number;
  sqlStatements: string[];
  isApplying: boolean;
  onApply: () => void;
  onDiscard: () => void;
}

export function PendingChangesPanel({
  changeCount,
  sqlStatements,
  isApplying,
  onApply,
  onDiscard,
}: PendingChangesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (changeCount === 0) return null;

  return (
    <div className="border-t border-orange-400/30 bg-orange-500/5">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-500/10"
        onClick={() => setIsExpanded((v) => !v)}
      >
        {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        Pending Changes ({changeCount})
      </button>

      {isExpanded && (
        <div className="px-3 pb-2">
          <div className="mb-2 max-h-32 overflow-y-auto rounded border border-border bg-background p-2 font-mono text-[11px]">
            {sqlStatements.map((sql, i) => (
              <div
                key={i}
                className={`py-0.5 ${
                  sql.startsWith('DELETE') ? 'text-red-500' :
                  sql.startsWith('INSERT') ? 'text-green-500' :
                  'text-yellow-500'
                }`}
              >
                {sql};
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="default"
              size="xs"
              onClick={onApply}
              disabled={isApplying}
            >
              {isApplying ? 'Applying...' : `Apply ${changeCount} change${changeCount > 1 ? 's' : ''}`}
            </Button>
            <Button variant="outline" size="xs" onClick={onDiscard} disabled={isApplying}>
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
