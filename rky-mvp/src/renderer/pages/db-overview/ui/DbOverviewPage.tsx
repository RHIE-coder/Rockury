import { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Database,
  GitBranch,
  FileCode,
  Sprout,
  ShieldCheck,
  Package,
  Network,
  List,
} from 'lucide-react';
import { ReactFlowProvider } from '@xyflow/react';
import { useConnections } from '@/features/db-connection';
import { useDiagrams } from '@/features/virtual-diagram';
import { useSeeds } from '@/features/seed';
import { OverviewGraph } from './OverviewGraph';
import { OverviewList } from './OverviewList';

type ViewMode = 'graph' | 'list';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  description?: string;
}

function StatCard({ icon, label, count, description }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-4">
      <div className="flex size-10 items-center justify-center rounded-lg bg-accent">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold">{count}</div>
        <div className="text-xs font-medium">{label}</div>
        {description && <div className="text-[10px] text-muted-foreground">{description}</div>}
      </div>
    </div>
  );
}

export function DbOverviewPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('graph');

  const { data: connections } = useConnections();
  const { data: diagrams } = useDiagrams();
  const { data: seeds } = useSeeds();

  const stats = useMemo(() => {
    const virtualDiagrams = diagrams?.filter((d) => d.type === 'virtual') ?? [];
    const totalTables = virtualDiagrams.reduce((sum, d) => sum + (d.tables?.length ?? 0), 0);

    return {
      connections: connections?.length ?? 0,
      diagrams: virtualDiagrams.length,
      tables: totalTables,
      seeds: seeds?.length ?? 0,
    };
  }, [connections, diagrams, seeds]);

  const safeConnections = connections ?? [];
  const safeDiagrams = diagrams ?? [];
  const safeSeeds = seeds ?? [];

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        <LayoutDashboard className="size-5" />
        <h1 className="text-xl font-semibold">Overview</h1>
      </div>

      <div className="flex-1 space-y-6 p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<Database className="size-5 text-blue-500" />}
            label="Connections"
            count={stats.connections}
            description="Active DB connections"
          />
          <StatCard
            icon={<GitBranch className="size-5 text-purple-500" />}
            label="Diagrams"
            count={stats.diagrams}
            description="Virtual diagrams"
          />
          <StatCard
            icon={<FileCode className="size-5 text-green-500" />}
            label="Tables"
            count={stats.tables}
            description="Total across diagrams"
          />
          <StatCard
            icon={<Sprout className="size-5 text-orange-500" />}
            label="Seeds"
            count={stats.seeds}
            description="Seed DML files"
          />
        </div>

        {/* View Toggle + Resource View */}
        <div>
          <div className="mb-3 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'graph'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <Network className="size-3.5" />
              Graph
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <List className="size-3.5" />
              List
            </button>
          </div>

          {viewMode === 'graph' ? (
            <ReactFlowProvider>
              <OverviewGraph
                connections={safeConnections}
                diagrams={safeDiagrams}
                seeds={safeSeeds}
              />
            </ReactFlowProvider>
          ) : (
            <OverviewList
              connections={safeConnections}
              diagrams={safeDiagrams}
              seeds={safeSeeds}
            />
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-lg border border-border">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
            <QuickAction icon={<Package className="size-4" />} label="Package" path="/db/package" />
            <QuickAction icon={<GitBranch className="size-4" />} label="Schema Studio" path="/db/studio/diagram" />
            <QuickAction icon={<Database className="size-4" />} label="Live Console" path="/db/console/connection" />
            <QuickAction icon={<ShieldCheck className="size-4" />} label="Validation" path="/db/studio/validation" />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, path }: { icon: React.ReactNode; label: string; path: string }) {
  return (
    <a
      href={`#${path}`}
      onClick={(e) => {
        e.preventDefault();
        window.location.hash = path;
      }}
      className="flex items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </a>
  );
}
