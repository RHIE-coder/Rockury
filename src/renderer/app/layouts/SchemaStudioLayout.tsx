import { Outlet } from 'react-router';
import {
  GitBranch,
  Code2,
  Sprout,
  Shuffle,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { ROUTES } from '@/shared/config/constants';
import { ViewTabs } from '@/widgets/db-view-tabs';
import type { IViewTabItem } from '@/widgets/db-view-tabs';

const tabs: IViewTabItem[] = [
  { id: 'diagram', label: 'Diagram', icon: GitBranch, path: ROUTES.DB.SCHEMA_STUDIO.DIAGRAM },
  { id: 'ddl', label: 'DDL', icon: Code2, path: ROUTES.DB.SCHEMA_STUDIO.DDL },
  { id: 'seed', label: 'Seed', icon: Sprout, path: ROUTES.DB.SCHEMA_STUDIO.SEED },
  { id: 'mocking', label: 'Mocking', icon: Shuffle, path: ROUTES.DB.SCHEMA_STUDIO.MOCKING },
  { id: 'documenting', label: 'Documenting', icon: FileText, path: ROUTES.DB.SCHEMA_STUDIO.DOCUMENTING },
  { id: 'validation', label: 'Validation', icon: ShieldCheck, path: ROUTES.DB.SCHEMA_STUDIO.VALIDATION },
];

export function SchemaStudioLayout() {
  return (
    <div className="flex flex-col h-full">
      <ViewTabs items={tabs} />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
