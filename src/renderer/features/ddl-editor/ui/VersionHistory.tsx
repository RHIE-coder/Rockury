import { RotateCcw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  useDiagramVersions,
  useRestoreDiagramVersion,
} from '@/features/virtual-diagram';

interface VersionHistoryProps {
  diagramId: string;
}

export function VersionHistory({ diagramId }: VersionHistoryProps) {
  const { data: versions, isLoading } = useDiagramVersions(diagramId);
  const restoreVersion = useRestoreDiagramVersion();

  function handleRestore(versionId: string) {
    if (window.confirm('Restore this version? Current changes will be overwritten.')) {
      restoreVersion.mutate(versionId);
    }
  }

  if (isLoading) {
    return <p className="p-3 text-xs text-muted-foreground">Loading versions...</p>;
  }

  if (!versions || versions.length === 0) {
    return <p className="p-3 text-xs text-muted-foreground">No versions saved yet.</p>;
  }

  return (
    <div className="space-y-1 p-3">
      <h4 className="text-xs font-semibold">Version History</h4>
      <ul className="space-y-1">
        {versions.map((version) => (
          <li
            key={version.id}
            className="flex items-center justify-between rounded border border-border p-2 text-xs"
          >
            <div>
              <span className="font-medium">v{version.versionNumber}</span>
              <span className="ml-2 text-muted-foreground">
                {new Date(version.createdAt).toLocaleString()}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleRestore(version.id)}
              disabled={restoreVersion.isPending}
            >
              <RotateCcw className="size-3" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
