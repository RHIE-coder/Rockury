import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { migrationApi } from '../api/migrationApi';
import type { TMigrationDirection, IDiffResult } from '~/shared/types/db';

const migrationKeys = {
  all: ['migrations'] as const,
  list: (diagramId: string, connectionId?: string) =>
    [...migrationKeys.all, 'list', diagramId, connectionId] as const,
};

export function useMigrations(diagramId: string, connectionId?: string) {
  return useQuery({
    queryKey: migrationKeys.list(diagramId, connectionId),
    queryFn: async () => {
      const result = await migrationApi.list({ diagramId, connectionId });
      if (!result.success) throw new Error('Failed to fetch migrations');
      return result.data;
    },
    enabled: !!diagramId,
  });
}

export function useCreateMigration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      diagramId: string;
      connectionId: string;
      direction: TMigrationDirection;
      diffSnapshot: IDiffResult;
      migrationDdl: string;
    }) => migrationApi.create(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: migrationKeys.all });
    },
  });
}

export function useApplyMigration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (migrationId: string) => migrationApi.apply(migrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: migrationKeys.all });
    },
  });
}

export function useDeleteMigration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (migrationId: string) => migrationApi.delete(migrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: migrationKeys.all });
    },
  });
}
