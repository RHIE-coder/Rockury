import { useState } from 'react';
import { Camera, Trash2, RefreshCw, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useSnapshots, useCreateSnapshot, useDeleteSnapshot, useValidateSnapshot, useRenameSnapshot } from '../model/useSnapshots';
import { ValidationBadge } from './ValidationBadge';
import type { ISchemaSnapshot } from '~/shared/types/db';

interface SnapshotListPanelProps {
  connectionId: string;
  onSnapshotSelect?: (snapshot: ISchemaSnapshot) => void;
}

export function SnapshotListPanel({ connectionId, onSnapshotSelect }: SnapshotListPanelProps) {
  const { data: snapshots, isLoading } = useSnapshots(connectionId);
  const createSnapshot = useCreateSnapshot();
  const deleteSnapshot = useDeleteSnapshot();
  const validateSnapshot = useValidateSnapshot();
  const renameSnapshot = useRenameSnapshot();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  function handleCreate() {
    createSnapshot.mutate({ connectionId });
  }

  function handleDelete(id: string) {
    deleteSnapshot.mutate({ id });
  }

  function handleValidate(snapshotId: string) {
    validateSnapshot.mutate({ snapshotId });
  }

  function handleStartRename(snapshot: ISchemaSnapshot) {
    setEditingId(snapshot.id);
    setEditName(snapshot.name);
  }

  function handleConfirmRename(id: string) {
    if (editName.trim()) {
      renameSnapshot.mutate({ id, name: editName.trim() });
    }
    setEditingId(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium">Snapshots</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-xs"
          onClick={handleCreate}
          disabled={createSnapshot.isPending}
        >
          <Camera className="size-3" />
          {createSnapshot.isPending ? 'Creating...' : 'Create'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Loading...</p>
        ) : !snapshots || snapshots.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No snapshots yet</p>
        ) : (
          <div className="space-y-1.5">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="group cursor-pointer rounded-md border border-border bg-card p-2.5 hover:bg-muted/50"
                onClick={() => onSnapshotSelect?.(snap)}
              >
                <div className="flex items-center gap-2">
                  <Camera className="size-3 shrink-0 text-muted-foreground" />
                  {editingId === snap.id ? (
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                      <input
                        className="min-w-0 flex-1 rounded border border-border bg-background px-1 py-0.5 text-xs"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename(snap.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button onClick={(e) => { e.stopPropagation(); handleConfirmRename(snap.id); }}>
                        <Check className="size-3 text-green-500" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }}>
                        <X className="size-3 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">{snap.name}</span>
                  )}
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
                    <button
                      className="rounded p-0.5 hover:bg-muted"
                      onClick={(e) => { e.stopPropagation(); handleStartRename(snap); }}
                    >
                      <Pencil className="size-3 text-muted-foreground" />
                    </button>
                    <button
                      className="rounded p-0.5 hover:bg-muted"
                      onClick={(e) => { e.stopPropagation(); handleValidate(snap.id); }}
                    >
                      <RefreshCw className="size-3 text-muted-foreground" />
                    </button>
                    <button
                      className="rounded p-0.5 hover:bg-muted"
                      onClick={(e) => { e.stopPropagation(); handleDelete(snap.id); }}
                    >
                      <Trash2 className="size-3 text-red-400" />
                    </button>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2 pl-5">
                  <ValidationBadge isValid={snap.isValid} validatedAt={snap.validatedAt} />
                  <span className="text-[10px] text-muted-foreground">
                    {snap.metadata.tableCount} tables
                  </span>
                  <code className="text-[9px] text-muted-foreground/60">
                    {snap.checksum.slice(0, 8)}
                  </code>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
