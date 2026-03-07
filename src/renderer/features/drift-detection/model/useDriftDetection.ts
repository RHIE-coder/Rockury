import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driftApi } from '../api/driftApi';

const driftKeys = {
  all: ['drift'] as const,
  lightweight: (connectionId: string) => [...driftKeys.all, 'lightweight', connectionId] as const,
  full: (connectionId: string) => [...driftKeys.all, 'full', connectionId] as const,
};

export function useLightweightDriftCheck(connectionId: string, enabled = true) {
  return useQuery({
    queryKey: driftKeys.lightweight(connectionId),
    queryFn: async () => {
      const result = await driftApi.lightweightCheck({ connectionId });
      if (!result.success) throw new Error('Lightweight drift check failed');
      return result.data;
    },
    enabled: !!connectionId && enabled,
    refetchInterval: 30_000,
  });
}

export function useFullDriftCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { connectionId: string }) => {
      const result = await driftApi.fullCheck(args);
      if (!result.success) throw new Error('Full drift check failed');
      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: driftKeys.lightweight(variables.connectionId) });
    },
  });
}
