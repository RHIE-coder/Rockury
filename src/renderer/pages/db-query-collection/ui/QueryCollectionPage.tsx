import { QueryPanel, SavedQueryList } from '@/features/query-execution';

export function QueryCollectionPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 shrink-0 overflow-y-auto border-r border-border">
          <SavedQueryList />
        </div>
        <div className="flex-1">
          <QueryPanel />
        </div>
      </div>
    </div>
  );
}
