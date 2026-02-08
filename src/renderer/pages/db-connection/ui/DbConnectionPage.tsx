import { Plug } from 'lucide-react';
import { ConnectionList } from '@/features/db-connection';

export function DbConnectionPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Plug className="size-5" />
        <h1 className="text-xl font-semibold">Connection</h1>
      </div>
      <p className="text-muted-foreground">
        MySQL, MariaDB, PostgreSQL 연결을 관리합니다.
      </p>
      <ConnectionList />
    </div>
  );
}
