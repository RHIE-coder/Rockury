import { Package, CheckCircle2, XCircle, Clock, Undo2, Trash2 } from 'lucide-react';
import { useMigrationPacks, useDeleteMigrationPack } from '../model/useMigrationPacks';
import type { TMigrationPackStatus } from '~/shared/types/db';

interface MigrationPackListProps {
  diagramId: string;
}

const STATUS_CONFIG: Record<TMigrationPackStatus, { icon: typeof CheckCircle2; label: string; color: string }> = {
  draft: { icon: Clock, label: 'Draft', color: 'text-muted-foreground' },
  reviewed: { icon: Clock, label: 'Reviewed', color: 'text-blue-500' },
  executing: { icon: Clock, label: 'Executing', color: 'text-yellow-500' },
  applied: { icon: CheckCircle2, label: 'Applied', color: 'text-green-500' },
  failed: { icon: XCircle, label: 'Failed', color: 'text-red-500' },
  rolled_back: { icon: Undo2, label: 'Rolled Back', color: 'text-orange-500' },
};

export function MigrationPackList({ diagramId }: MigrationPackListProps) {
  const { data: packs, isLoading } = useMigrationPacks(diagramId);
  const deletePack = useDeleteMigrationPack();

  if (isLoading) return <p className="py-4 text-center text-xs text-muted-foreground">Loading...</p>;
  if (!packs || packs.length === 0) return null;

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground">Migration History</span>
      <div className="space-y-1">
        {packs.map((pack) => {
          const cfg = STATUS_CONFIG[pack.status];
          const Icon = cfg.icon;
          return (
            <div key={pack.id} className="group flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
              <Package className="size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-medium">
                    {pack.diff.sourceName ?? '(empty)'} → {pack.diff.targetName}
                  </span>
                  <span className={`flex items-center gap-1 text-[10px] ${cfg.color}`}>
                    <Icon className="size-3" />
                    {cfg.label}
                  </span>
                </div>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span>{pack.diff.tableDiffs.length} changes</span>
                  <span>{new Date(pack.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                className="shrink-0 rounded p-1 opacity-0 hover:bg-muted group-hover:opacity-100"
                onClick={() => deletePack.mutate({ id: pack.id })}
              >
                <Trash2 className="size-3 text-red-400" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
