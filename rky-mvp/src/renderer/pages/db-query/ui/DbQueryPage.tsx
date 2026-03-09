import { Terminal } from 'lucide-react';
import { QueryPanel, SavedQueryList } from '@/features/query-execution';

export function DbQueryPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Terminal className="size-5" />
        <h1 className="text-xl font-semibold">Query</h1>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: Saved queries */}
        <div className="w-56 shrink-0 overflow-y-auto border-r border-border">
          <SavedQueryList />
        </div>
        {/* Main: Query panel */}
        <div className="flex-1">
          <QueryPanel />
        </div>
      </div>
    </div>
  );
}
