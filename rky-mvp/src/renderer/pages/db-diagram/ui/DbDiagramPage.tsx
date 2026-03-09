import { useDiagramStore } from '@/features/virtual-diagram';
import { VirtualDiagramView } from '@/features/virtual-diagram';
import { RealDiagramView } from '@/features/real-diagram';
import { DiffView } from '@/features/diagram-diff';
import { DiagramTabBar } from './DiagramTabBar';

export function DbDiagramPage() {
  const { activeTab } = useDiagramStore();

  return (
    <div className="flex h-full flex-col">
      {/* Global Tab Bar */}
      <DiagramTabBar />

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          {activeTab === 'virtual' && <VirtualDiagramView />}
          {activeTab === 'real' && <RealDiagramView />}
          {activeTab === 'diff' && <DiffView />}
        </div>
      </div>
    </div>
  );
}
