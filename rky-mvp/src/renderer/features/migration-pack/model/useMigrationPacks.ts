import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { migrationPackApi } from '../api/migrationPackApi';

const packKeys = {
  all: ['migration-packs'] as const,
  list: (diagramId: string) => [...packKeys.all, 'list', diagramId] as const,
  detail: (id: string) => [...packKeys.all, 'detail', id] as const,
};

export function useMigrationPacks(diagramId: string) {
  return useQuery({
    queryKey: packKeys.list(diagramId),
    queryFn: async () => {
      const result = await migrationPackApi.list({ diagramId });
      if (!result.success) throw new Error('Failed to fetch migration packs');
      return result.data;
    },
    enabled: !!diagramId,
  });
}

export function useCreateMigrationPack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      connectionId: string;
      diagramId: string;
      sourceVersionId: string | null;
      targetVersionId: string;
    }) => migrationPackApi.create(args),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: packKeys.list(variables.diagramId) });
    },
  });
}

export function useUpdateSeedDml() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; seedDml: string }) =>
      migrationPackApi.updateDml(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packKeys.all });
    },
  });
}

export function useExecuteMigrationPack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string }) =>
      migrationPackApi.execute(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packKeys.all });
    },
  });
}

export function useRollbackMigrationPack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string }) =>
      migrationPackApi.rollback(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packKeys.all });
    },
  });
}

export function useDeleteMigrationPack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string }) =>
      migrationPackApi.delete(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packKeys.all });
    },
  });
}
