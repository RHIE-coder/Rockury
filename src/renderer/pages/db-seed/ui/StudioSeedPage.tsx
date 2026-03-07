import { Sprout } from 'lucide-react';

export function StudioSeedPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Sprout className="size-4" />
        <h2 className="text-sm font-semibold">Seed Management</h2>
      </div>
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">Seed DML management and editing coming soon</p>
      </div>
    </div>
  );
}
