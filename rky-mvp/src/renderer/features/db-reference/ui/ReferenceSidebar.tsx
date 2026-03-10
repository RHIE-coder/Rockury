import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { IReferenceCategory } from '../model/types';

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
    <div className="w-56 shrink-0 overflow-y-auto border-r border-border p-2">
      {categories.map((cat) => (
        <div key={cat.id} className="mb-1">
          <button
            type="button"
            className="flex w-full items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
            onClick={() => toggleCategory(cat.id)}
          >
            {expandedCategories.has(cat.id) ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            {cat.label}
            <span className="ml-auto text-[10px] text-muted-foreground/60">{cat.items.length}</span>
          </button>
          {expandedCategories.has(cat.id) && (
            <div className="ml-4">
              {cat.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    'block w-full rounded px-2 py-0.5 text-left text-xs',
                    selectedItemId === item.id
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground hover:bg-muted',
                  )}
                  onClick={() => onSelect(item.id)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
