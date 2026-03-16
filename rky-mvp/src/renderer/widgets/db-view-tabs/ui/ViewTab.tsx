import { NavLink, useLocation } from 'react-router';
import { useEffect } from 'react';
import { cn } from '@/shared/lib/utils';
import { useLastTabStore } from '@/shared/model/lastTabStore';
import type { IViewTabItem } from '../model/types';

interface ViewTabProps {
  item: IViewTabItem;
  areaRoot?: string;
}

export function ViewTab({ item, areaRoot }: ViewTabProps) {
  const Icon = item.icon;
  const location = useLocation();
  const setLastTab = useLastTabStore((s) => s.setLastTab);

  // Save the current tab as last visited when it becomes active
  useEffect(() => {
    if (areaRoot && location.pathname === item.path) {
      setLastTab(areaRoot, item.path);
    }
  }, [areaRoot, location.pathname, item.path, setLastTab]);

  if (item.disabled) {
    return (
      <span
        className={cn(
          'relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium',
          'text-muted-foreground/40 cursor-not-allowed',
        )}
        title="Select a connection first"
      >
        <Icon className="size-3.5" />
        <span>{item.label}</span>
      </span>
    );
  }

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
