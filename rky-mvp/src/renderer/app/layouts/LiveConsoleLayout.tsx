import { Outlet } from 'react-router';
import {
  Plug,
  GitBranch,
  Table,
  FileCode,
  Terminal,
  Library,
  Sprout,
  ShieldCheck,
} from 'lucide-react';
import { ROUTES } from '@/shared/config/constants';
import { ViewTabs } from '@/widgets/db-view-tabs';
import type { IViewTabItem } from '@/widgets/db-view-tabs';
import { useConnectionStore } from '@/features/db-connection/model/connectionStore';
import { useConnections } from '@/features/db-connection';
import { ConnectionBadge } from '@/entities/connection';
import { Badge } from '@/shared/components/ui/badge';

export function LiveConsoleLayout() {
  const { selectedConnectionId, statusMap } = useConnectionStore();
  const { data: connections } = useConnections();
  const selectedConnection = connections?.find((c) => c.id === selectedConnectionId);
  const connStatus = selectedConnectionId
    ? statusMap[selectedConnectionId] ?? (selectedConnection?.ignored ? 'ignored' : 'disconnected')
    : undefined;

  const hasConnection = !!selectedConnectionId;

  const tabs: IViewTabItem[] = [
    { id: 'connection', label: 'Connection', icon: Plug, path: ROUTES.DB.LIVE_CONSOLE.CONNECTION },
    { id: 'diagram', label: 'Diagram', icon: GitBranch, path: ROUTES.DB.LIVE_CONSOLE.DIAGRAM, disabled: !hasConnection },
    { id: 'data', label: 'Data', icon: Table, path: ROUTES.DB.LIVE_CONSOLE.DATA, disabled: !hasConnection },
    { id: 'sql', label: 'SQL', icon: FileCode, path: ROUTES.DB.LIVE_CONSOLE.SQL, disabled: !hasConnection },
    { id: 'explorer', label: 'Explorer', icon: Terminal, path: ROUTES.DB.LIVE_CONSOLE.EXPLORER, disabled: !hasConnection },
    { id: 'query-collection', label: 'Query Collection', icon: Library, path: ROUTES.DB.LIVE_CONSOLE.QUERY_COLLECTION, disabled: !hasConnection },
    { id: 'seed', label: 'Seed', icon: Sprout, path: ROUTES.DB.LIVE_CONSOLE.SEED, disabled: !hasConnection },
    { id: 'validation-run', label: 'Validation Run', icon: ShieldCheck, path: ROUTES.DB.LIVE_CONSOLE.VALIDATION_RUN, disabled: !hasConnection },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b bg-muted/20">
        <ViewTabs items={tabs} areaRoot={ROUTES.DB.LIVE_CONSOLE.ROOT} className="border-b-0 bg-transparent" />
        {selectedConnection && (
          <div className="ml-auto flex items-center gap-1.5 px-3 shrink-0">
            <ConnectionBadge status={connStatus ?? 'disconnected'} />
            <span className="text-xs font-medium truncate max-w-[120px]">{selectedConnection.name}</span>
            <Badge variant="outline" className="text-[10px] px-1 py-0">{selectedConnection.dbType}</Badge>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
