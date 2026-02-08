import { Copy } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface MigrationDdlViewProps {
  ddl: string;
}

export function MigrationDdlView({ ddl }: MigrationDdlViewProps) {
  function handleCopy() {
    navigator.clipboard.writeText(ddl);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Migration DDL</h3>
        <Button variant="ghost" size="xs" onClick={handleCopy}>
          <Copy className="size-3" />
          Copy
        </Button>
      </div>
      <pre className="max-h-96 overflow-auto rounded-md border border-border bg-muted p-3 text-xs">
        <code>{ddl || '-- No migration needed'}</code>
      </pre>
    </div>
  );
}
