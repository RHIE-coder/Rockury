import { useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  useDiagramVersions,
  useRestoreDiagramVersion,
} from '@/features/virtual-diagram';

interface VersionHistoryProps {
  diagramId: string;
  onClose?: () => void;
  onRestore?: () => void;
}

export function VersionHistory({ diagramId, onClose, onRestore }: VersionHistoryProps) {
  const { data: versions, isLoading } = useDiagramVersions(diagramId);
  const restoreVersion = useRestoreDiagramVersion();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function handleRestore(versionId: string) {
    restoreVersion.mutate(versionId, {
      onSuccess: () => {
        setConfirmingId(null);
        onRestore?.();
      },
    });
  }

  return (
    <div className="w-72 rounded-lg border border-border bg-card shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h4 className="text-xs font-semibold">Version History</h4>
        {onClose && (
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <X className="size-3" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="max-h-64 overflow-y-auto p-2">
        {isLoading && (
          <p className="p-2 text-xs text-muted-foreground">Loading versions...</p>
        )}

        {!isLoading && (!versions || versions.length === 0) && (
          <p className="p-2 text-xs text-muted-foreground">
            No versions saved yet. Use the bookmark button to save a version snapshot.
          </p>
        )}

        {versions && versions.length > 0 && (
          <ul className="space-y-1">
            {versions.map((version) => (
              <li
                key={version.id}
                className="rounded border border-border p-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">v{version.versionNumber}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(version.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {confirmingId === version.id ? (
                    <div className="flex gap-1">
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => handleRestore(version.id)}
                        disabled={restoreVersion.isPending}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setConfirmingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setConfirmingId(version.id)}
                      disabled={restoreVersion.isPending}
                      title="Restore this version"
                    >
                      <RotateCcw className="size-3" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
