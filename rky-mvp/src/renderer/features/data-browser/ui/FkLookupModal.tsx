import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { queryApi } from '@/features/query-execution/api/queryApi';
import { quoteIdentifier } from '../model/sqlBuilder';

type TDbType = 'mysql' | 'mariadb' | 'postgresql' | 'sqlite';
type TRow = Record<string, unknown>;

const PAGE_SIZE = 50;

interface FkLookupModalProps {
  open: boolean;
  connectionId: string;
  dbType: TDbType;
  refTable: string;
  refColumn: string;
  columnName: string;
  onSelect: (value: unknown) => void;
  onClose: () => void;
}

export function FkLookupModal({
  open,
  connectionId,
  dbType,
  refTable,
  refColumn,
  columnName,
  onSelect,
  onClose,
}: FkLookupModalProps) {
  const [columns, setColumns] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [rows, setRows] = useState<TRow[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedRow, setSelectedRow] = useState<TRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch rows with pagination and search
  useEffect(() => {
    if (!open || !connectionId || !refTable || !refColumn) return;

    setIsLoading(true);
    setError(null);

    const qt = quoteIdentifier(refTable, dbType);
    const qc = quoteIdentifier(refColumn, dbType);
    const offset = page * PAGE_SIZE;

    let where = '';
    if (search) {
      const escaped = search.replace(/'/g, "''");
      where = ` WHERE CAST(${qc} AS CHAR) LIKE '%${escaped}%'`;
      if (dbType === 'postgresql') {
        where = ` WHERE ${qc}::text ILIKE '%${escaped}%'`;
      }
    }

    const dataSql = `SELECT * FROM ${qt}${where} ORDER BY ${qc} LIMIT ${PAGE_SIZE} OFFSET ${offset}`;
    const countSql = `SELECT COUNT(*) AS cnt FROM ${qt}${where}`;

    Promise.all([
      queryApi.execute({ connectionId, sql: dataSql }),
      queryApi.execute({ connectionId, sql: countSql }),
    ]).then(([dataResult, countResult]) => {
      if (dataResult.success && dataResult.data) {
        setColumns(dataResult.data.columns);
        setRows(dataResult.data.rows as TRow[]);
      } else {
        setError('Failed to load reference data');
      }
      if (countResult.success && countResult.data) {
        const countRow = countResult.data.rows[0] as Record<string, unknown> | undefined;
        setTotalCount(Number(countRow?.cnt ?? 0));
      }
      setIsLoading(false);
    }).catch(() => {
      setError('Failed to load reference data');
      setIsLoading(false);
    });
  }, [open, connectionId, dbType, refTable, refColumn, page, search]);

  // Reset page when search changes
  useEffect(() => {
    setPage(0);
    setSelectedRow(null);
  }, [search]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSearch('');
      setPage(0);
      setSelectedRow(null);
    }
  }, [open]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handleApply = () => {
    if (!selectedRow) return;
    onSelect(selectedRow[refColumn]);
    onClose();
  };

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'object') {
      try { return JSON.stringify(val); } catch { return '[object]'; }
    }
    return String(val);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Select FK Value —{' '}
            <span className="font-mono text-muted-foreground">{columnName}</span>
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              → {refTable}.{refColumn}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2" style={{ height: 380 }}>
          {/* Search */}
          <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search by ${refColumn}...`}
              autoFocus
              className="w-full bg-transparent text-xs outline-none"
            />
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto rounded-md border border-border">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Loading...
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center text-xs text-destructive">
                {error}
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-muted">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        className={`whitespace-nowrap border-b border-r border-border px-2 py-1 text-left text-[10px] font-medium ${
                          col === refColumn ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : ''
                        }`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                        No rows found
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, i) => {
                      const isSelected = selectedRow === row;
                      return (
                        <tr
                          key={i}
                          onClick={() => setSelectedRow(row)}
                          className={`cursor-pointer ${
                            isSelected
                              ? 'bg-primary/10 ring-1 ring-inset ring-primary/30'
                              : 'hover:bg-accent/50'
                          }`}
                        >
                          {columns.map((col) => (
                            <td
                              key={col}
                              className={`max-w-[160px] truncate border-b border-r border-border px-2 py-1 font-mono ${
                                col === refColumn ? 'font-semibold' : ''
                              }`}
                            >
                              {row[col] === null ? (
                                <span className="italic text-muted-foreground/50">NULL</span>
                              ) : (
                                formatValue(row[col])
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination + Selected value */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                {totalCount} rows
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="size-3" />
                </Button>
                <span className="text-[10px] text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="size-3" />
                </Button>
              </div>
            </div>

            {selectedRow && (
              <div className="rounded-md bg-blue-500/10 px-2 py-1">
                <span className="text-[10px] text-muted-foreground">Selected:</span>
                <span className="ml-1 font-mono text-xs font-semibold">
                  {formatValue(selectedRow[refColumn])}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="xs" onClick={() => { onSelect(null); onClose(); }}>
            Set NULL
          </Button>
          <Button variant="outline" size="xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="xs"
            onClick={handleApply}
            disabled={!selectedRow}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
