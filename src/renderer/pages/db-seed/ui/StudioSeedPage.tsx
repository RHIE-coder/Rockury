import { useState } from 'react';
import { Sprout, Plus, Trash2, Save, FileEdit } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useSeeds, useCreateSeed, useUpdateSeed, useDeleteSeed } from '@/features/seed';
import type { ISeedFile } from '~/shared/types/db';

export function StudioSeedPage() {
  const { data: seeds, isLoading } = useSeeds();
  const createSeed = useCreateSeed();
  const updateSeed = useUpdateSeed();
  const deleteSeed = useDeleteSeed();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDml, setEditDml] = useState('');
  const [editTables, setEditTables] = useState('');

  const selectedSeed = seeds?.find((s) => s.id === selectedId);

  const selectSeed = (seed: ISeedFile) => {
    setSelectedId(seed.id);
    setEditName(seed.name);
    setEditDescription(seed.description);
    setEditDml(seed.dmlContent);
    setEditTables(seed.targetTables.join(', '));
  };

  const handleCreate = () => {
    createSeed.mutate(
      { name: 'New Seed', description: '', dmlContent: '-- INSERT statements here', targetTables: [] },
      {
        onSuccess: (result) => {
          if (result.success) selectSeed(result.data);
        },
      },
    );
  };

  const handleSave = () => {
    if (!selectedId) return;
    updateSeed.mutate({
      id: selectedId,
      name: editName,
      description: editDescription,
      dmlContent: editDml,
      targetTables: editTables.split(',').map((t) => t.trim()).filter(Boolean),
    });
  };

  const handleDelete = (id: string) => {
    deleteSeed.mutate({ id });
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  return (
    <div className="flex h-full">
      {/* Seed List */}
      <div className="flex w-60 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Sprout className="size-4" />
            <span className="text-xs font-semibold">Seeds</span>
          </div>
          <Button variant="ghost" size="icon" className="size-6" onClick={handleCreate}>
            <Plus className="size-3.5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="p-3 text-xs text-muted-foreground">Loading...</div>
          )}
          {seeds?.length === 0 && (
            <div className="p-3 text-xs text-muted-foreground">No seeds yet. Click + to create one.</div>
          )}
          {seeds?.map((seed) => (
            <div
              key={seed.id}
              className={`group flex cursor-pointer items-center justify-between border-b border-border/50 px-3 py-2 hover:bg-accent ${
                selectedId === seed.id ? 'bg-accent' : ''
              }`}
              onClick={() => selectSeed(seed)}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{seed.name}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {seed.targetTables.length > 0 ? seed.targetTables.join(', ') : 'No target tables'}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-5 opacity-0 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); handleDelete(seed.id); }}
              >
                <Trash2 className="size-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Seed Editor */}
      <div className="flex flex-1 flex-col">
        {!selectedSeed ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <p className="text-sm">Select a seed file to edit</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-border px-4 py-2">
              <FileEdit className="size-4 text-muted-foreground" />
              <input
                className="flex-1 bg-transparent text-sm font-semibold outline-none"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <Button variant="outline" size="sm" onClick={handleSave} disabled={updateSeed.isPending} className="gap-1.5">
                <Save className="size-3.5" />
                Save
              </Button>
            </div>
            <div className="flex gap-4 border-b border-border px-4 py-2">
              <div className="flex-1">
                <label className="text-[10px] font-medium text-muted-foreground">Description</label>
                <input
                  className="mt-0.5 w-full rounded border border-border bg-transparent px-2 py-1 text-xs outline-none focus:border-primary"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Seed description..."
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-medium text-muted-foreground">Target Tables (comma-separated)</label>
                <input
                  className="mt-0.5 w-full rounded border border-border bg-transparent px-2 py-1 text-xs outline-none focus:border-primary"
                  value={editTables}
                  onChange={(e) => setEditTables(e.target.value)}
                  placeholder="users, orders, ..."
                />
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <textarea
                className="h-full w-full resize-none bg-muted/30 p-4 font-mono text-xs outline-none"
                value={editDml}
                onChange={(e) => setEditDml(e.target.value)}
                placeholder="-- Write INSERT/UPDATE DML statements here..."
                spellCheck={false}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
