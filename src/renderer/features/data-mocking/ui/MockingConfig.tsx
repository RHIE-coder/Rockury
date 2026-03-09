import { useState } from 'react';
import { Shuffle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { useDiagrams, useDiagram } from '@/features/virtual-diagram';

interface MockingConfigProps {
  onGenerate: (args: { tableIds: string[]; diagramId: string; rowCount: number }) => void;
  isGenerating: boolean;
}

export function MockingConfig({ onGenerate, isGenerating }: MockingConfigProps) {
  const { data: diagrams } = useDiagrams('virtual');
  const [selectedDiagramId, setSelectedDiagramId] = useState('');
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [rowCount, setRowCount] = useState(10);
  const { data: diagram } = useDiagram(selectedDiagramId);

  function handleDiagramChange(id: string) {
    setSelectedDiagramId(id);
    setSelectedTableIds([]);
  }

  function toggleTable(tableId: string) {
    setSelectedTableIds((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId],
    );
  }

  function selectAllTables() {
    if (diagram) {
      setSelectedTableIds(diagram.tables.map((t) => t.id));
    }
  }

  function handleGenerate() {
    if (!selectedDiagramId || selectedTableIds.length === 0) return;
    onGenerate({
      tableIds: selectedTableIds,
      diagramId: selectedDiagramId,
      rowCount,
    });
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Select
          className="h-8 w-48 text-sm"
          value={selectedDiagramId}
          onChange={(e) => handleDiagramChange(e.target.value)}
        >
          <option value="">Select diagram...</option>
          {diagrams?.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
        <div className="flex items-center gap-1">
          <label htmlFor="row-count" className="text-sm">Rows:</label>
          <Input
            id="row-count"
            type="number"
            min={1}
            max={10000}
            className="h-8 w-24 text-sm"
            value={rowCount}
            onChange={(e) => setRowCount(Number(e.target.value))}
          />
        </div>
      </div>

      {diagram && diagram.tables.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Tables:</span>
            <Button variant="ghost" size="xs" onClick={selectAllTables}>
              Select All
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {diagram.tables.map((table) => (
              <label
                key={table.id}
                className={`flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-xs transition-colors ${
                  selectedTableIds.includes(table.id)
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <input
                  type="checkbox"
                  className="size-3"
                  checked={selectedTableIds.includes(table.id)}
                  onChange={() => toggleTable(table.id)}
                />
                {table.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <Button
        size="sm"
        onClick={handleGenerate}
        disabled={isGenerating || !selectedDiagramId || selectedTableIds.length === 0}
      >
        <Shuffle className="size-4" />
        {isGenerating ? 'Generating...' : 'Generate Mock Data'}
      </Button>
    </div>
  );
}
