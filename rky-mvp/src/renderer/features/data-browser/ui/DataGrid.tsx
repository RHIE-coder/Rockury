import { useMemo, useState, useCallback, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowUp, ArrowDown, ArrowUpDown, Braces, Link } from 'lucide-react';
import type { IQueryResult, IColumn, IForeignKeyRef } from '~/shared/types/db';
import { CellEditor } from './CellEditor';
import { JsonEditorModal } from './JsonEditorModal';
import { FkLookupModal } from './FkLookupModal';
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

const KEY_BADGE_STYLES: Record<string, string> = {
  PK: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  FK: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  UK: 'bg-green-500/20 text-green-700 dark:text-green-400',
  IDX: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
};

function ColumnKeyBadges({ keyTypes }: { keyTypes?: string[] }) {
  if (!keyTypes || keyTypes.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5">
      {keyTypes.map((kt) => (
        <span
          key={kt}
          className={`rounded px-1 py-0.5 text-[8px] font-bold leading-none ${KEY_BADGE_STYLES[kt] ?? 'bg-muted text-muted-foreground'}`}
        >
          {kt}
        </span>
      ))}
    </span>
  );
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
  /** Connection info for FK lookup */
  connectionId?: string;
  dbType?: 'mysql' | 'mariadb' | 'postgresql' | 'sqlite';
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
  connectionId,
  dbType = 'mysql',
}: DataGridProps) {
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; column: string } | null>(null);
  const [jsonEditor, setJsonEditor] = useState<{ row: TRow; column: string; value: unknown } | null>(null);
  const [fkLookup, setFkLookup] = useState<{ row: TRow; column: string; ref: IForeignKeyRef } | null>(null);

  // Build a column name -> metadata map for type detection, keyTypes, references
  const columnTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    if (columnMeta) {
      for (const col of columnMeta) {
        map.set(col.name, col.dataType);
      }
    }
    return map;
  }, [columnMeta]);

  const columnInfoMap = useMemo(() => {
    const map = new Map<string, IColumn>();
    if (columnMeta) {
      for (const col of columnMeta) {
        map.set(col.name, col);
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

  // Use refs so cell renderers always read the latest pending changes
  // without needing columns useMemo to recompute
  const pendingChangesRef = useRef(pendingChanges);
  pendingChangesRef.current = pendingChanges;
  const getRowKeyRef = useRef(getRowKey);
  getRowKeyRef.current = getRowKey;

  const getRowChange = useCallback(
    (row: TRow): IPendingChange | undefined => {
      if (!pendingChangesRef.current || !getRowKeyRef.current) return undefined;
      return pendingChangesRef.current.get(getRowKeyRef.current(row));
    },
    [],
  );


  const columns = useMemo<ColumnDef<TRow>[]>(() => {
    const rowNumCol: ColumnDef<TRow> = {
      id: '__rowNum',
      header: '#',
      cell: ({ row }) => {
        const isInserted = typeof row.original.__tempKey === 'string';
        if (isInserted) {
          return <span className="font-semibold text-green-600 text-[10px]">NEW</span>;
        }
        return <span className="text-muted-foreground">{pageOffset + row.index + 1}</span>;
      },
      size: 50,
      enableHiding: false,
    };

    const dataCols: ColumnDef<TRow>[] = result.columns.map((col) => ({
      accessorKey: col,
      header: () => {
        const isSorted = orderBy?.column === col;
        const dir = isSorted ? orderBy.direction : null;
        const colInfo = columnInfoMap.get(col);
        return (
          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() => onToggleSort(col)}
          >
            <ColumnKeyBadges keyTypes={colInfo?.keyTypes} />
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
        const isDate = isDateType(dataType);
        const isJson = !isDate && (isJsonType(dataType) || (typeof displayVal === 'object' && displayVal !== null && !(displayVal instanceof Date)));

        // Check if this specific cell was modified
        const isCellModified = change?.type === 'update' && change.original != null
          && change.modified[col] !== change.original[col];

        // FK reference info
        const colInfo = columnInfoMap.get(col);
        const fkRef = colInfo?.reference ?? null;

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

          // FK columns: show CellEditor with a lookup button
          if (fkRef) {
            return (
              <CellEditor
                value={displayVal}
                onSave={(newVal) => {
                  onCellSave?.(row.original, col, newVal);
                  setEditingCell(null);
                }}
                onCancel={() => setEditingCell(null)}
                extraAction={
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setFkLookup({ row: row.original, column: col, ref: fkRef });
                      setEditingCell(null);
                    }}
                    className="shrink-0 rounded bg-blue-500/20 px-1 py-0.5 text-[9px] font-bold text-blue-600 hover:bg-blue-500/30 dark:text-blue-400"
                    title={`Lookup from ${fkRef.table}.${fkRef.column}`}
                  >
                    <Link className="size-3" />
                  </button>
                }
              />
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

        // Wrap display value with modified indicator
        const modifiedClass = isCellModified ? 'rounded-sm bg-yellow-500/20 px-1 -mx-1' : '';

        // Display
        if (displayVal === null) {
          return <span className={`italic text-muted-foreground/50 ${modifiedClass}`}>NULL</span>;
        }

        // JSON display: truncated with icon
        if (isJson) {
          return (
            <span className={`flex items-center gap-1 truncate ${modifiedClass}`}>
              <Braces className="size-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{formatCellValue(displayVal)}</span>
            </span>
          );
        }

        return <span className={`truncate ${modifiedClass}`}>{formatCellValue(displayVal)}</span>;
      },
    }));

    return [rowNumCol, ...dataCols];
  // eslint-disable-next-line react-hooks/exhaustive-deps -- pendingChanges forces re-render so cells read latest refs
  }, [result.columns, pageOffset, orderBy, onToggleSort, editingCell, getRowChange, onCellSave, columnTypeMap, columnInfoMap, pendingChanges]);

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
              if (change?.type === 'insert') rowClassName = 'bg-green-500/10 hover:bg-green-500/20 border-l-2 border-l-green-500';
              if (change?.type === 'delete') rowClassName = 'bg-red-500/10 line-through opacity-60';

              return (
                <tr key={row.id} className={rowClassName}>
                  {row.getVisibleCells().map((cell) => {
                    const colId = cell.column.id;
                    const isEditable = canEdit && colId !== '__rowNum' && change?.type !== 'delete';
                    const isEditing = editingCell?.rowIndex === row.index && editingCell?.column === colId;
                    return (
                      <td
                        key={cell.id}
                        className={`max-w-xs truncate border-b border-r border-border px-3 py-1 font-mono ${
                          isEditable ? 'cursor-pointer' : ''
                        } ${isEditing ? 'relative overflow-visible' : ''}`}
                        onDoubleClick={() => {
                          if (isEditable) {
                            // For JSON columns, open modal directly
                            const dataType = columnTypeMap.get(colId) ?? '';
                            const val = change ? change.modified[colId] : row.original[colId];
                            if (!isDateType(dataType) && (isJsonType(dataType) || (typeof val === 'object' && val !== null && !(val instanceof Date)))) {
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

      {fkLookup && connectionId && (
        <FkLookupModal
          open
          connectionId={connectionId}
          dbType={dbType}
          refTable={fkLookup.ref.table}
          refColumn={fkLookup.ref.column}
          columnName={fkLookup.column}
          onSelect={(val) => {
            onCellSave?.(fkLookup.row, fkLookup.column, val);
          }}
          onClose={() => setFkLookup(null)}
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
    <div className="absolute left-0 top-0 z-20 flex min-w-[240px] items-center gap-1 rounded border border-primary bg-background p-1 shadow-lg">
      <input
        type={inputType}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(text || null);
          if (e.key === 'Escape') onCancel();
        }}
        autoFocus
        className="w-full rounded border border-border bg-background px-1 py-0.5 text-xs font-mono outline-none focus:border-primary"
      />
      <button
        type="button"
        onClick={() => onSave(text || null)}
        className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground"
      >
        OK
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground"
      >
        ESC
      </button>
    </div>
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
