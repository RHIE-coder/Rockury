import { useMemo, useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { IQueryResult } from '~/shared/types/db';
import { CellEditor } from './CellEditor';
import type { IPendingChange } from '../model/usePendingChanges';

type TRow = Record<string, unknown>;

interface DataGridProps {
  result: IQueryResult;
  pageOffset: number;
  orderBy: { column: string; direction: 'ASC' | 'DESC' } | null;
  onToggleSort: (column: string) => void;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (vis: VisibilityState) => void;
  // Phase 2 props
  canEdit?: boolean;
  pendingChanges?: Map<string, IPendingChange>;
  getRowKey?: (row: TRow) => string;
  onCellSave?: (row: TRow, column: string, value: unknown) => void;
  onRowContextMenu?: (e: React.MouseEvent, row: TRow, column: string) => void;
}

export function DataGrid({
  result,
  pageOffset,
  orderBy,
  onToggleSort,
  columnVisibility,
  onColumnVisibilityChange,
  canEdit = false,
  pendingChanges,
  getRowKey,
  onCellSave,
  onRowContextMenu,
}: DataGridProps) {
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; column: string } | null>(null);

  const getRowChange = useCallback(
    (row: TRow): IPendingChange | undefined => {
      if (!pendingChanges || !getRowKey) return undefined;
      return pendingChanges.get(getRowKey(row));
    },
    [pendingChanges, getRowKey],
  );

  const columns = useMemo<ColumnDef<TRow>[]>(() => {
    const rowNumCol: ColumnDef<TRow> = {
      id: '__rowNum',
      header: '#',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{pageOffset + row.index + 1}</span>
      ),
      size: 50,
      enableHiding: false,
    };

    const dataCols: ColumnDef<TRow>[] = result.columns.map((col) => ({
      accessorKey: col,
      header: () => {
        const isSorted = orderBy?.column === col;
        const dir = isSorted ? orderBy.direction : null;
        return (
          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() => onToggleSort(col)}
          >
            <span>{col}</span>
            {dir === 'ASC' && <ArrowUp className="size-3" />}
            {dir === 'DESC' && <ArrowDown className="size-3" />}
            {!dir && <ArrowUpDown className="size-3 opacity-30" />}
          </button>
        );
      },
      cell: ({ getValue, row }) => {
        const change = getRowChange(row.original);
        const displayVal = change ? change.modified[col] : getValue();

        // Check if this cell is being edited
        if (editingCell?.rowIndex === row.index && editingCell?.column === col) {
          return (
            <CellEditor
              value={displayVal}
              onSave={(newVal) => {
                onCellSave?.(row.original, col, newVal);
                setEditingCell(null);
              }}
              onCancel={() => setEditingCell(null)}
            />
          );
        }

        if (displayVal === null) {
          return <span className="italic text-muted-foreground/50">NULL</span>;
        }
        return <span className="truncate">{String(displayVal)}</span>;
      },
    }));

    return [rowNumCol, ...dataCols];
  }, [result.columns, pageOffset, orderBy, onToggleSort, editingCell, getRowChange, onCellSave]);

  const table = useReactTable({
    data: result.rows as TRow[],
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnVisibility) : updater;
      onColumnVisibilityChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 z-10 bg-muted">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="whitespace-nowrap border-b border-r border-border px-3 py-1.5 text-left text-xs font-medium"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const change = getRowChange(row.original);
            let rowClassName = 'hover:bg-accent/50';
            if (change?.type === 'update') rowClassName = 'bg-yellow-500/10 hover:bg-yellow-500/20';
            if (change?.type === 'insert') rowClassName = 'bg-green-500/10 hover:bg-green-500/20';
            if (change?.type === 'delete') rowClassName = 'bg-red-500/10 line-through opacity-60';

            return (
              <tr key={row.id} className={rowClassName}>
                {row.getVisibleCells().map((cell) => {
                  const colId = cell.column.id;
                  const isEditable = canEdit && colId !== '__rowNum' && change?.type !== 'delete';
                  return (
                    <td
                      key={cell.id}
                      className={`max-w-xs truncate border-b border-r border-border px-3 py-1 font-mono ${
                        isEditable ? 'cursor-pointer' : ''
                      }`}
                      onDoubleClick={() => {
                        if (isEditable) {
                          setEditingCell({ rowIndex: row.index, column: colId });
                        }
                      }}
                      onContextMenu={(e) => {
                        if (onRowContextMenu) {
                          e.preventDefault();
                          onRowContextMenu(e, row.original, colId);
                        }
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
