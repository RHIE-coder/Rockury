import { ShieldCheck } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { useDiagrams } from '@/features/virtual-diagram';
import { useConnections } from '@/features/db-connection';

interface ValidationRunnerProps {
  selectedDiagramId: string;
  selectedConnectionId: string;
  onDiagramChange: (id: string) => void;
  onConnectionChange: (id: string) => void;
  onRun: () => void;
  isRunning: boolean;
}

export function ValidationRunner({
  selectedDiagramId,
  selectedConnectionId,
  onDiagramChange,
  onConnectionChange,
  onRun,
  isRunning,
}: ValidationRunnerProps) {
  const { data: diagrams } = useDiagrams('virtual');
  const { data: connections } = useConnections();

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card p-3">
      <Select
        className="h-8 w-48 text-sm"
        value={selectedDiagramId}
        onChange={(e) => onDiagramChange(e.target.value)}
      >
        <option value="">Select virtual diagram...</option>
        {diagrams?.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </Select>
      <Select
        className="h-8 w-48 text-sm"
        value={selectedConnectionId}
        onChange={(e) => onConnectionChange(e.target.value)}
      >
        <option value="">Select connection...</option>
        {connections?.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.dbType})
          </option>
        ))}
      </Select>
      <Button
        size="sm"
        onClick={onRun}
        disabled={!selectedDiagramId || !selectedConnectionId || isRunning}
      >
        <ShieldCheck className="size-4" />
        {isRunning ? 'Running...' : 'Run Validation'}
      </Button>
    </div>
  );
}
