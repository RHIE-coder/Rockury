import { Database, Code2, Globe, Server } from 'lucide-react';
import { ROUTES } from '@/shared/config/constants';
import type { ISidebarService } from '../model/types';
import { SidebarItem } from './SidebarItem';

const services: ISidebarService[] = [
  { id: 'api', label: 'API', icon: Globe, path: ROUTES.API, enabled: false },
  { id: 'code', label: 'Code', icon: Code2, path: ROUTES.CODE, enabled: false },
  { id: 'db', label: 'DB', icon: Database, path: ROUTES.DB.ROOT, enabled: true },
  { id: 'infra', label: 'Infra', icon: Server, path: ROUTES.INFRA, enabled: false },
];

export function AppSidebar() {
  return (
    <aside className="flex flex-col items-center w-16 border-r bg-muted/30 py-2 gap-1">
      {services.map((service) => (
        <SidebarItem key={service.id} service={service} />
      ))}
    </aside>
  );
}
