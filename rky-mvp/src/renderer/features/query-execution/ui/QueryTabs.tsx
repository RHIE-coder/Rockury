import { Plus, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useQueryStore } from '../model/queryStore';

export function QueryTabs() {
  const { tabs, activeTabId, setActiveTabId, addTab, removeTab } = useQueryStore();

  return (
    <div className="flex items-center gap-0.5 border-b border-border bg-muted/30 px-2">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`group flex items-center gap-1 border-b-2 px-3 py-1.5 text-xs cursor-pointer transition-colors ${
            tab.id === activeTabId
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTabId(tab.id)}
        >
          <span>{tab.name}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTab(tab.id);
            }}
            className="ml-1 hidden rounded p-0.5 hover:bg-muted group-hover:inline-flex"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
      <Button variant="ghost" size="icon-xs" className="ml-1" onClick={() => addTab()}>
        <Plus className="size-3" />
      </Button>
    </div>
  );
}
