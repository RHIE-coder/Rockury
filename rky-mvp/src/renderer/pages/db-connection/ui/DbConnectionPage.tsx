import { Plug } from 'lucide-react';
import { ConnectionList } from '@/features/db-connection';
import { useConnectionStore } from '@/features/db-connection/model/connectionStore';
import { DriftStatusPanel } from '@/features/drift-detection';
import { useSnapshots } from '@/features/schema-snapshot/model/useSnapshots';

export function DbConnectionPage() {
  const { selectedConnectionId } = useConnectionStore();
  const { data: snapshots } = useSnapshots(selectedConnectionId ?? '');
  const hasSnapshots = (snapshots?.length ?? 0) > 0;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Plug className="size-5" />
        <h1 className="text-xl font-semibold">Connection</h1>
      </div>
      <p className="text-muted-foreground">
        데이터베이스 연결을 등록하고 상태를 모니터링합니다.
      </p>
      {selectedConnectionId && hasSnapshots && (
        <DriftStatusPanel connectionId={selectedConnectionId} />
      )}
      <ConnectionList />
    </div>
  );
}
