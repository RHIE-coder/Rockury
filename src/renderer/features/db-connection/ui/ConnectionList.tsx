import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { IConnectionFormData, IConnectionTestResult } from '@/entities/connection';
import {
  useConnections,
  useCreateConnection,
  useUpdateConnection,
  useDeleteConnection,
  useTestConnection,
} from '../model/useConnections';
import { useConnectionStore } from '../model/connectionStore';
import { ConnectionCard } from './ConnectionCard';
import { ConnectionForm } from './ConnectionForm';

export function ConnectionList() {
  const { data: connections, isLoading, error } = useConnections();
  const createConnection = useCreateConnection();
  const updateConnection = useUpdateConnection();
  const deleteConnection = useDeleteConnection();
  const testConnection = useTestConnection();
  const { isFormOpen, editingConnectionId, openForm, closeForm } = useConnectionStore();
  const [testResult, setTestResult] = useState<IConnectionTestResult | null>(null);

  const editingConnection = editingConnectionId
    ? connections?.find((c) => c.id === editingConnectionId) ?? null
    : null;

  function handleSave(data: IConnectionFormData) {
    if (editingConnectionId) {
      updateConnection.mutate(
        { id: editingConnectionId, ...data },
        { onSuccess: () => { closeForm(); setTestResult(null); } },
      );
    } else {
      createConnection.mutate(data, {
        onSuccess: () => { closeForm(); setTestResult(null); },
      });
    }
  }

  function handleTest(data: IConnectionFormData) {
    setTestResult(null);
    testConnection.mutate(data, {
      onSuccess: (result) => {
        setTestResult(result.data);
      },
    });
  }

  function handleDelete(id: string) {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      deleteConnection.mutate(id);
    }
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
        <Button size="sm" onClick={() => { openForm(); setTestResult(null); }}>
          <Plus className="size-4" />
          New Connection
        </Button>
      </div>

      {isFormOpen && (
        <ConnectionForm
          initialData={editingConnection}
          onSave={handleSave}
          onTest={handleTest}
          onCancel={() => { closeForm(); setTestResult(null); }}
          isLoading={createConnection.isPending || updateConnection.isPending}
          isTesting={testConnection.isPending}
          testResult={testResult}
        />
      )}

      {connections && connections.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((conn) => (
            <ConnectionCard
              key={conn.id}
              connection={conn}
              onEdit={(id) => { openForm(id); setTestResult(null); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No connections yet. Create one to get started.
        </p>
      )}
    </div>
  );
}
