import { Code } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useDiagramStore } from '@/features/virtual-diagram';
import type { TDiagramTab } from '@/features/virtual-diagram';

const TABS: { key: TDiagramTab; label: string }[] = [
  { key: 'virtual', label: 'Virtual' },
  { key: 'real', label: 'Real' },
  { key: 'diff', label: 'Diff' },
];

export function DiagramTabBar() {
  const {
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
  } = useDiagramStore();

  return (
    <div className="grid grid-cols-3 items-center border-b border-border px-3 py-1">
      {/* Left: spacer */}
      <div />

      {/* Center: Tab selector */}
      <div className="flex justify-center">
        <div className="flex rounded-md border border-border">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1 text-xs transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: DDL/Canvas toggle */}
      <div className="flex justify-end">
        <Button
          variant={viewMode === 'ddl' ? 'secondary' : 'ghost'}
          size="xs"
          onClick={() => setViewMode(viewMode === 'ddl' ? 'canvas' : 'ddl')}
          title={viewMode === 'ddl' ? 'Switch to Canvas' : 'Switch to DDL'}
        >
          <Code className="size-3.5" />
          {viewMode === 'ddl' ? 'Canvas' : 'DDL'}
        </Button>
      </div>
    </div>
  );
}
