import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryApi } from '@/features/query-execution/api/queryApi';
import { buildSelectQuery, type IFilter } from './sqlBuilder';
import { useDataBrowserStore } from './dataBrowserStore';
import type { IQueryResult, TDbType } from '~/shared/types/db';

export const PAGE_SIZES = [25, 50, 100, 200] as const;
export type TPageSize = (typeof PAGE_SIZES)[number];

export interface IDataQueryState {
  tableName: string;
  page: number;
  pageSize: TPageSize;
  orderBy: { column: string; direction: 'ASC' | 'DESC' } | null;
  filters: IFilter[];
}

export function useDataQuery(connectionId: string, dbType: TDbType) {
  const store = useDataBrowserStore();

  const [state, setState] = useState<IDataQueryState>({
    tableName: store.tableName,
    page: store.page,
    pageSize: store.pageSize,
    orderBy: store.orderBy,
    filters: store.filters,
  });
  const [result, setResult] = useState<IQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Sync local state → store
  useEffect(() => {
    store.setTableName(state.tableName);
    store.setPage(state.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tableName, state.page]);

  // Auto-load on mount if a table was previously selected
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    if (state.tableName && connectionId) {
      const sql = buildSelectQuery({
        table: state.tableName,
        dbType,
        limit: state.pageSize,
        offset: state.page * state.pageSize,
        orderBy: state.orderBy ?? undefined,
        filters: state.filters.length > 0 ? state.filters : undefined,
      });
      queryMutation.mutate(sql);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const queryMutation = useMutation({
    mutationFn: async (sql: string) => {
      const res = await queryApi.execute({ connectionId, sql });
      if (!res.success) throw new Error((res as { error?: string }).error ?? 'Query failed');
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const runQuery = useCallback(
    (s: IDataQueryState) => {
      if (!s.tableName) return;
      const sql = buildSelectQuery({
        table: s.tableName,
        dbType,
        limit: s.pageSize,
        offset: s.page * s.pageSize,
        orderBy: s.orderBy ?? undefined,
        filters: s.filters.length > 0 ? s.filters : undefined,
      });
      queryMutation.mutate(sql);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dbType, connectionId],
  );

  const selectTable = useCallback(
    (tableName: string) => {
      const newState: IDataQueryState = {
        tableName,
        page: 0,
        pageSize: stateRef.current.pageSize,
        orderBy: null,
        filters: [],
      };
      setState(newState);
      store.resetForTable(tableName);
      if (tableName) {
        runQuery(newState);
      } else {
        setResult(null);
      }
    },
    [runQuery, store],
  );

  const setPage = useCallback(
    (page: number) => {
      const newState = { ...stateRef.current, page };
      setState(newState);
      store.setPage(page);
      runQuery(newState);
    },
    [runQuery, store],
  );

  const setPageSize = useCallback(
    (pageSize: TPageSize) => {
      const newState = { ...stateRef.current, pageSize, page: 0 };
      setState(newState);
      store.setPageSize(pageSize);
      runQuery(newState);
    },
    [runQuery, store],
  );

  const toggleSort = useCallback(
    (column: string) => {
      const cur = stateRef.current;
      let newOrderBy: IDataQueryState['orderBy'] = null;
      if (!cur.orderBy || cur.orderBy.column !== column) {
        newOrderBy = { column, direction: 'ASC' };
      } else if (cur.orderBy.direction === 'ASC') {
        newOrderBy = { column, direction: 'DESC' };
      }
      const newState = { ...cur, orderBy: newOrderBy, page: 0 };
      setState(newState);
      store.setOrderBy(newOrderBy);
      store.setPage(0);
      runQuery(newState);
    },
    [runQuery, store],
  );

  const setFilters = useCallback(
    (filters: IFilter[]) => {
      const newState = { ...stateRef.current, filters, page: 0 };
      setState(newState);
      store.setFilters(filters);
      runQuery(newState);
    },
    [runQuery, store],
  );

  const refresh = useCallback(() => {
    runQuery(stateRef.current);
  }, [runQuery]);

  return {
    state,
    result,
    error,
    isLoading: queryMutation.isPending,
    selectTable,
    setPage,
    setPageSize,
    toggleSort,
    setFilters,
    refresh,
    dismissError: () => setError(null),
  };
}
