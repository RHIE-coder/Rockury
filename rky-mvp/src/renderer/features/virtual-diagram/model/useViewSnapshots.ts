import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { viewSnapshotApi } from '../api/viewSnapshotApi';
import type { IDiagramFilter, IDiagramLayout } from '~/shared/types/db';

const snapshotKeys = {
  all: ['viewSnapshots'] as const,
  list: (diagramId: string) => [...snapshotKeys.all, 'list', diagramId] as const,
};

export function useViewSnapshots(diagramId: string) {
  return useQuery({
    queryKey: snapshotKeys.list(diagramId),
    queryFn: async () => {
      const result = await viewSnapshotApi.list(diagramId);
      if (!result.success) throw new Error('Failed to fetch view snapshots');
      return result.data;
    },
    enabled: !!diagramId,
  });
}

export function useCreateViewSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { diagramId: string; name: string; filter: IDiagramFilter; layout: IDiagramLayout }) =>
      viewSnapshotApi.create(args),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.list(variables.diagramId) });
    },
  });
}

export function useRestoreViewSnapshot() {
  return useMutation({
    mutationFn: (snapshotId: string) => viewSnapshotApi.restore(snapshotId),
  });
}

export function useDeleteViewSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { snapshotId: string; diagramId: string }) =>
      viewSnapshotApi.delete(args.snapshotId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.list(variables.diagramId) });
    },
  });
}
