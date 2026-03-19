import { useMemo, useState, useCallback, useRef } from 'react';
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
import { formatDateForDisplay } from '../lib/timezone';
import type { TDateDisplayMode } from '../lib/timezone';
import type { IPendingChange } from '../model/usePendingChanges';

type TRow = Record<string, unknown>;

/** Format a cell value for display — handles objects, arrays, dates */
function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? '' : val.toISOString();
  }
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
  /** Called when user wants to look up an FK value */
  onFkLookup?: (row: TRow, column: string) => void;
  /** Timezone for date column conversion */
  timezone?: string;
  /** Global date display mode: raw / utc / local */
  dateDisplayMode?: TDateDisplayMode;
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
  onFkLookup,
  timezone,
  dateDisplayMode = 'raw',
}: DataGridProps) {
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; column: string } | null>(null);
  const [jsonEditor, setJsonEditor] = useState<{ row: TRow; column: string; value: unknown } | null>(null);

  // Floating hover preview
  const [hoverCell, setHoverCell] = useState<{ rect: DOMRect; text: string } | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCellMouseEnter = useCallback((e: React.MouseEvent<HTMLTableCellElement>, text: string) => {
    if (!text || text.length < 10) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHoverCell({ rect, text });
    }, 250);
  }, []);

  const handleCellMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    setHoverCell(null);
  }, []);


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
        const dataType = columnTypeMap.get(col);
        return (
          <div className="flex flex-col items-start">
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
            {dataType && (
              <span className="text-[9px] font-normal text-muted-foreground/70">
                {dataType}
              </span>
            )}
          </div>
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

          // FK columns: no direct editing — handled via onDoubleClick → onFkLookup
          if (fkRef) {
            setEditingCell(null);
            return null;
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
        // Date columns always use formatDateForDisplay
        const titleText = isDate && displayVal != null
          ? formatDateForDisplay(displayVal, dateDisplayMode, timezone ?? '')
          : formatCellValue(displayVal);

        // Display
        if (displayVal === null) {
          return <span className={`italic text-muted-foreground/50 ${modifiedClass}`}>NULL</span>;
        }

        // JSON display: truncated with icon
        if (isJson) {
          return (
            <span className={`flex items-center gap-1 truncate ${modifiedClass}`}>
              <Braces className="size-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{titleText}</span>
            </span>
          );
        }

        return <span className={`truncate ${modifiedClass}`}>{titleText}</span>;
      },
    }));

    return [rowNumCol, ...dataCols];
  // eslint-disable-next-line react-hooks/exhaustive-deps -- pendingChanges forces re-render so cells read latest refs
  }, [result.columns, pageOffset, orderBy, onToggleSort, editingCell, getRowChange, onCellSave, columnTypeMap, columnInfoMap, pendingChanges, timezone, dateDisplayMode]);

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
                    const cellVal = colId === '__rowNum' ? '' : formatCellValue(
                      change ? change.modified[colId] : row.original[colId],
                    );
                    return (
                      <td
                        key={cell.id}
                        className={`max-w-xs truncate border-b border-r border-border px-3 py-1 font-mono ${
                          isEditable ? 'cursor-pointer' : ''
                        } ${isEditing ? 'relative overflow-visible' : ''}`}
                        onMouseEnter={(e) => handleCellMouseEnter(e, cellVal)}
                        onMouseLeave={handleCellMouseLeave}
                        onDoubleClick={() => {
                          if (isEditable) {
                            const colInfo = columnInfoMap.get(colId);
                            const fkRef = colInfo?.reference ?? null;
                            if (fkRef && onFkLookup) {
                              onFkLookup(row.original, colId);
                              return;
                            }
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

      {/* Floating hover preview */}
      {hoverCell && (
        <div
          className="pointer-events-none fixed z-50 max-w-md whitespace-pre-wrap break-all rounded-md border border-border bg-popover px-3 py-1.5 font-mono text-xs text-popover-foreground shadow-lg"
          style={{ left: hoverCell.rect.left, top: hoverCell.rect.bottom + 2 }}
        >
          {hoverCell.text}
        </div>
      )}

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

/** Inline date/time input — text-based to support ms/ns precision */
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
  const hint = getDateHint(dataType);
  const [text, setText] = useState(() => formatDateInitial(value));

  return (
    <div className="absolute left-0 top-0 z-20 flex min-w-[280px] flex-col gap-1 rounded border border-primary bg-background p-1.5 shadow-lg">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(text || null);
          if (e.key === 'Escape') onCancel();
        }}
        autoFocus
        placeholder={hint}
        className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs font-mono outline-none focus:border-primary"
      />
      <div className="flex items-center gap-1">
        <span className="flex-1 text-[9px] text-muted-foreground/60">{hint}</span>
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            const pad = (n: number, w = 2) => String(n).padStart(w, '0');
            const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
            setText(ts);
          }}
          className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground hover:text-foreground"
          title="Insert current time"
        >
          NOW
        </button>
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
    </div>
  );
}

/** Convert value to compact editable string: YYYY-MM-DD HH:mm:ss[.SSS] */
function formatDateInitial(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    const pad = (n: number, w = 2) => String(n).padStart(w, '0');
    const ms = value.getUTCMilliseconds();
    const base = `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())} ${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())}`;
    return ms > 0 ? `${base}.${pad(ms, 3)}` : base;
  }
  let str = String(value).trim();
  // Strip quotes
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1);
  }
  // If already compact-ish (YYYY-MM-DD ...) return as-is
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.replace('T', ' ').replace('Z', '');
  }
  // Fallback: parse and format
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const ms = d.getUTCMilliseconds();
  const base = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  return ms > 0 ? `${base}.${pad(ms, 3)}` : base;
}

function getDateHint(dataType: string): string {
  const lower = dataType.toLowerCase();
  if (lower.startsWith('time') && !lower.includes('stamp')) return 'HH:mm:ss[.SSS]';
  if (lower === 'date') return 'YYYY-MM-DD';
  if (lower === 'year') return 'YYYY';
  return 'YYYY-MM-DD HH:mm:ss[.SSS]';
}
