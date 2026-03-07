import { ShieldCheck } from 'lucide-react';

export function ValidationRunPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <ShieldCheck className="size-4" />
        <h2 className="text-sm font-semibold">Validation Run Results</h2>
      </div>
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">Validation run results triggered via Package will appear here</p>
      </div>
    </div>
  );
}
