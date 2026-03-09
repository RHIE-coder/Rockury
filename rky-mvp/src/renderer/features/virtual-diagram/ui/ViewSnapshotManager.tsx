import { useState } from 'react';
import { Camera, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import type { IDiagramFilter, IDiagramLayout, IViewSnapshot } from '~/shared/types/db';
import { useViewSnapshots, useCreateViewSnapshot, useRestoreViewSnapshot, useDeleteViewSnapshot } from '../model/useViewSnapshots';

interface ViewSnapshotManagerProps {
  diagramId: string;
  currentFilter: IDiagramFilter;
  currentLayout: IDiagramLayout | null;
  onRestore: (snapshot: IViewSnapshot) => void;
  onClose: () => void;
}

export function ViewSnapshotManager({
  diagramId,
  currentFilter,
  currentLayout,
  onRestore,
  onClose,
}: ViewSnapshotManagerProps) {
  const { data: snapshots = [] } = useViewSnapshots(diagramId);
  const createSnapshot = useCreateViewSnapshot();
  const restoreSnapshot = useRestoreViewSnapshot();
  const deleteSnapshot = useDeleteViewSnapshot();
  const [newName, setNewName] = useState('');

  function handleCreate() {
    if (!newName.trim() || !currentLayout) return;
    createSnapshot.mutate({
      diagramId,
      name: newName.trim(),
      filter: currentFilter,
      layout: currentLayout,
    });
    setNewName('');
  }

  function handleRestore(snapshotId: string) {
    restoreSnapshot.mutate(snapshotId, {
      onSuccess: (result) => {
        if (result.success) {
          onRestore(result.data);
        }
      },
    });
  }

  function handleDelete(snapshotId: string) {
    deleteSnapshot.mutate({ snapshotId, diagramId });
  }

  return (
    <div className="w-64 rounded-lg border border-border bg-popover shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Camera className="size-3.5" />
          View Snapshots
        </div>
        <Button variant="ghost" size="xs" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Create new snapshot */}
      <div className="flex gap-1 border-b border-border p-2">
        <Input
          className="h-7 flex-1 text-xs"
          placeholder="Snapshot name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <Button
          variant="outline"
          size="xs"
          onClick={handleCreate}
          disabled={!newName.trim() || !currentLayout || createSnapshot.isPending}
        >
          Save
        </Button>
      </div>

      {/* Snapshot list */}
      <div className="max-h-60 overflow-y-auto p-1">
        {snapshots.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            No snapshots saved yet
          </p>
        ) : (
          snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="flex items-center gap-1 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
            >
              <span className="flex-1 truncate">{snapshot.name}</span>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleRestore(snapshot.id)}
                title="Restore this view"
              >
                <RotateCcw className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleDelete(snapshot.id)}
                title="Delete snapshot"
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
