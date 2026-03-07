import { FileCode } from 'lucide-react';

export function SqlViewerPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <FileCode className="size-4" />
        <h2 className="text-sm font-semibold">SQL Definition Viewer</h2>
      </div>
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">Read-only DDL/body viewer for schema objects coming soon</p>
      </div>
    </div>
  );
}
