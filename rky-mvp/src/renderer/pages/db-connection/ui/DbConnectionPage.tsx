import { Plug } from 'lucide-react';
import { ConnectionList } from '@/features/db-connection';
import { useConnectionStore } from '@/features/db-connection/model/connectionStore';
import { DriftStatusPanel } from '@/features/drift-detection';

export function DbConnectionPage() {
  const { selectedConnectionId } = useConnectionStore();

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Plug className="size-5" />
        <h1 className="text-xl font-semibold">Connection</h1>
      </div>
      <p className="text-muted-foreground">
        데이터베이스 연결을 등록하고 상태를 모니터링합니다.
      </p>
      <ConnectionList />

      {selectedConnectionId && (
        <DriftStatusPanel connectionId={selectedConnectionId} />
      )}
    </div>
  );
}
