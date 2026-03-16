import type { IViewTabItem } from '../model/types';
import { ViewTab } from './ViewTab';

interface ViewTabsProps {
  items: IViewTabItem[];
  areaRoot?: string;
  className?: string;
}

export function ViewTabs({ items, areaRoot, className }: ViewTabsProps) {
  return (
    <nav className={`flex items-center border-b px-2 overflow-x-auto bg-muted/20 ${className ?? ''}`}>
      {items.map((item) => (
        <ViewTab key={item.id} item={item} areaRoot={areaRoot} />
      ))}
    </nav>
  );
}
