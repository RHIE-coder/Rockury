import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { IQueryResult } from '~/shared/types/db';

type TRow = Record<string, unknown>;

interface DataGridProps {
  result: IQueryResult;
  pageOffset: number;
  orderBy: { column: string; direction: 'ASC' | 'DESC' } | null;
  onToggleSort: (column: string) => void;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (vis: VisibilityState) => void;
}

export function DataGrid({
  result,
  pageOffset,
  orderBy,
  onToggleSort,
  columnVisibility,
  onColumnVisibilityChange,
}: DataGridProps) {
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
      cell: ({ getValue }) => {
        const val = getValue();
        if (val === null) {
          return <span className="italic text-muted-foreground/50">NULL</span>;
        }
        return <span className="truncate">{String(val)}</span>;
      },
    }));

    return [rowNumCol, ...dataCols];
  }, [result.columns, pageOffset, orderBy, onToggleSort]);

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
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-accent/50">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="max-w-xs truncate border-b border-r border-border px-3 py-1 font-mono"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
