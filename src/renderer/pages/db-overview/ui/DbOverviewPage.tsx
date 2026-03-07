import { LayoutDashboard } from 'lucide-react';

export function DbOverviewPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
      <LayoutDashboard className="size-12" />
      <h1 className="text-xl font-semibold">Overview</h1>
      <p className="text-sm">Dependency graph & impact map coming soon</p>
    </div>
  );
}
