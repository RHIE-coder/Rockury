import { useState, useEffect } from 'react';
import { realDiagramApi } from '@/features/real-diagram/api/realDiagramApi';
import type { ITable } from '~/shared/types/db';

interface SchemaData {
  tables: ITable[];
  isLoading: boolean;
}

export function useSchemaData(connectionId: string | null): SchemaData {
  const [tables, setTables] = useState<ITable[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!connectionId) {
      setTables([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    // Try cached diagram first, fall back to live sync
    realDiagramApi.fetchReal(connectionId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data && res.data.tables.length > 0) {
        setTables(res.data.tables);
        setIsLoading(false);
        return;
      }
      // No cached diagram — sync from live DB
      realDiagramApi.syncReal(connectionId).then((syncRes) => {
        if (cancelled) return;
        if (syncRes.success && syncRes.data?.diagram) {
          setTables(syncRes.data.diagram.tables ?? []);
        }
        setIsLoading(false);
      });
    });

    return () => { cancelled = true; };
  }, [connectionId]);

  return { tables, isLoading };
}
