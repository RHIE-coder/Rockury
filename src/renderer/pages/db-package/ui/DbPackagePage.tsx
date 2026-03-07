import { Package, ArrowRight, ArrowLeft, ShieldCheck, Sprout, Shuffle } from 'lucide-react';
import { PackageList } from '@/features/package-management';
import { usePackageStore } from '@/features/package-management';
import { Button } from '@/shared/components/ui/button';

export function DbPackagePage() {
  const { activePackageId } = usePackageStore();

  return (
    <div className="flex h-full">
      {/* Left: Package List */}
      <div className="w-64 shrink-0 overflow-y-auto border-r border-border">
        <PackageList />
      </div>

      {/* Right: Package Dashboard */}
      <div className="flex-1 overflow-y-auto p-6">
        {activePackageId ? (
          <PackageDashboard />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
            <Package className="size-12" />
            <p className="text-sm">Select a package to view dashboard</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PackageDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Orchestrator Actions</h2>
        <p className="text-sm text-muted-foreground">
          Cross-domain actions connecting Schema Studio and Live Console
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <ActionCard
          icon={<ArrowRight className="size-4" />}
          label="Forward"
          description="Apply design to Real DB"
        />
        <ActionCard
          icon={<ArrowLeft className="size-4" />}
          label="Reverse"
          description="Import Real DB to design"
        />
        <ActionCard
          icon={<ShieldCheck className="size-4" />}
          label="Validation Run"
          description="Execute validation suite"
        />
        <ActionCard
          icon={<Sprout className="size-4" />}
          label="Seed Apply"
          description="Apply seed data to DB"
        />
        <ActionCard
          icon={<Shuffle className="size-4" />}
          label="Mocking Run"
          description="Generate mock data"
        />
      </div>
    </div>
  );
}

function ActionCard({ icon, label, description }: { icon: React.ReactNode; label: string; description: string }) {
  return (
    <Button
      variant="outline"
      className="flex h-auto flex-col items-start gap-1 p-4"
      disabled
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">{description}</span>
    </Button>
  );
}
