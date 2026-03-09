import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Trash2, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import type { ISchemaChangelog, ISchemaChange } from '~/shared/types/db';
import { realDiagramApi } from '../api/realDiagramApi';

const ACTION_COLORS: Record<string, string> = {
  added: 'text-green-600 dark:text-green-400',
  removed: 'text-red-600 dark:text-red-400',
  modified: 'text-yellow-600 dark:text-yellow-400',
};

function ChangeItem({ change }: { change: ISchemaChange }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded border border-border p-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1.5 text-left"
      >
        {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        <span className={`text-xs font-medium ${ACTION_COLORS[change.action] ?? ''}`}>
          {change.action.toUpperCase()}
        </span>
        <span className="text-xs">{change.tableName}</span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {change.columnChanges.length} col(s)
        </span>
      </button>
      {expanded && change.columnChanges.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 pl-4">
          {change.columnChanges.map((col, i) => (
            <li key={`${col.columnName}-${i}`} className="flex items-center gap-1 text-[10px]">
              <Badge variant="outline" className="text-[9px] px-1 py-0">
                {col.action}
              </Badge>
              <span>{col.columnName}</span>
              {col.field && (
                <span className="text-muted-foreground">
                  {col.field}: {col.oldValue} → {col.newValue}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChangelogEntry({
  changelog,
  onDelete,
}: {
  changelog: ISchemaChangelog;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-1.5 rounded-md border border-border p-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-1 text-left"
        >
          {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          <span className="text-xs font-medium">
            {new Date(changelog.syncedAt).toLocaleString()}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {changelog.changes.length} change(s)
          </Badge>
        </button>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => onDelete(changelog.id)}
          title="Delete"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
      {expanded && (
        <div className="space-y-1">
          {changelog.changes.map((change, i) => (
            <ChangeItem key={`${change.tableName}-${i}`} change={change} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ChangelogPanelProps {
  connectionId: string;
  onClose: () => void;
}

export function ChangelogPanel({ connectionId, onClose }: ChangelogPanelProps) {
  const queryClient = useQueryClient();

  const { data: changelogs } = useQuery({
    queryKey: ['changelogs', connectionId],
    queryFn: async () => {
      const result = await realDiagramApi.listChangelogs(connectionId);
      return result.success ? result.data : [];
    },
    enabled: !!connectionId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => realDiagramApi.deleteChangelog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelogs', connectionId] });
    },
  });

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border p-2">
        <h3 className="text-sm font-semibold">Changelog</h3>
        <Button variant="ghost" size="xs" onClick={onClose}>
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {!changelogs || changelogs.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No changelogs yet. Sync to detect schema changes.
          </p>
        ) : (
          <div className="space-y-2">
            {changelogs.map((cl) => (
              <ChangelogEntry
                key={cl.id}
                changelog={cl}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
