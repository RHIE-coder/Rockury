import { X, AlertTriangle, Info } from 'lucide-react';
import type { ICascadeResult, ICascadeNode } from '../lib/cascadeTraversal';

interface CascadeInfoPanelProps {
  simulation: ICascadeResult;
  onClose: () => void;
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    CASCADE: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
    'SET NULL': 'bg-yellow-400/20 text-yellow-700 dark:text-yellow-400',
    RESTRICT: 'bg-red-500/20 text-red-700 dark:text-red-400',
    'NO ACTION': 'bg-red-500/20 text-red-700 dark:text-red-400',
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold leading-none ${colors[action] ?? 'bg-muted text-muted-foreground'}`}>
      {action}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const isDelete = type === 'DELETE';
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold leading-none ${isDelete ? 'bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-teal-500/20 text-teal-600 dark:text-teal-400'}`}>
      {type}
    </span>
  );
}

function groupByDepth(nodes: ICascadeNode[]): Map<number, ICascadeNode[]> {
  const map = new Map<number, ICascadeNode[]>();
  for (const node of nodes) {
    const group = map.get(node.depth) ?? [];
    group.push(node);
    map.set(node.depth, group);
  }
  return map;
}

export function CascadeInfoPanel({ simulation, onClose }: CascadeInfoPanelProps) {
  const { simulationType, sourceTableName, sourceColumnName, affectedNodes, blockedNodes, isBlocked } = simulation;
  const totalAffected = affectedNodes.length;
  const totalBlocked = blockedNodes.length;
  const allNodes = [...affectedNodes, ...blockedNodes];
  const noReferences = allNodes.length === 0;

  const depthGroups = groupByDepth(allNodes);
  const sortedDepths = [...depthGroups.keys()].sort((a, b) => a - b);

  return (
    <div className="absolute bottom-4 left-4 z-50 w-80 rounded-lg border bg-background/95 shadow-lg backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <TypeBadge type={simulationType} />
        <span className="flex-1 truncate text-sm font-medium">
          {sourceTableName}
          {sourceColumnName && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">.{sourceColumnName}</span>
          )}
        </span>
        <button
          type="button"
          className="rounded p-0.5 hover:bg-accent transition-colors"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Blocked warning */}
      {isBlocked && (
        <div className="flex items-start gap-2 border-b bg-red-500/10 px-3 py-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
          <p className="text-xs text-red-600 dark:text-red-400">
            Operation blocked by RESTRICT/NO ACTION constraint on {totalBlocked} table{totalBlocked > 1 ? 's' : ''}.
          </p>
        </div>
      )}

      {/* Body */}
      <div className="max-h-64 overflow-y-auto px-3 py-2">
        {noReferences ? (
          <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
            <Info className="size-4 shrink-0" />
            No foreign keys reference this table.
          </div>
        ) : (
          <div className="space-y-2">
            {sortedDepths.map((depth) => (
              <div key={depth}>
                <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
                  Depth {depth}
                </p>
                <div className="space-y-1">
                  {depthGroups.get(depth)!.map((node) => (
                    <div
                      key={`${node.tableId}-${node.fkColumnName}`}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <ActionBadge action={node.action} />
                      <span className="flex-1 truncate font-medium">{node.tableName}</span>
                      <span className="shrink-0 text-muted-foreground">
                        via {node.fkColumnName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer summary */}
      {!noReferences && (
        <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          {totalAffected} table{totalAffected !== 1 ? 's' : ''} affected
          {totalBlocked > 0 && `, ${totalBlocked} blocked`}
        </div>
      )}
    </div>
  );
}
