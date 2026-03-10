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

const tabs: IViewTabItem[] = [
  { id: 'connection', label: 'Connection', icon: Plug, path: ROUTES.DB.LIVE_CONSOLE.CONNECTION },
  { id: 'diagram', label: 'Diagram', icon: GitBranch, path: ROUTES.DB.LIVE_CONSOLE.DIAGRAM },
  { id: 'data', label: 'Data', icon: Table, path: ROUTES.DB.LIVE_CONSOLE.DATA },
  { id: 'sql', label: 'SQL', icon: FileCode, path: ROUTES.DB.LIVE_CONSOLE.SQL },
  { id: 'explorer', label: 'Explorer', icon: Terminal, path: ROUTES.DB.LIVE_CONSOLE.EXPLORER },
  { id: 'query-collection', label: 'Query Collection', icon: Library, path: ROUTES.DB.LIVE_CONSOLE.QUERY_COLLECTION },
  { id: 'seed', label: 'Seed', icon: Sprout, path: ROUTES.DB.LIVE_CONSOLE.SEED },
  { id: 'validation-run', label: 'Validation Run', icon: ShieldCheck, path: ROUTES.DB.LIVE_CONSOLE.VALIDATION_RUN },
];

export function LiveConsoleLayout() {
  return (
    <div className="flex flex-col h-full">
      <ViewTabs items={tabs} areaRoot={ROUTES.DB.LIVE_CONSOLE.ROOT} />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
