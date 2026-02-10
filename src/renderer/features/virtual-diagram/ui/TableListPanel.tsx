import { useEffect, useRef } from 'react';
import { Table2, PanelLeftClose, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { ITable, ISearchResult } from '~/shared/types/db';

interface TableListPanelProps {
  tables: ITable[];
  selectedTableId: string | null;
  searchResults: ISearchResult[];
  onTableSelect: (tableId: string) => void;
  onClose: () => void;
  hiddenTableIds?: string[];
  onToggleVisibility?: (tableId: string) => void;
  onShowAll?: () => void;
}

export function TableListPanel({
  tables,
  selectedTableId,
  searchResults,
  onTableSelect,
  onClose,
  hiddenTableIds = [],
  onToggleVisibility,
  onShowAll,
}: TableListPanelProps) {
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const matchedTableIds = new Set(
    searchResults.filter((r) => r.type === 'table').map((r) => r.tableId),
  );
  const hiddenSet = new Set(hiddenTableIds);
  const hasHidden = hiddenTableIds.length > 0;

  useEffect(() => {
    if (selectedTableId && itemRefs.current[selectedTableId]) {
      itemRefs.current[selectedTableId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedTableId]);

  return (
    <div className="flex h-full w-[200px] shrink-0 flex-col border-r border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Table2 className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Tables ({tables.length})</span>
        </div>
        <div className="flex items-center gap-0.5">
          {hasHidden && onShowAll && (
            <Button variant="ghost" size="xs" onClick={onShowAll} title="Show all tables">
              <Eye className="size-3" />
            </Button>
          )}
          <Button variant="ghost" size="xs" onClick={onClose} title="Hide panel">
            <PanelLeftClose className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Table list */}
      <div className="flex-1 overflow-y-auto">
        {tables.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">No tables yet.</p>
        ) : (
          <div className="py-1">
            {tables.map((table) => {
              const isSelected = table.id === selectedTableId;
              const isMatched = matchedTableIds.has(table.id);
              const isHidden = hiddenSet.has(table.id);

              return (
                <div
                  key={table.id}
                  className="flex items-center"
                >
                  <button
                    ref={(el) => { itemRefs.current[table.id] = el; }}
                    type="button"
                    onClick={() => onTableSelect(table.id)}
                    className={`flex flex-1 items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted ${
                      isSelected ? 'bg-primary/10 font-semibold text-primary' : ''
                    } ${isMatched ? 'ring-1 ring-inset ring-yellow-400' : ''} ${
                      isHidden ? 'opacity-50' : ''
                    }`}
                  >
                    <span className={`flex-1 truncate ${isHidden ? 'line-through' : ''}`}>
                      {table.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {table.columns.length}
                    </span>
                  </button>
                  {onToggleVisibility && (
                    <button
                      type="button"
                      onClick={() => onToggleVisibility(table.id)}
                      className="shrink-0 px-1.5 py-1.5 text-muted-foreground hover:text-foreground"
                      title={isHidden ? 'Show table' : 'Hide table'}
                    >
                      {isHidden ? (
                        <EyeOff className="size-3" />
                      ) : (
                        <Eye className="size-3" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
