import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { connectionApi } from '../api/connectionApi';
import type { IConnectionFormData } from '@/entities/connection';

const connectionKeys = {
  all: ['connections'] as const,
  lists: () => [...connectionKeys.all, 'list'] as const,
  detail: (id: string) => [...connectionKeys.all, 'detail', id] as const,
};

export function useConnections() {
  return useQuery({
    queryKey: connectionKeys.lists(),
    queryFn: async () => {
      const result = await connectionApi.list();
      if (!result.success) throw new Error('Failed to fetch connections');
      return result.data;
    },
  });
}

export function useConnection(id: string) {
  return useQuery({
    queryKey: connectionKeys.detail(id),
    queryFn: async () => {
      const result = await connectionApi.get(id);
      if (!result.success) throw new Error('Failed to fetch connection');
      return result.data;
    },
    enabled: !!id,
  });
}

export function useCreateConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: IConnectionFormData) => connectionApi.create(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectionKeys.lists() });
    },
  });
}

export function useUpdateConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { id: string } & Partial<IConnectionFormData>) =>
      connectionApi.update(args),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: connectionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: connectionKeys.detail(variables.id) });
    },
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => connectionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectionKeys.lists() });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (args: IConnectionFormData) => connectionApi.test(args),
  });
}
