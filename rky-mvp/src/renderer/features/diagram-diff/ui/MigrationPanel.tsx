import { Check, Clock, AlertTriangle, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import type { IMigration } from '~/shared/types/db';
import { useMigrations, useApplyMigration, useRollbackMigration, useDeleteMigration } from '../model/useMigrations';

const STATUS_CONFIG: Record<string, { icon: typeof Check; label: string; variant: 'outline' | 'default' | 'destructive' | 'secondary' }> = {
  pending: { icon: Clock, label: 'Pending', variant: 'outline' },
  applied: { icon: Check, label: 'Applied', variant: 'default' },
  failed: { icon: AlertTriangle, label: 'Failed', variant: 'destructive' },
  rolled_back: { icon: Undo2, label: 'Rolled Back', variant: 'secondary' },
};

function MigrationItem({
  migration,
  onApply,
  onRollback,
  onDelete,
}: {
  migration: IMigration;
  onApply: (id: string) => void;
  onRollback: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const config = STATUS_CONFIG[migration.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center gap-2 rounded-md border border-border p-2">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">v{migration.versionNumber}</span>
          <Badge variant={config.variant} className="text-[10px]">
            <StatusIcon className="mr-1 size-3" />
            {config.label}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {migration.direction === 'virtual_to_real' ? 'V→R' : 'R→V'}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {migration.diffSnapshot.tableDiffs.length} table diff(s)
          {migration.appliedAt && ` | Applied: ${new Date(migration.appliedAt).toLocaleString()}`}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {migration.status === 'pending' && (
          <Button variant="ghost" size="xs" onClick={() => onApply(migration.id)} title="Apply migration">
            <Check className="size-3" />
          </Button>
        )}
        {migration.status === 'applied' && migration.rollbackDdl && (
          <Button variant="ghost" size="xs" onClick={() => onRollback(migration.id)} title="Rollback">
            <Undo2 className="size-3" />
          </Button>
        )}
        <Button variant="ghost" size="xs" onClick={() => onDelete(migration.id)} title="Delete">
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  );
}

interface MigrationPanelProps {
  diagramId: string;
  connectionId: string;
}

export function MigrationPanel({ diagramId, connectionId }: MigrationPanelProps) {
  const { data: migrations } = useMigrations(diagramId, connectionId);
  const applyMigration = useApplyMigration();
  const rollbackMigration = useRollbackMigration();
  const deleteMigration = useDeleteMigration();

  if (!migrations || migrations.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground">
        No migrations yet. Compare schemas and create a migration.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Migration History</h3>
      <div className="space-y-1.5">
        {migrations.map((m) => (
          <MigrationItem
            key={m.id}
            migration={m}
            onApply={(id) => applyMigration.mutate(id)}
            onRollback={(id) => rollbackMigration.mutate(id)}
            onDelete={(id) => deleteMigration.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
