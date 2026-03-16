import { useMemo, useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowUp, ArrowDown, ArrowUpDown, Braces } from 'lucide-react';
import type { IQueryResult, IColumn } from '~/shared/types/db';
import { CellEditor } from './CellEditor';
import { JsonEditorModal } from './JsonEditorModal';
import type { IPendingChange } from '../model/usePendingChanges';

type TRow = Record<string, unknown>;

/** Format a cell value for display — handles objects, arrays, dates */
function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return '[object]';
    }
  }
  return String(val);
}

const DATE_TYPE_PATTERNS = /^(date|time|datetime|timestamp|year)/i;
const JSON_TYPE_PATTERNS = /^(json|jsonb)/i;

function isDateType(dataType: string): boolean {
  return DATE_TYPE_PATTERNS.test(dataType);
}

function isJsonType(dataType: string): boolean {
  return JSON_TYPE_PATTERNS.test(dataType);
}

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
  insertedRows?: TRow[];
  getRowKey?: (row: TRow) => string;
  onCellSave?: (row: TRow, column: string, value: unknown) => void;
  onRowContextMenu?: (e: React.MouseEvent, row: TRow, column: string) => void;
  /** Column metadata for detecting date/json types */
  columnMeta?: IColumn[];
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
  insertedRows,
  getRowKey,
  onCellSave,
  onRowContextMenu,
  columnMeta,
}: DataGridProps) {
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; column: string } | null>(null);
  const [jsonEditor, setJsonEditor] = useState<{ row: TRow; column: string; value: unknown } | null>(null);

  // Build a column name -> dataType map for type detection
  const columnTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    if (columnMeta) {
      for (const col of columnMeta) {
        map.set(col.name, col.dataType);
      }
    }
    return map;
  }, [columnMeta]);

  // Merge result rows with inserted rows
  const allRows = useMemo<TRow[]>(() => {
    const rows = result.rows as TRow[];
    if (!insertedRows || insertedRows.length === 0) return rows;
    return [...rows, ...insertedRows];
  }, [result.rows, insertedRows]);

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
        const dataType = columnTypeMap.get(col) ?? '';
        const isJson = isJsonType(dataType) || (typeof displayVal === 'object' && displayVal !== null);
        const isDate = isDateType(dataType);

        // Editing state
        if (editingCell?.rowIndex === row.index && editingCell?.column === col) {
          // JSON columns open the modal instead
          if (isJson) {
            return (
              <button
                type="button"
                className="flex items-center gap-1 text-primary text-xs"
                onClick={() => {
                  setJsonEditor({ row: row.original, column: col, value: displayVal });
                  setEditingCell(null);
                }}
              >
                <Braces className="size-3" /> Edit JSON...
              </button>
            );
          }

          // Date columns use datetime-local input
          if (isDate) {
            return (
              <DateCellInput
                value={displayVal}
                dataType={dataType}
                onSave={(newVal) => {
                  onCellSave?.(row.original, col, newVal);
                  setEditingCell(null);
                }}
                onCancel={() => setEditingCell(null)}
              />
            );
          }

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

        // Display
        if (displayVal === null) {
          return <span className="italic text-muted-foreground/50">NULL</span>;
        }

        // JSON display: truncated with icon
        if (isJson) {
          return (
            <span className="flex items-center gap-1 truncate">
              <Braces className="size-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{formatCellValue(displayVal)}</span>
            </span>
          );
        }

        return <span className="truncate">{formatCellValue(displayVal)}</span>;
      },
    }));

    return [rowNumCol, ...dataCols];
  }, [result.columns, pageOffset, orderBy, onToggleSort, editingCell, getRowChange, onCellSave, columnTypeMap]);

  const table = useReactTable({
    data: allRows,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnVisibility) : updater;
      onColumnVisibilityChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
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
                            // For JSON columns, open modal directly
                            const dataType = columnTypeMap.get(colId) ?? '';
                            const val = change ? change.modified[colId] : row.original[colId];
                            if (isJsonType(dataType) || (typeof val === 'object' && val !== null)) {
                              setJsonEditor({ row: row.original, column: colId, value: val });
                            } else {
                              setEditingCell({ rowIndex: row.index, column: colId });
                            }
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

      {/* JSON Editor Modal */}
      {jsonEditor && (
        <JsonEditorModal
          open
          value={jsonEditor.value}
          columnName={jsonEditor.column}
          onSave={(val) => {
            onCellSave?.(jsonEditor.row, jsonEditor.column, val);
          }}
          onClose={() => setJsonEditor(null)}
        />
      )}
    </>
  );
}

/** Inline date/time input for date columns */
function DateCellInput({
  value,
  dataType,
  onSave,
  onCancel,
}: {
  value: unknown;
  dataType: string;
  onSave: (value: unknown) => void;
  onCancel: () => void;
}) {
  const inputType = getDateInputType(dataType);
  const initialValue = formatDateForInput(value, inputType);
  const [text, setText] = useState(initialValue);

  return (
    <input
      type={inputType}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onSave(text || null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSave(text || null);
        if (e.key === 'Escape') onCancel();
      }}
      autoFocus
      className="w-full rounded border border-primary bg-background px-1 py-0.5 text-xs font-mono outline-none"
    />
  );
}

function getDateInputType(dataType: string): string {
  const lower = dataType.toLowerCase();
  if (lower.startsWith('time') && !lower.includes('stamp')) return 'time';
  if (lower === 'date') return 'date';
  if (lower === 'year') return 'number';
  return 'datetime-local'; // datetime, timestamp
}

function formatDateForInput(value: unknown, inputType: string): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (inputType === 'datetime-local') {
    // Convert "2024-01-15 12:30:00" → "2024-01-15T12:30:00"
    return str.replace(' ', 'T').slice(0, 19);
  }
  return str;
}
