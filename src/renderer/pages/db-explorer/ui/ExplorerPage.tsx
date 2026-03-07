import { QueryPanel } from '@/features/query-execution';

export function ExplorerPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        <QueryPanel />
      </div>
    </div>
  );
}
