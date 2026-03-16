import { useState, useCallback } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { IFilter } from '../model/sqlBuilder';

interface FilterRowProps {
  columns: string[];
  filters: IFilter[];
  onApplyFilters: (filters: IFilter[]) => void;
}

const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IS NULL', 'IS NOT NULL'] as const;

export function FilterRow({ columns, filters, onApplyFilters }: FilterRowProps) {
  const [localFilters, setLocalFilters] = useState<IFilter[]>(filters);
  const [isOpen, setIsOpen] = useState(false);

  const addFilter = useCallback(() => {
    if (columns.length === 0) return;
    setLocalFilters((f) => [...f, { column: columns[0], operator: '=', value: '' }]);
  }, [columns]);

  const removeFilter = useCallback((index: number) => {
    setLocalFilters((f) => f.filter((_, i) => i !== index));
  }, []);

  const updateFilter = useCallback((index: number, patch: Partial<IFilter>) => {
    setLocalFilters((f) => f.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }, []);

  const apply = useCallback(() => {
    const valid = localFilters.filter((f) =>
      f.operator === 'IS NULL' || f.operator === 'IS NOT NULL' || f.value.trim() !== '',
    );
    onApplyFilters(valid);
  }, [localFilters, onApplyFilters]);

  const clear = useCallback(() => {
    setLocalFilters([]);
    onApplyFilters([]);
  }, [onApplyFilters]);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        className="flex items-center gap-1.5 px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen((v) => !v)}
      >
        <Filter className="size-3" />
        Filters{filters.length > 0 && ` (${filters.length})`}
      </button>
      {isOpen && (
        <div className="space-y-1.5 px-3 pb-2">
          {localFilters.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <select
                value={f.column}
                onChange={(e) => updateFilter(i, { column: e.target.value })}
                className="rounded border border-border bg-background px-1.5 py-0.5 text-xs"
              >
                {columns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={f.operator}
                onChange={(e) => updateFilter(i, { operator: e.target.value })}
                className="rounded border border-border bg-background px-1.5 py-0.5 text-xs"
              >
                {OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}
              </select>
              {f.operator !== 'IS NULL' && f.operator !== 'IS NOT NULL' && (
                <input
                  type="text"
                  value={f.value}
                  onChange={(e) => updateFilter(i, { value: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') apply(); }}
                  placeholder="value"
                  className="min-w-[100px] rounded border border-border bg-background px-1.5 py-0.5 text-xs outline-none"
                />
              )}
              <button type="button" onClick={() => removeFilter(i)} className="text-muted-foreground hover:text-destructive">
                <X className="size-3" />
              </button>
            </div>
          ))}
          <div className="flex gap-1.5">
            <Button variant="outline" size="xs" onClick={addFilter}>+ Filter</Button>
            <Button variant="default" size="xs" onClick={apply}>Apply</Button>
            {filters.length > 0 && <Button variant="ghost" size="xs" onClick={clear}>Clear</Button>}
          </div>
        </div>
      )}
    </div>
  );
}
