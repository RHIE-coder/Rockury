import { useCallback } from 'react';
import { useDiagramStore, useDiagram, useUpdateDiagram } from '@/features/virtual-diagram';
import { VirtualDiagramView } from '@/features/virtual-diagram';
import { RealDiagramView } from '@/features/real-diagram';
import { DiffView } from '@/features/diagram-diff';
import { DdlEditorView } from '@/features/ddl-editor';
import type { ITable } from '~/shared/types/db';

export function DbDiagramPage() {
  const { activeTab, isDdlEditorOpen, toggleDdlEditor, selectedDiagramId, setChangeSource } =
    useDiagramStore();
  const { data: diagram } = useDiagram(selectedDiagramId ?? '');
  const updateDiagram = useUpdateDiagram();

  const handleDdlParsed = useCallback(
    (tables: ITable[]) => {
      if (!diagram) return;
      setChangeSource('ddl');
      updateDiagram.mutate({ id: diagram.id, tables });
      // Reset changeSource after a tick
      setTimeout(() => setChangeSource(null), 100);
    },
    [diagram, updateDiagram, setChangeSource],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          {activeTab === 'virtual' && <VirtualDiagramView />}
          {activeTab === 'real' && <RealDiagramView />}
          {activeTab === 'diff' && <DiffView />}
        </div>
        {isDdlEditorOpen && (
          <div className="w-1/2 shrink-0">
            <DdlEditorView
              tables={diagram?.tables ?? []}
              onParsed={handleDdlParsed}
              onClose={toggleDdlEditor}
            />
          </div>
        )}
      </div>
    </div>
  );
}
