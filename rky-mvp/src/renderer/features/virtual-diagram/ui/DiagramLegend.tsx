import { useState } from 'react';
import { Info, ChevronDown, ChevronRight } from 'lucide-react';

const LEGEND_ITEMS = [
  { icon: '🔑', label: 'Primary Key', abbr: 'PK' },
  { icon: '🔗', label: 'Foreign Key', abbr: 'FK' },
  { icon: '🌐', label: 'Unique', abbr: 'UK' },
  { icon: '📇', label: 'Index', abbr: 'IDX' },
  { icon: '◆', label: 'NOT NULL', className: 'text-foreground' },
  { icon: '◇', label: 'Nullable', className: 'text-muted-foreground' },
];

const BADGE_ITEMS = [
  { badge: 'CK', label: 'Check Constraint', className: 'bg-orange-500/20 text-orange-600' },
  { badge: 'GEN', label: 'Generated Column', className: 'bg-cyan-500/20 text-cyan-600' },
  { badge: 'V', label: 'View', className: 'bg-indigo-500/20 text-indigo-600' },
  { badge: 'MV', label: 'Materialized View', className: 'bg-teal-500/20 text-teal-600' },
];

export function DiagramLegend() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      {isOpen ? (
        <div className="rounded-lg border border-border bg-background/95 shadow-lg backdrop-blur-sm">
          <button
            type="button"
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs font-semibold hover:bg-muted/50"
            onClick={() => setIsOpen(false)}
          >
            <ChevronDown className="size-3 text-muted-foreground" />
            <Info className="size-3 text-muted-foreground" />
            Legend
          </button>
          <div className="border-t border-border/50 px-3 py-2 space-y-1.5">
            {/* Key icons */}
            <div className="space-y-0.5">
              {LEGEND_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-[11px]">
                  <span className={`w-4 shrink-0 text-center ${item.className ?? ''}`}>{item.icon}</span>
                  <span className="text-muted-foreground">{item.label}</span>
                  {item.abbr && (
                    <span className="ml-auto text-[9px] text-muted-foreground/60">{item.abbr}</span>
                  )}
                </div>
              ))}
            </div>
            {/* Badges */}
            <div className="border-t border-border/30 pt-1.5 space-y-0.5">
              {BADGE_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-[11px]">
                  <span className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold leading-none ${item.className}`}>
                    {item.badge}
                  </span>
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-border bg-background/95 px-2.5 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm hover:bg-muted/50 hover:text-foreground"
          onClick={() => setIsOpen(true)}
        >
          <ChevronRight className="size-3" />
          <Info className="size-3" />
          Legend
        </button>
      )}
    </div>
  );
}
