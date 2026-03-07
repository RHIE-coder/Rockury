import { useDiagramStore } from '@/features/virtual-diagram';
import { VirtualDiagramView } from '@/features/virtual-diagram';
import { DiffView } from '@/features/diagram-diff';
import { DiagramTabBar } from './DiagramTabBar';

export function StudioDiagramPage() {
  const { activeTab } = useDiagramStore();

  return (
    <div className="flex h-full flex-col">
      <DiagramTabBar />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          {activeTab === 'virtual' && <VirtualDiagramView />}
          {activeTab === 'diff' && <DiffView />}
        </div>
      </div>
    </div>
  );
}
