import { useState, useEffect, useCallback } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { DataGrid, DataFooter } from '@/features/data-browser';
import { queryApi } from '@/features/query-execution/api/queryApi';
import type { IQueryResult } from '~/shared/types/db';
import { Loader2 } from 'lucide-react';

interface TablePreviewModalProps {
  open: boolean;
  tableName: string;
  connectionId: string;
  onClose: () => void;
}

export function TablePreviewModal({
  open,
  tableName,
  connectionId,
  onClose,
}: TablePreviewModalProps) {
  const [result, setResult] = useState<IQueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const fetchPreview = useCallback(async () => {
    if (!tableName || !connectionId) return;
    setLoading(true);
    setError(null);
    setPage(0);
    try {
      const res = await queryApi.execute({
        connectionId,
        sql: `SELECT * FROM ${tableName} LIMIT 50`,
      });
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError('Failed to fetch preview');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [tableName, connectionId]);

  useEffect(() => {
    if (open) {
      setResult(null);
      setColumnVisibility({});
      fetchPreview();
    }
  }, [open, fetchPreview]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-sm">
            <span className="font-mono text-muted-foreground">{tableName}</span>
            <span className="ml-2 text-xs font-normal text-muted-foreground/60">Preview</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Preview data from {tableName} table
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          {loading ? (
            <div className="flex flex-1 items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : error ? (
            <div className="flex flex-1 items-center justify-center py-12 text-sm text-destructive">
              {error}
            </div>
          ) : result ? (
            <>
              <DataGrid
                result={result}
                pageOffset={page * pageSize}
                orderBy={null}
                onToggleSort={() => {}}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
                canEdit={false}
                pendingChanges={new Map()}
                insertedRows={[]}
                getRowKey={(row) => JSON.stringify(row)}
                onCellSave={() => {}}
                onRowContextMenu={() => {}}
              />
              <DataFooter
                rowCount={result.rowCount}
                executionTimeMs={result.executionTimeMs}
                page={page}
                pageSize={pageSize}
                isLoading={false}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          ) : null}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="xs" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
