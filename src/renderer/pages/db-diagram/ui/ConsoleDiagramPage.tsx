import { RealDiagramView } from '@/features/real-diagram';

export function ConsoleDiagramPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        <RealDiagramView />
      </div>
    </div>
  );
}
