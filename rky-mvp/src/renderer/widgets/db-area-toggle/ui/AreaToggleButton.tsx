import { NavLink } from 'react-router';
import { cn } from '@/shared/lib/utils';
import type { IDbAreaItem } from '../model/types';

interface AreaToggleButtonProps {
  item: IDbAreaItem;
}

export function AreaToggleButton({ item }: AreaToggleButtonProps) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        )
      }
    >
      <Icon className="size-4" />
      <span>{item.label}</span>
    </NavLink>
  );
}
