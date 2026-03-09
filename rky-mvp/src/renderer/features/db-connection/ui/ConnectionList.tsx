import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { toast } from '@/shared/components/ui/toast';
import type { IConnectionFormData } from '@/entities/connection';
import { useQueryClient } from '@tanstack/react-query';
import {
  useConnections,
  useCreateConnection,
  useUpdateConnection,
  useDeleteConnection,
  useConnectionPassword,
  useReorderConnections,
} from '../model/useConnections';
import { useConnectionStore } from '../model/connectionStore';
import { connectionApi } from '../api/connectionApi';
import { SortableConnectionCard } from './SortableConnectionCard';
import { ConnectionForm } from './ConnectionForm';

export function ConnectionList() {
  const queryClient = useQueryClient();
  const { data: connections, isLoading, error } = useConnections();
  const createConnection = useCreateConnection();
  const updateConnection = useUpdateConnection();
  const deleteConnection = useDeleteConnection();
  const reorderConnections = useReorderConnections();
  const { isFormOpen, editingConnectionId, openForm, closeForm, statusMap, setStatus } = useConnectionStore();
  const testedRef = useRef(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const editingConnection = editingConnectionId
    ? connections?.find((c) => c.id === editingConnectionId) ?? null
    : null;

  const { data: editingPassword } = useConnectionPassword(editingConnectionId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // Auto-test all non-ignored connections on mount
  useEffect(() => {
    if (!connections || connections.length === 0 || testedRef.current) return;
    testedRef.current = true;

    const targets = connections.filter((c) => !c.ignored);
    for (const conn of targets) {
      setStatus(conn.id, 'testing');
    }

    // Test all concurrently
    targets.forEach(async (conn) => {
      try {
        const result = await connectionApi.testById(conn.id);
        if (result.success && result.data) {
          setStatus(conn.id, result.data.success ? 'connected' : 'error');
        } else {
          setStatus(conn.id, 'error');
        }
      } catch {
        setStatus(conn.id, 'error');
      }
    });

    // Set ignored connections status
    for (const conn of connections.filter((c) => c.ignored)) {
      setStatus(conn.id, 'ignored');
    }
  }, [connections, setStatus]);

  function handleSave(data: IConnectionFormData) {
    if (editingConnectionId) {
      updateConnection.mutate(
        { id: editingConnectionId, ...data },
        {
          onSuccess: () => {
            closeForm();
            toast.success('Connection updated successfully');
          },
        },
      );
    } else {
      createConnection.mutate(data, {
        onSuccess: () => {
          closeForm();
          toast.success('Connection created successfully');
        },
      });
    }
  }

  function handleDelete(id: string) {
    const conn = connections?.find((c) => c.id === id);
    setDeleteTarget(conn ? { id: conn.id, name: conn.name } : { id, name: 'this connection' });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteConnection.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success('Connection deleted');
        setDeleteTarget(null);
      },
    });
  }

  const handleTestFromCard = useCallback(async (id: string) => {
    setStatus(id, 'testing');
    try {
      const result = await connectionApi.testById(id);
      if (result.success && result.data) {
        setStatus(id, result.data.success ? 'connected' : 'error');
      } else {
        setStatus(id, 'error');
      }
    } catch {
      setStatus(id, 'error');
    }
  }, [setStatus]);

  const handleToggleIgnore = useCallback(async (id: string, ignored: boolean) => {
    try {
      await connectionApi.setIgnored(id, ignored);
      if (ignored) {
        setStatus(id, 'ignored');
      } else {
        // Test connection after un-ignoring
        setStatus(id, 'testing');
        try {
          const result = await connectionApi.testById(id);
          if (result.success && result.data) {
            setStatus(id, result.data.success ? 'connected' : 'error');
          } else {
            setStatus(id, 'error');
          }
        } catch {
          setStatus(id, 'error');
        }
      }
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    } catch {
      toast.error('Failed to update connection');
    }
  }, [setStatus]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !connections) return;

    const oldIndex = connections.findIndex((c) => c.id === active.id);
    const newIndex = connections.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(connections, oldIndex, newIndex);
    reorderConnections.mutate(reordered.map((c) => c.id));
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading connections...</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load connections.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Connections</h2>
        <Button size="sm" onClick={() => openForm()}>
          <Plus className="size-4" />
          New Connection
        </Button>
      </div>

      <ConnectionForm
        open={isFormOpen}
        onOpenChange={(open) => { if (!open) closeForm(); }}
        initialData={editingConnection}
        initialPassword={editingPassword ?? ''}
        onSave={handleSave}
        onCancel={() => closeForm()}
        isLoading={createConnection.isPending || updateConnection.isPending}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Connection</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong> connection will be permanently deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteConnection.isPending}>
              {deleteConnection.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {connections && connections.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={connections.map((c) => c.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {connections.map((conn) => (
                <SortableConnectionCard
                  key={conn.id}
                  connection={conn}
                  status={statusMap[conn.id] ?? (conn.ignored ? 'ignored' : 'disconnected')}
                  onEdit={(id) => openForm(id)}
                  onDelete={handleDelete}
                  onTestConnection={handleTestFromCard}
                  onToggleIgnore={handleToggleIgnore}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-sm text-muted-foreground">
          No connections yet. Create one to get started.
        </p>
      )}
    </div>
  );
}
