import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryBrowserApi } from '../api/queryBrowserApi';
import type { THistorySource } from '~/shared/types/db';

const historyKeys = {
  all: (connId: string) => ['qbHistory', connId] as const,
  list: (connId: string, filter: object) => [...historyKeys.all(connId), filter] as const,
};

export function useQueryHistory(connectionId: string, filter: {
  source?: THistorySource;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: historyKeys.list(connectionId, filter),
    queryFn: async () => {
      const res = await queryBrowserApi.historyList({
        connectionId,
        source: filter.source,
        search: filter.search,
        page: filter.page,
        pageSize: filter.pageSize,
      });
      if (!res.success) throw new Error(res.error);
      return res.data!;
    },
    enabled: !!connectionId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => queryBrowserApi.historyDelete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: historyKeys.all(connectionId) }),
  });

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    deleteItem: deleteMutation.mutateAsync,
  };
}
