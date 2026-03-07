import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { validationSuiteApi } from '../api/validationSuiteApi';
import type { IValidationSuite } from '~/shared/types/db';

const suiteKeys = {
  all: ['validation-suites'] as const,
  list: () => [...suiteKeys.all, 'list'] as const,
  detail: (id: string) => [...suiteKeys.all, 'detail', id] as const,
};

export function useValidationSuites() {
  return useQuery({
    queryKey: suiteKeys.list(),
    queryFn: async () => {
      const res = await validationSuiteApi.list();
      return res.success ? res.data : [];
    },
  });
}

export function useCreateValidationSuite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { name: string; description: string }) => validationSuiteApi.create(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suiteKeys.list() });
    },
  });
}

export function useUpdateValidationSuite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; name?: string; description?: string; rules?: IValidationSuite['rules'] }) =>
      validationSuiteApi.update(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suiteKeys.list() });
    },
  });
}

export function useDeleteValidationSuite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string }) => validationSuiteApi.delete(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suiteKeys.list() });
    },
  });
}

export function useRunValidationSuite() {
  return useMutation({
    mutationFn: (args: { suiteId: string; connectionId: string }) => validationSuiteApi.run(args),
  });
}
