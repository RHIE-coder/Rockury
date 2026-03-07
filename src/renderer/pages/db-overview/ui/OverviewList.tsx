import { useMemo } from 'react';
import { Database, GitBranch, FileCode } from 'lucide-react';
import type { IConnection, IDiagram, ISeedFile } from '~/shared/types/db';

interface OverviewListProps {
  connections: IConnection[];
  diagrams: IDiagram[];
  seeds: ISeedFile[];
}

type ResourceType = 'Connection' | 'Diagram' | 'Seed';
type ResourceStatus = 'active' | 'idle' | 'draft';

interface ResourceRow {
  id: string;
  name: string;
  type: ResourceType;
  icon: React.ElementType;
  usedBy: string[];
  status: ResourceStatus;
}

const STATUS_STYLES: Record<ResourceStatus, { dot: string; label: string }> = {
  active: { dot: 'bg-green-500', label: 'Active' },
  idle: { dot: 'bg-muted-foreground', label: 'Idle' },
  draft: { dot: 'bg-yellow-500', label: 'Draft' },
};

export function OverviewList({ connections, diagrams, seeds }: OverviewListProps) {
  const rows = useMemo<ResourceRow[]>(() => {
    const result: ResourceRow[] = [];

    const virtualDiagrams = diagrams.filter((d) => d.type === 'virtual');
    const connDiagramMap = new Map<string, string[]>();
    for (const d of virtualDiagrams) {
      if (d.connectionId) {
        const list = connDiagramMap.get(d.connectionId) ?? [];
        list.push(d.name);
        connDiagramMap.set(d.connectionId, list);
      }
    }

    for (const conn of connections) {
      result.push({
        id: conn.id,
        name: conn.name,
        type: 'Connection',
        icon: Database,
        usedBy: connDiagramMap.get(conn.id) ?? [],
        status: 'active',
      });
    }

    for (const diag of virtualDiagrams) {
      const connName = connections.find((c) => c.id === diag.connectionId)?.name;
      result.push({
        id: diag.id,
        name: diag.name,
        type: 'Diagram',
        icon: GitBranch,
        usedBy: connName ? [connName] : [],
        status: diag.tables?.length ? 'active' : 'draft',
      });
    }

    for (const seed of seeds) {
      const relatedDiagrams = virtualDiagrams
        .filter((d) => {
          const tableNames = new Set((d.tables ?? []).map((t) => t.name));
          return (seed.targetTables ?? []).some((t) => tableNames.has(t));
        })
        .map((d) => d.name);
      result.push({
        id: seed.id,
        name: seed.name,
        type: 'Seed',
        icon: FileCode,
        usedBy: relatedDiagrams,
        status: 'draft',
      });
    }

    return result;
  }, [connections, diagrams, seeds]);

  if (rows.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border">
        <p className="text-xs text-muted-foreground">
          No resources yet. Create connections and diagrams to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-accent/30">
            <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Resource</th>
            <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Type</th>
            <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Used By</th>
            <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const Icon = row.icon;
            const statusStyle = STATUS_STYLES[row.status];

            return (
              <tr key={`${row.type}-${row.id}`} className="border-b border-border/50 last:border-b-0 hover:bg-accent/20">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">{row.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <span className="text-xs text-muted-foreground">{row.type}</span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {row.usedBy.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground">--</span>
                    ) : (
                      row.usedBy.map((name) => (
                        <span
                          key={name}
                          className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {name}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1.5">
                    <div className={`size-1.5 rounded-full ${statusStyle.dot}`} />
                    <span className="text-xs text-muted-foreground">{statusStyle.label}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
