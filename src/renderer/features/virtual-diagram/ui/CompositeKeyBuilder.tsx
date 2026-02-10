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
    <div className="space-y-1">
      <p className="text-[9px] text-muted-foreground">Select columns (order matters for composite keys):</p>
      <div className="space-y-0.5">
        {columns.map((col) => {
          const isSelected = selectedColumns.includes(col.name);
          const selectedIndex = selectedColumns.indexOf(col.name);
          return (
            <div key={col.id} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(col.name)}
                className="size-3"
              />
              <span className={`flex-1 ${isSelected ? 'font-medium' : 'text-muted-foreground'}`}>
                {col.name}
              </span>
              {isSelected && (
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(selectedIndex)}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                    disabled={selectedIndex === 0}
                  >
                    &uarr;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(selectedIndex)}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                    disabled={selectedIndex >= selectedColumns.length - 1}
                  >
                    &darr;
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {selectedColumns.length > 0 && (
        <p className="text-[9px] text-muted-foreground">
          Order: {selectedColumns.join(', ')}
        </p>
      )}
    </div>
  );
}
