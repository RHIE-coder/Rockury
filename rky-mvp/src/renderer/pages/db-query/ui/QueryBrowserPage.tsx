import { useConnectionStore } from '@/features/db-connection/model/connectionStore';
import { useConnections } from '@/features/db-connection';
import { useQueryBrowserStore } from '@/features/query-browser';
import type { TQueryBrowserTab } from '@/features/query-browser';
import { QueryTab } from '@/features/query-browser/ui/QueryTab';
import { CollectionTab } from '@/features/query-browser/ui/CollectionTab';
import { HistoryTab } from '@/features/query-browser/ui/HistoryTab';
import { HistoryDrawer } from '@/features/query-browser/ui/HistoryDrawer';
import type { TDbType } from '~/shared/types/db';
import { Clock } from 'lucide-react';

const TABS: { id: TQueryBrowserTab; label: string }[] = [
  { id: 'query', label: 'Query' },
  { id: 'collection', label: 'Collection' },
  { id: 'history', label: 'History' },
];

export function QueryBrowserPage() {
  const { selectedConnectionId } = useConnectionStore();
  const connectionId = selectedConnectionId ?? '';
  const { data: connections } = useConnections();
  const selectedConnection = connections?.find((c) => c.id === connectionId);
  const dbType: TDbType = (selectedConnection?.dbType as TDbType) ?? 'mysql';

  const { activeTab, setActiveTab, historyDrawerOpen, setHistoryDrawerOpen } = useQueryBrowserStore();

  // Handle rerun from history: switch to query tab
  // TODO: Pass sql to QueryTab's editor via store or callback
  const handleRerun = (_sql: string) => {
    setActiveTab('query');
  };

  if (!connectionId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Connect to a database first</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Tab Bar */}
      <div className="flex items-center border-b border-border bg-muted/20 px-3">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setHistoryDrawerOpen(!historyDrawerOpen)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground ${
              historyDrawerOpen ? 'bg-muted text-foreground' : ''
            }`}
            title="Recent history"
          >
            <Clock className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'query' && <QueryTab connectionId={connectionId} dbType={dbType} />}
        {activeTab === 'collection' && <CollectionTab connectionId={connectionId} dbType={dbType} />}
        {activeTab === 'history' && <HistoryTab connectionId={connectionId} onRerun={handleRerun} />}
      </div>

      {/* History Drawer */}
      <HistoryDrawer
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        connectionId={connectionId}
        onViewAll={() => {
          setActiveTab('history');
          setHistoryDrawerOpen(false);
        }}
        onRerun={handleRerun}
      />
    </div>
  );
}
