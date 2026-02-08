import { Package } from 'lucide-react';
import { PackageList } from '@/features/package-management';

export function DbPackagePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="size-5" />
        <h1 className="text-xl font-semibold">Package</h1>
      </div>
      <p className="text-muted-foreground">
        환경별 리소스를 패키지로 그룹핑하여 관리합니다.
      </p>
      <PackageList />
    </div>
  );
}
