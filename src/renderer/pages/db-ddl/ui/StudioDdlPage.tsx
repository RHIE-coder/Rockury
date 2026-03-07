import { useMemo } from 'react';
import { useDiagramStore, useDiagrams, useDiagramVersions } from '@/features/virtual-diagram';
import { DdlEditorView } from '@/features/ddl-editor';

export function StudioDdlPage() {
  const { selectedDiagramId } = useDiagramStore();
  const { data: diagrams } = useDiagrams();
  const diagramId = selectedDiagramId ?? diagrams?.[0]?.id ?? '';
  const { data: versions } = useDiagramVersions(diagramId);

  const latestVersion = versions?.[0] ?? null;
  const tables = useMemo(
    () => latestVersion?.schemaSnapshot?.tables ?? [],
    [latestVersion],
  );

  if (!diagramId || !latestVersion) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a diagram to view DDL</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <DdlEditorView tables={tables} />
    </div>
  );
}
