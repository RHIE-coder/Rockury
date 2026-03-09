import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryApi } from '../api/queryApi';

const queryKeys = {
  all: ['queries'] as const,
  lists: () => [...queryKeys.all, 'list'] as const,
  history: (limit?: number) => [...queryKeys.all, 'history', limit] as const,
};

export function useSavedQueries() {
  return useQuery({
    queryKey: queryKeys.lists(),
    queryFn: async () => {
      const result = await queryApi.list();
      if (!result.success) throw new Error('Failed to fetch queries');
      return result.data;
    },
  });
}

export function useQueryHistory(limit?: number) {
  return useQuery({
    queryKey: queryKeys.history(limit),
    queryFn: async () => {
      const result = await queryApi.historyList(limit);
      if (!result.success) throw new Error('Failed to fetch query history');
      return result.data;
    },
  });
}

export function useExecuteQuery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { connectionId: string; sql: string }) => queryApi.execute(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.history() });
    },
  });
}

export function useSaveQuery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { name: string; description: string; sqlContent: string; tags: string[] }) =>
      queryApi.save(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
    },
  });
}

export function useUpdateQuery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { id: string; name?: string; description?: string; sqlContent?: string; tags?: string[] }) =>
      queryApi.update(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
    },
  });
}

export function useDeleteQuery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => queryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
    },
  });
}
