import { ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import type { IColumn } from '~/shared/types/db';

interface CompositeKeyBuilderProps {
  columns: IColumn[];
  selectedColumns: string[];
  onChange: (columns: string[]) => void;
}

export function CompositeKeyBuilder({ columns, selectedColumns, onChange }: CompositeKeyBuilderProps) {
  function handleToggle(columnName: string) {
    if (selectedColumns.includes(columnName)) {
      onChange(selectedColumns.filter((c) => c !== columnName));
    } else {
      onChange([...selectedColumns, columnName]);
    }
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const arr = [...selectedColumns];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    onChange(arr);
  }

  function handleMoveDown(index: number) {
    if (index >= selectedColumns.length - 1) return;
    const arr = [...selectedColumns];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    onChange(arr);
  }

  return (
    <div className="space-y-2">
      {/* Selected columns - reorderable list */}
      {selectedColumns.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Column order
          </p>
          <div className="rounded border border-border bg-muted/30">
            {selectedColumns.map((colName, index) => (
              <div
                key={colName}
                className="flex items-center gap-1 border-b border-border/50 px-1.5 py-1 last:border-b-0"
              >
                <GripVertical className="size-3 shrink-0 text-muted-foreground/50" />
                <span className="flex size-4 shrink-0 items-center justify-center rounded bg-primary text-[9px] font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="flex-1 truncate text-xs font-medium">{colName}</span>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index >= selectedColumns.length - 1}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All columns - checkbox list */}
      <div className="space-y-0.5">
        <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          {selectedColumns.length > 0 ? 'Add / remove columns' : 'Select columns'}
        </p>
        {columns.map((col) => {
          const isSelected = selectedColumns.includes(col.name);
          return (
            <label
              key={col.id}
              className={`flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-xs hover:bg-muted ${
                isSelected ? 'font-medium' : 'text-muted-foreground'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(col.name)}
                className="size-3"
              />
              {col.name}
            </label>
          );
        })}
      </div>
    </div>
  );
}
