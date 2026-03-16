import { Columns3 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/components/ui/popover';
import type { VisibilityState } from '@tanstack/react-table';

interface ColumnVisibilityProps {
  columns: string[];
  visibility: VisibilityState;
  onChange: (vis: VisibilityState) => void;
}

export function ColumnVisibility({ columns, visibility, onChange }: ColumnVisibilityProps) {
  const allVisible = columns.every((c) => visibility[c] !== false);

  function toggleAll() {
    const next: VisibilityState = {};
    const newVal = !allVisible;
    for (const col of columns) {
      next[col] = newVal;
    }
    onChange(next);
  }

  function toggle(col: string) {
    onChange({ ...visibility, [col]: visibility[col] === false });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="xs" title="Columns">
          <Columns3 className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-2">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium">Columns</span>
          <button type="button" onClick={toggleAll} className="text-[10px] text-primary hover:underline">
            {allVisible ? 'Hide all' : 'Show all'}
          </button>
        </div>
        <div className="flex max-h-64 flex-col overflow-y-auto">
          {columns.map((col) => (
            <label key={col} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted cursor-pointer">
              <input
                type="checkbox"
                checked={visibility[col] !== false}
                onChange={() => toggle(col)}
                className="size-3"
              />
              <span className="truncate">{col}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
