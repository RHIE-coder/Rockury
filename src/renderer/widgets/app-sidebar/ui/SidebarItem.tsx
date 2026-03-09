import { NavLink } from 'react-router';
import { cn } from '@/shared/lib/utils';
import type { ISidebarService } from '../model/types';

interface SidebarItemProps {
  service: ISidebarService;
}

export function SidebarItem({ service }: SidebarItemProps) {
  const Icon = service.icon;

  if (!service.enabled) {
    return (
      <div
        className="flex flex-col items-center gap-1 px-2 py-3 text-muted-foreground/50 cursor-not-allowed"
        title={`${service.label} (Coming Soon)`}
      >
        <Icon className="size-5" />
        <span className="text-[10px] font-medium">{service.label}</span>
      </div>
    );
  }

  return (
    <NavLink
      to={service.path}
      className={({ isActive }) =>
        cn(
          'relative flex flex-col items-center gap-1 px-2 py-3 rounded-md transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          isActive && 'bg-accent text-accent-foreground',
          isActive && 'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-[3px] before:rounded-r before:bg-primary',
        )
      }
    >
      <Icon className="size-5" />
      <span className="text-[10px] font-medium">{service.label}</span>
    </NavLink>
  );
}
