import { useState, useMemo } from 'react';
import { FileCode, Copy, Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { useDiagramStore } from '@/features/virtual-diagram';
import { schemaToDdl } from '@/features/ddl-editor/lib/schemaToDdl';

export function SqlViewerPage() {
  const { realTables } = useDiagramStore();
  const [selectedTable, setSelectedTable] = useState('');
  const [copied, setCopied] = useState(false);

  const tableNames = useMemo(() => realTables.map((t) => t.name).sort(), [realTables]);

  const ddl = useMemo(() => {
    if (selectedTable === '__all__') {
      return schemaToDdl(realTables);
    }
    const table = realTables.find((t) => t.name === selectedTable);
    return table ? schemaToDdl([table]) : '';
  }, [selectedTable, realTables]);

  const handleCopy = () => {
    navigator.clipboard.writeText(ddl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <FileCode className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">SQL Definition Viewer</h2>
        <Select
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
          className="ml-4 w-48"
        >
          <option value="">Select object...</option>
          <option value="__all__">All Tables</option>
          {tableNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </Select>
        {ddl && (
          <Button variant="outline" size="sm" onClick={handleCopy} className="ml-auto gap-1.5">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? 'Copied' : 'Copy DDL'}
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {!ddl ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p className="text-sm">
              {realTables.length > 0
                ? 'Select a table to view its DDL'
                : 'Sync schema first (Diagram tab) to view DDL'}
            </p>
          </div>
        ) : (
          <pre className="p-4 font-mono text-xs leading-relaxed">{ddl}</pre>
        )}
      </div>
    </div>
  );
}
