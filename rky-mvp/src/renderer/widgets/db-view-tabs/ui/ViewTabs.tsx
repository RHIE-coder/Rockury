import type { IViewTabItem } from '../model/types';
import { ViewTab } from './ViewTab';

interface ViewTabsProps {
  items: IViewTabItem[];
  areaRoot?: string;
}

export function ViewTabs({ items, areaRoot }: ViewTabsProps) {
  return (
    <nav className="flex items-center border-b px-2 overflow-x-auto bg-muted/20">
      {items.map((item) => (
        <ViewTab key={item.id} item={item} areaRoot={areaRoot} />
      ))}
    </nav>
  );
}
