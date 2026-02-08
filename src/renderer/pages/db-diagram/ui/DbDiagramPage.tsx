import { GitBranch, Code } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useDiagramStore, VirtualDiagramView } from '@/features/virtual-diagram';
import { RealDiagramView } from '@/features/real-diagram';
import { DiffView } from '@/features/diagram-diff';
import { DdlEditorView } from '@/features/ddl-editor';

const TABS = [
  { key: 'virtual' as const, label: 'Virtual' },
  { key: 'real' as const, label: 'Real' },
  { key: 'diff' as const, label: 'Diff' },
];

export function DbDiagramPage() {
  const { activeTab, setActiveTab, isDdlEditorOpen, toggleDdlEditor } = useDiagramStore();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <GitBranch className="size-5" />
          <h1 className="text-xl font-semibold">Diagram</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex rounded-md border border-border">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1 text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={toggleDdlEditor}>
            <Code className="size-4" />
            DDL Editor
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          {activeTab === 'virtual' && <VirtualDiagramView />}
          {activeTab === 'real' && <RealDiagramView />}
          {activeTab === 'diff' && <DiffView />}
        </div>
        {isDdlEditorOpen && (
          <div className="w-1/2 shrink-0">
            <DdlEditorView onClose={toggleDdlEditor} />
          </div>
        )}
      </div>
    </div>
  );
}
