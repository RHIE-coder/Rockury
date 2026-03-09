import { useState, useMemo } from 'react';
import { Code2, FileCode, ChevronRight } from 'lucide-react';
import { useDiagramStore, useDiagrams, useDiagramVersions } from '@/features/virtual-diagram';
import { DdlEditorView } from '@/features/ddl-editor';
import { Select } from '@/shared/components/ui/select';

export function StudioDdlPage() {
  const { selectedDiagramId, setSelectedDiagramId } = useDiagramStore();
  const { data: diagrams } = useDiagrams();
  const diagramId = selectedDiagramId ?? diagrams?.[0]?.id ?? '';
  const { data: versions } = useDiagramVersions(diagramId);

  const latestVersion = versions?.[0] ?? null;
  const tables = useMemo(
    () => latestVersion?.schemaSnapshot?.tables ?? [],
    [latestVersion],
  );

  const [focusTable, setFocusTable] = useState<string | null>(null);

  const handleDiagramChange = (id: string) => {
    setSelectedDiagramId(id);
    setFocusTable(null);
  };

  return (
    <div className="flex h-full">
      {/* Left: Object Tree */}
      <div className="flex w-56 shrink-0 flex-col border-r border-border">
        <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
          <Code2 className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">Object Tree</span>
        </div>
        <div className="border-b border-border px-3 py-2">
          <Select
            className="w-full text-xs"
            value={diagramId}
            onChange={(e) => handleDiagramChange(e.target.value)}
          >
            <option value="">Select diagram...</option>
            {diagrams?.filter((d) => d.type === 'virtual').map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tables.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">
              {diagramId ? 'No tables in this diagram' : 'Select a diagram'}
            </p>
          ) : (
            tables.map((table) => (
              <div
                key={table.id}
                className={`flex cursor-pointer items-center gap-2 border-b border-border/30 px-3 py-1.5 text-xs transition-colors hover:bg-accent ${
                  focusTable === table.name ? 'bg-accent font-medium' : ''
                }`}
                onClick={() => setFocusTable(table.name)}
              >
                <FileCode className="size-3 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate">{table.name}</span>
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                  {table.columns.length}
                </span>
                {focusTable === table.name && (
                  <ChevronRight className="size-3 shrink-0 text-primary" />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: DDL Editor */}
      <div className="flex-1 overflow-hidden">
        {!diagramId || !latestVersion ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p className="text-sm">Select a diagram to view DDL</p>
          </div>
        ) : (
          <DdlEditorView tables={tables} focusTableName={focusTable} />
        )}
      </div>
    </div>
  );
}
