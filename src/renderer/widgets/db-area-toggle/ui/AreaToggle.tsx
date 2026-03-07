import { LayoutDashboard, Package, PenTool, Monitor } from 'lucide-react';
import { ROUTES } from '@/shared/config/constants';
import type { IDbAreaItem } from '../model/types';
import { AreaToggleButton } from './AreaToggleButton';

const areas: IDbAreaItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: ROUTES.DB.OVERVIEW },
  { id: 'package', label: 'Package', icon: Package, path: ROUTES.DB.PACKAGE },
  { id: 'studio', label: 'Schema Studio', icon: PenTool, path: ROUTES.DB.SCHEMA_STUDIO.ROOT },
  { id: 'console', label: 'Live Console', icon: Monitor, path: ROUTES.DB.LIVE_CONSOLE.ROOT },
];

export function AreaToggle() {
  return (
    <nav className="flex items-center gap-1 border-b border-border px-4 py-1.5">
      {areas.map((area) => (
        <AreaToggleButton key={area.id} item={area} />
      ))}
    </nav>
  );
}
