import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryApi } from '@/features/query-execution/api/queryApi';
import { buildSelectQuery, type IFilter } from './sqlBuilder';
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
  const [state, setState] = useState<IDataQueryState>({
    tableName: '',
    page: 0,
    pageSize: 50,
    orderBy: null,
    filters: [],
  });
  const [result, setResult] = useState<IQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

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
      if (tableName) {
        runQuery(newState);
      } else {
        setResult(null);
      }
    },
    [runQuery],
  );

  const setPage = useCallback(
    (page: number) => {
      const newState = { ...stateRef.current, page };
      setState(newState);
      runQuery(newState);
    },
    [runQuery],
  );

  const setPageSize = useCallback(
    (pageSize: TPageSize) => {
      const newState = { ...stateRef.current, pageSize, page: 0 };
      setState(newState);
      runQuery(newState);
    },
    [runQuery],
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
      runQuery(newState);
    },
    [runQuery],
  );

  const setFilters = useCallback(
    (filters: IFilter[]) => {
      const newState = { ...stateRef.current, filters, page: 0 };
      setState(newState);
      runQuery(newState);
    },
    [runQuery],
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
