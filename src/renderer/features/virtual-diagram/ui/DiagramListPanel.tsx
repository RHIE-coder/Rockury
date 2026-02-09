import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import type { IDiagram } from '~/shared/types/db';

interface DiagramListPanelProps {
  diagrams: IDiagram[];
  selectedDiagramId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function DiagramListPanel({
  diagrams,
  selectedDiagramId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onClose,
}: DiagramListPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function startRename(diagram: IDiagram) {
    setEditingId(diagram.id);
    setEditName(diagram.name);
  }

  function submitRename() {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
  }

  function confirmDelete(id: string) {
    onDelete(id);
    setDeletingId(null);
  }

  return (
    <div className="absolute left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-border bg-background shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-xs font-semibold">Diagrams</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="xs" onClick={onCreate} title="New diagram">
            <Plus className="size-3.5" />
          </Button>
          <Button variant="ghost" size="xs" onClick={onClose}>
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Diagram list */}
      <div className="flex-1 overflow-y-auto p-1">
        {diagrams.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            No diagrams yet. Click + to create one.
          </div>
        ) : (
          diagrams.map((d) => (
            <div key={d.id}>
              {/* Normal / Edit mode */}
              {editingId === d.id ? (
                <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-1.5">
                  <Input
                    className="h-6 flex-1 text-xs"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitRename();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                  />
                  <Button variant="ghost" size="xs" onClick={submitRename}>
                    <Check className="size-3 text-green-500" />
                  </Button>
                  <Button variant="ghost" size="xs" onClick={() => setEditingId(null)}>
                    <X className="size-3" />
                  </Button>
                </div>
              ) : deletingId === d.id ? (
                <div className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1.5">
                  <span className="flex-1 truncate text-xs text-destructive">
                    Delete "{d.name}"?
                  </span>
                  <Button variant="ghost" size="xs" onClick={() => confirmDelete(d.id)}>
                    <Check className="size-3 text-destructive" />
                  </Button>
                  <Button variant="ghost" size="xs" onClick={() => setDeletingId(null)}>
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(d.id)}
                  className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent ${
                    selectedDiagramId === d.id ? 'bg-primary/10 font-semibold text-primary' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{d.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      v{d.version ?? '1.0.0'} · {d.tables.length} tables
                      {d.updatedAt && ` · ${new Date(d.updatedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(d);
                      }}
                      title="Rename"
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(d.id);
                      }}
                      title="Delete"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
