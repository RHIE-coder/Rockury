import { NavLink } from 'react-router';
import { cn } from '@/shared/lib/utils';
import type { IViewTabItem } from '../model/types';

interface ViewTabProps {
  item: IViewTabItem;
}

export function ViewTab({ item }: ViewTabProps) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
          'hover:text-foreground',
          isActive
            ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary'
            : 'text-muted-foreground',
        )
      }
    >
      <Icon className="size-3.5" />
      <span>{item.label}</span>
    </NavLink>
  );
}
