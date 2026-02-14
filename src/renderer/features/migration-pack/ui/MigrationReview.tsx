import { useState, useCallback } from 'react';
import { Plus, Minus, Pencil, Code2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useUpdateSeedDml } from '../model/useMigrationPacks';
import type { IMigrationPack } from '~/shared/types/db';

interface MigrationReviewProps {
  pack: IMigrationPack;
  onBack: () => void;
  onApply: () => void;
  isApplying: boolean;
}

type SqlTab = 'ddl' | 'dml' | 'rollback';

const TAB_LABELS: Record<SqlTab, string> = {
  ddl: 'Update DDL',
  dml: 'Seed DML',
  rollback: 'Rollback DDL',
};

export function MigrationReview({ pack, onBack, onApply, isApplying }: MigrationReviewProps) {
  const [activeTab, setActiveTab] = useState<SqlTab>('ddl');
  const [seedDml, setSeedDml] = useState(pack.seedDml);
  const updateDml = useUpdateSeedDml();

  const handleDmlSave = useCallback(() => {
    updateDml.mutate({ id: pack.id, seedDml });
  }, [pack.id, seedDml, updateDml]);

  const stats = {
    added: pack.diff.tableDiffs.filter((t) => t.action === 'added').length,
    modified: pack.diff.tableDiffs.filter((t) => t.action === 'modified').length,
    removed: pack.diff.tableDiffs.filter((t) => t.action === 'removed').length,
  };

  const sqlContent = activeTab === 'ddl'
    ? pack.updateDdl
    : activeTab === 'dml'
      ? seedDml
      : pack.rollbackDdl;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Step 2: Review Migration</h3>

      {/* Summary */}
      <div className="flex items-center gap-4 rounded-md bg-muted/50 px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">Summary</span>
        {stats.added > 0 && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
            <Plus className="size-3" /> +{stats.added}
          </span>
        )}
        {stats.modified > 0 && (
          <span className="flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
            <Pencil className="size-3" /> ~{stats.modified}
          </span>
        )}
        {stats.removed > 0 && (
          <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
            <Minus className="size-3" /> -{stats.removed}
          </span>
        )}
      </div>

      {/* SQL Tabs */}
      <div className="overflow-hidden rounded-md border border-border">
        <div className="flex border-b border-border bg-muted/30">
          {(Object.keys(TAB_LABELS) as SqlTab[]).map((tab) => (
            <button
              key={tab}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              <Code2 className="size-3" />
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className="relative">
          {activeTab === 'dml' ? (
            <div className="flex flex-col">
              <textarea
                className="min-h-[200px] w-full resize-y bg-background p-3 font-mono text-xs focus:outline-none"
                value={seedDml}
                onChange={(e) => setSeedDml(e.target.value)}
                placeholder="-- Enter seed DML statements here (INSERT, UPDATE, etc.)"
                spellCheck={false}
              />
              <div className="flex items-center justify-end border-t border-border bg-muted/30 px-3 py-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={handleDmlSave}
                  disabled={updateDml.isPending || seedDml === pack.seedDml}
                >
                  {updateDml.isPending ? 'Saving...' : 'Save DML'}
                </Button>
              </div>
            </div>
          ) : (
            <pre className="max-h-[300px] overflow-auto p-3 text-xs">
              <code>{sqlContent || '-- No statements'}</code>
            </pre>
          )}
        </div>
      </div>

      {/* Table Changes List */}
      {pack.diff.tableDiffs.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Table Changes</span>
          <div className="max-h-[200px] space-y-1 overflow-y-auto">
            {pack.diff.tableDiffs.map((td) => {
              const Icon = td.action === 'added' ? Plus : td.action === 'removed' ? Minus : Pencil;
              const color = td.action === 'added' ? 'text-green-500' : td.action === 'removed' ? 'text-red-500' : 'text-yellow-500';
              return (
                <div key={td.tableName} className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted/50">
                  <Icon className={`size-3 ${color}`} />
                  <span className={td.action === 'removed' ? 'line-through opacity-60' : ''}>{td.tableName}</span>
                  {td.columnDiffs.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">({td.columnDiffs.length} col)</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={onBack}>← Back</Button>
        <Button size="sm" onClick={onApply} disabled={isApplying}>
          {isApplying ? 'Applying...' : 'Apply Migration →'}
        </Button>
      </div>
    </div>
  );
}
