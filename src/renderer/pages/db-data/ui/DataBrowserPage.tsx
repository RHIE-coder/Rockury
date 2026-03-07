import { Table } from 'lucide-react';

export function DataBrowserPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Table className="size-4" />
        <h2 className="text-sm font-semibold">Data Browser</h2>
      </div>
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">Table data viewer with pagination coming soon</p>
      </div>
    </div>
  );
}
