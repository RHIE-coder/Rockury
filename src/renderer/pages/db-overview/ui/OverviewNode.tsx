import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Database, Package, GitBranch, Camera, FileCode, ShieldCheck } from 'lucide-react';

export interface OverviewNodeData {
  label: string;
  type: string;
  details: string;
  color: string;
  resourceType: 'connection' | 'package' | 'diagram' | 'snapshot' | 'seed' | 'validation';
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  connection: Database,
  package: Package,
  diagram: GitBranch,
  snapshot: Camera,
  seed: FileCode,
  validation: ShieldCheck,
};

function OverviewNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as OverviewNodeData;
  const Icon = TYPE_ICONS[nodeData.resourceType] ?? Database;

  return (
    <div className="min-w-[160px] rounded-lg border border-border bg-background shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      <div className={`flex items-center gap-1.5 rounded-t-lg px-3 py-1.5 text-xs font-medium text-white ${nodeData.color}`}>
        <Icon className="size-3" />
        {nodeData.type}
      </div>
      <div className="px-3 py-2">
        <div className="text-sm font-medium">{nodeData.label}</div>
        <div className="text-[10px] text-muted-foreground">{nodeData.details}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  );
}

export const OverviewNode = memo(OverviewNodeComponent);
