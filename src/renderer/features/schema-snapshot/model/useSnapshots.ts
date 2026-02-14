import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { snapshotApi } from '../api/snapshotApi';

const snapshotKeys = {
  all: ['snapshots'] as const,
  list: (connectionId: string) => [...snapshotKeys.all, 'list', connectionId] as const,
};

export function useSnapshots(connectionId: string) {
  return useQuery({
    queryKey: snapshotKeys.list(connectionId),
    queryFn: async () => {
      const result = await snapshotApi.list({ connectionId });
      if (!result.success) throw new Error('Failed to fetch snapshots');
      return result.data;
    },
    enabled: !!connectionId,
  });
}

export function useCreateSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { connectionId: string; name?: string }) =>
      snapshotApi.create(args),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.list(variables.connectionId) });
    },
  });
}

export function useValidateSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { snapshotId: string }) =>
      snapshotApi.validate(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.all });
    },
  });
}

export function useDeleteSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string }) =>
      snapshotApi.delete(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.all });
    },
  });
}

export function useRenameSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; name: string }) =>
      snapshotApi.rename(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.all });
    },
  });
}

export function useValidateAgainstVersion() {
  return useMutation({
    mutationFn: (args: { connectionId: string; versionId: string }) =>
      snapshotApi.validateAgainstVersion(args),
  });
}
