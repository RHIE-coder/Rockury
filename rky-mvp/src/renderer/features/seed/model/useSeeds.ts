import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seedApi } from '../api/seedApi';

const seedKeys = {
  all: ['seeds'] as const,
  list: () => [...seedKeys.all, 'list'] as const,
};

export function useSeeds() {
  return useQuery({
    queryKey: seedKeys.list(),
    queryFn: async () => {
      const result = await seedApi.list();
      if (!result.success) throw new Error('Failed to fetch seeds');
      return result.data;
    },
  });
}

export function useCreateSeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { name: string; description: string; dmlContent: string; targetTables: string[] }) =>
      seedApi.create(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: seedKeys.list() });
    },
  });
}

export function useUpdateSeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; name?: string; description?: string; dmlContent?: string; targetTables?: string[] }) =>
      seedApi.update(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: seedKeys.list() });
    },
  });
}

export function useDeleteSeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string }) =>
      seedApi.delete(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: seedKeys.list() });
    },
  });
}

export function useSeedCapture() {
  return useMutation({
    mutationFn: (args: { connectionId: string; tableName: string; whereClause?: string; limit?: number }) =>
      seedApi.capture(args),
  });
}
