import { useState } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { DataGrid, DataFooter } from '@/features/data-browser';
import type { IQueryResult } from '~/shared/types/db';

interface CollectionResultModalProps {
  open: boolean;
  queryName: string;
  result: IQueryResult;
  onClose: () => void;
}

export function CollectionResultModal({
  open,
  queryName,
  result,
  onClose,
}: CollectionResultModalProps) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Result —{' '}
            <span className="font-mono text-muted-foreground">{queryName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col">
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
