import { useEffect, useRef } from 'react';
import { useConnections } from './useConnections';
import { useConnectionStore } from './connectionStore';
import { connectionApi } from '../api/connectionApi';

/**
 * Auto-test all non-ignored connections on mount and populate statusMap.
 * Safe to call from any page — runs only once per app lifecycle (via ref guard).
 */
export function useAutoTestConnections() {
  const { data: connections } = useConnections();
  const { setStatus } = useConnectionStore();
  const testedRef = useRef(false);

  useEffect(() => {
    if (!connections || connections.length === 0 || testedRef.current) return;
    testedRef.current = true;

    const targets = connections.filter((c) => !c.ignored);
    for (const conn of targets) {
      setStatus(conn.id, 'testing');
    }

    targets.forEach(async (conn) => {
      try {
        const result = await connectionApi.testById(conn.id);
        if (result.success && result.data) {
          setStatus(conn.id, result.data.success ? 'connected' : 'error');
        } else {
          setStatus(conn.id, 'error');
        }
      } catch {
        setStatus(conn.id, 'error');
      }
    });

    for (const conn of connections.filter((c) => c.ignored)) {
      setStatus(conn.id, 'ignored');
    }
  }, [connections, setStatus]);
}
