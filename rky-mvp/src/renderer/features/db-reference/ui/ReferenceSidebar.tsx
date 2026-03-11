import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  TableProperties,
  Link2,
  BarChart3,
  Eye,
  Cog,
  Zap,
  Shapes,
  Layers,
  Shield,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { IReferenceCategory } from '../model/types';

const CATEGORY_STYLE: Record<string, { icon: React.ElementType; color: string }> = {
  'table-column': { icon: TableProperties, color: 'text-blue-500' },
  'constraints': { icon: Link2, color: 'text-rose-500' },
  'indexes': { icon: BarChart3, color: 'text-amber-500' },
  'views': { icon: Eye, color: 'text-emerald-500' },
  'routines': { icon: Cog, color: 'text-violet-500' },
  'triggers-events': { icon: Zap, color: 'text-orange-500' },
  'types-sequences': { icon: Shapes, color: 'text-cyan-500' },
  'partitioning': { icon: Layers, color: 'text-pink-500' },
  'security': { icon: Shield, color: 'text-red-500' },
  'advanced': { icon: Sparkles, color: 'text-indigo-500' },
};

interface ReferenceSidebarProps {
  categories: IReferenceCategory[];
  selectedItemId: string | null;
  onSelect: (itemId: string) => void;
}

export function ReferenceSidebar({ categories, selectedItemId, onSelect }: ReferenceSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(categories.map((c) => c.id)),
  );

  function toggleCategory(id: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="w-60 shrink-0 overflow-y-auto border-r border-border p-2 space-y-0.5">
      {categories.map((cat) => {
        const style = CATEGORY_STYLE[cat.id];
        const Icon = style?.icon ?? TableProperties;
        const color = style?.color ?? 'text-muted-foreground';
        const isExpanded = expandedCategories.has(cat.id);

        return (
          <div key={cat.id}>
            <button
              type="button"
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold hover:bg-muted/80 transition-colors"
              onClick={() => toggleCategory(cat.id)}
            >
              {isExpanded ? (
                <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
              )}
              <Icon className={cn('size-3.5 shrink-0', color)} />
              <span className="truncate">{cat.label}</span>
              <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {cat.items.length}
              </span>
            </button>
            {isExpanded && (
              <div className="ml-5 mt-0.5 space-y-px border-l-2 border-border/50 pl-2">
                {cat.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      'block w-full rounded-md px-2 py-1 text-left text-xs transition-colors',
                      selectedItemId === item.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground/80 hover:bg-muted/60 hover:text-foreground',
                    )}
                    onClick={() => onSelect(item.id)}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
