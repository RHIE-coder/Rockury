import { useDiagramStore } from '@/features/virtual-diagram';
import type { TDiagramTab } from '@/features/virtual-diagram';

const TABS: { key: TDiagramTab; label: string }[] = [
  { key: 'virtual', label: 'Design' },
  { key: 'diff', label: 'Diff' },
];

export function DiagramTabBar() {
  const {
    activeTab,
    setActiveTab,
  } = useDiagramStore();

  return (
    <div className="flex items-center justify-center border-b border-border px-3 py-1">
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
  );
}
