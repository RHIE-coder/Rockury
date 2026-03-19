import { useState, useCallback } from 'react';
import { queryApi } from '@/features/query-execution/api/queryApi';
import { queryBrowserApi } from '../api/queryBrowserApi';
import type { ICollectionItem, IQueryResult } from '~/shared/types/db';

export type TItemStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

interface CollectionRunState {
  isRunning: boolean;
  currentIndex: number;
  itemStatuses: Map<string, TItemStatus>;
  txId: string | null;
  failedItem: { index: number; error: string } | null;
  completedAll: boolean;
}

const initialState: CollectionRunState = {
  isRunning: false,
  currentIndex: -1,
  itemStatuses: new Map(),
  txId: null,
  failedItem: null,
  completedAll: false,
};

function isSelectQuery(sql: string): boolean {
  const stripped = sql.replace(/^\s*(--[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/g, '').trim();
  return /^SELECT\s/i.test(stripped);
}

export function useCollectionRunner(connectionId: string) {
  const [state, setState] = useState<CollectionRunState>({ ...initialState });
  const [selectResults, setSelectResults] = useState<Map<string, IQueryResult>>(new Map());

  const runAll = useCallback(async (items: ICollectionItem[]) => {
    if (items.length === 0) return;

    const statuses = new Map<string, TItemStatus>();
    for (const item of items) statuses.set(item.id, 'pending');

    setState({
      isRunning: true,
      currentIndex: 0,
      itemStatuses: new Map(statuses),
      txId: null,
      failedItem: null,
      completedAll: false,
    });
    setSelectResults(new Map());

    // Begin transaction for DML statements
    let txId: string | null = null;
    const hasDml = items.some((item) => item.sqlContent && !isSelectQuery(item.sqlContent));

    if (hasDml) {
      const beginRes = await queryBrowserApi.txBegin(connectionId);
      if (!beginRes.success) {
        setState((prev) => ({
          ...prev,
          isRunning: false,
          failedItem: { index: 0, error: beginRes.error ?? 'Failed to begin transaction' },
        }));
        return;
      }
      txId = beginRes.data!.txId;
      setState((prev) => ({ ...prev, txId }));
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const sql = item.sqlContent?.trim();
      if (!sql) {
        statuses.set(item.id, 'skipped');
        setState((prev) => ({
          ...prev,
          currentIndex: i,
          itemStatuses: new Map(statuses),
        }));
        continue;
      }

      statuses.set(item.id, 'running');
      setState((prev) => ({
        ...prev,
        currentIndex: i,
        itemStatuses: new Map(statuses),
      }));

      try {
        if (isSelectQuery(sql)) {
          // SELECT: execute directly (not in transaction)
          const res = await queryApi.execute({ connectionId, sql });
          if (!res.success) throw new Error((res as any).error ?? 'Query failed');
          if (res.data) {
            setSelectResults((prev) => new Map(prev).set(item.id, res.data!));
          }
        } else if (txId) {
          // DML: execute within transaction
          const res = await queryBrowserApi.txExecute(txId, sql);
          if (!res.success) throw new Error(res.error ?? 'Execution failed');
        } else {
          // No transaction (all SELECTs case shouldn't reach here, but safety)
          const res = await queryApi.execute({ connectionId, sql });
          if (!res.success) throw new Error((res as any).error ?? 'Query failed');
        }
        statuses.set(item.id, 'success');
        setState((prev) => ({ ...prev, itemStatuses: new Map(statuses) }));
      } catch (e) {
        statuses.set(item.id, 'error');
        // Mark remaining as skipped
        for (let j = i + 1; j < items.length; j++) {
          statuses.set(items[j].id, 'skipped');
        }
        setState((prev) => ({
          ...prev,
          isRunning: false,
          currentIndex: i,
          itemStatuses: new Map(statuses),
          failedItem: { index: i, error: (e as Error).message },
        }));
        return;
      }
    }

    // All succeeded
    setState((prev) => ({
      ...prev,
      isRunning: false,
      completedAll: true,
      itemStatuses: new Map(statuses),
    }));
  }, [connectionId]);

  const runSingle = useCallback(async (item: ICollectionItem) => {
    const sql = item.sqlContent?.trim();
    if (!sql) return;

    const statuses = new Map<string, TItemStatus>();
    statuses.set(item.id, 'running');
    setState({
      isRunning: true,
      currentIndex: 0,
      itemStatuses: statuses,
      txId: null,
      failedItem: null,
      completedAll: false,
    });

    try {
      if (isSelectQuery(sql)) {
        const res = await queryApi.execute({ connectionId, sql });
        if (!res.success) throw new Error((res as any).error ?? 'Query failed');
        if (res.data) {
          setSelectResults((prev) => new Map(prev).set(item.id, res.data!));
        }
        statuses.set(item.id, 'success');
        setState((prev) => ({
          ...prev,
          isRunning: false,
          completedAll: false,
          itemStatuses: new Map(statuses),
        }));
      } else {
        // DML: use transaction
        const beginRes = await queryBrowserApi.txBegin(connectionId);
        if (!beginRes.success) throw new Error(beginRes.error ?? 'Failed to begin transaction');
        const txId = beginRes.data!.txId;

        const execRes = await queryBrowserApi.txExecute(txId, sql);
        if (!execRes.success) {
          await queryBrowserApi.txRollback(txId).catch(() => {});
          throw new Error(execRes.error ?? 'Execution failed');
        }

        statuses.set(item.id, 'success');
        setState((prev) => ({
          ...prev,
          isRunning: false,
          txId,
          completedAll: true,
          itemStatuses: new Map(statuses),
        }));
      }
    } catch (e) {
      statuses.set(item.id, 'error');
      setState((prev) => ({
        ...prev,
        isRunning: false,
        itemStatuses: new Map(statuses),
        failedItem: { index: 0, error: (e as Error).message },
      }));
    }
  }, [connectionId]);

  const retry = useCallback(async (items: ICollectionItem[]) => {
    if (state.failedItem === null) return;
    const failedIndex = state.failedItem.index;
    const remainingItems = items.slice(failedIndex);
    if (remainingItems.length === 0) return;

    // Reset statuses for remaining items
    const statuses = new Map(state.itemStatuses);
    for (const item of remainingItems) statuses.set(item.id, 'pending');
    setState((prev) => ({
      ...prev,
      isRunning: true,
      failedItem: null,
      itemStatuses: new Map(statuses),
    }));

    for (let i = 0; i < remainingItems.length; i++) {
      const item = remainingItems[i];
      const sql = item.sqlContent?.trim();
      const globalIndex = failedIndex + i;

      if (!sql) {
        statuses.set(item.id, 'skipped');
        setState((prev) => ({
          ...prev,
          currentIndex: globalIndex,
          itemStatuses: new Map(statuses),
        }));
        continue;
      }

      statuses.set(item.id, 'running');
      setState((prev) => ({
        ...prev,
        currentIndex: globalIndex,
        itemStatuses: new Map(statuses),
      }));

      try {
        if (isSelectQuery(sql)) {
          const res = await queryApi.execute({ connectionId, sql });
          if (!res.success) throw new Error((res as any).error ?? 'Query failed');
          if (res.data) {
            setSelectResults((prev) => new Map(prev).set(item.id, res.data!));
          }
        } else if (state.txId) {
          const res = await queryBrowserApi.txExecute(state.txId, sql);
          if (!res.success) throw new Error(res.error ?? 'Execution failed');
        }
        statuses.set(item.id, 'success');
        setState((prev) => ({ ...prev, itemStatuses: new Map(statuses) }));
      } catch (e) {
        statuses.set(item.id, 'error');
        for (let j = i + 1; j < remainingItems.length; j++) {
          statuses.set(remainingItems[j].id, 'skipped');
        }
        setState((prev) => ({
          ...prev,
          isRunning: false,
          currentIndex: globalIndex,
          itemStatuses: new Map(statuses),
          failedItem: { index: globalIndex, error: (e as Error).message },
        }));
        return;
      }
    }

    setState((prev) => ({
      ...prev,
      isRunning: false,
      completedAll: true,
      itemStatuses: new Map(statuses),
    }));
  }, [connectionId, state.failedItem, state.itemStatuses, state.txId]);

  const abort = useCallback(async () => {
    if (state.txId) {
      await queryBrowserApi.txRollback(state.txId).catch(() => {});
    }
    setState({ ...initialState });
    setSelectResults(new Map());
  }, [state.txId]);

  const confirm = useCallback(async () => {
    if (state.txId) {
      await queryBrowserApi.txCommit(state.txId);
    }
    setState({ ...initialState });
  }, [state.txId]);

  const rollback = useCallback(async () => {
    if (state.txId) {
      await queryBrowserApi.txRollback(state.txId);
    }
    setState({ ...initialState });
  }, [state.txId]);

  return { state, selectResults, runAll, runSingle, retry, abort, confirm, rollback };
}
