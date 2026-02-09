import { useEffect, useRef } from 'react';
import { Table2, PanelLeftClose } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { ITable, ISearchResult } from '~/shared/types/db';

interface TableListPanelProps {
  tables: ITable[];
  selectedTableId: string | null;
  searchResults: ISearchResult[];
  onTableSelect: (tableId: string) => void;
  onClose: () => void;
}

export function TableListPanel({
  tables,
  selectedTableId,
  searchResults,
  onTableSelect,
  onClose,
}: TableListPanelProps) {
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const matchedTableIds = new Set(
    searchResults.filter((r) => r.type === 'table').map((r) => r.tableId),
  );

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
        <Button variant="ghost" size="xs" onClick={onClose} title="Hide panel">
          <PanelLeftClose className="size-3.5" />
        </Button>
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

              return (
                <button
                  key={table.id}
                  ref={(el) => { itemRefs.current[table.id] = el; }}
                  type="button"
                  onClick={() => onTableSelect(table.id)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted ${
                    isSelected ? 'bg-primary/10 font-semibold text-primary' : ''
                  } ${isMatched ? 'ring-1 ring-inset ring-yellow-400' : ''}`}
                >
                  <span className="flex-1 truncate">{table.name}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {table.columns.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
