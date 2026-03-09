import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { packageApi } from '../api/packageApi';

const packageKeys = {
  all: ['packages'] as const,
  lists: () => [...packageKeys.all, 'list'] as const,
  detail: (id: string) => [...packageKeys.all, 'detail', id] as const,
  resources: (packageId: string) => [...packageKeys.all, 'resources', packageId] as const,
};

export function usePackages() {
  return useQuery({
    queryKey: packageKeys.lists(),
    queryFn: async () => {
      const result = await packageApi.list();
      if (!result.success) throw new Error('Failed to fetch packages');
      return result.data;
    },
  });
}

export function usePackage(id: string) {
  return useQuery({
    queryKey: packageKeys.detail(id),
    queryFn: async () => {
      const result = await packageApi.get(id);
      if (!result.success) throw new Error('Failed to fetch package');
      return result.data;
    },
    enabled: !!id,
  });
}

export function useCreatePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { name: string; description: string }) => packageApi.create(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packageKeys.lists() });
    },
  });
}

export function useUpdatePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { id: string; name: string; description: string }) =>
      packageApi.update(args),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: packageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: packageKeys.detail(variables.id) });
    },
  });
}

export function useDeletePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => packageApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packageKeys.lists() });
    },
  });
}

export function usePackageResources(packageId: string) {
  return useQuery({
    queryKey: packageKeys.resources(packageId),
    queryFn: async () => {
      const result = await packageApi.getResources(packageId);
      if (!result.success) throw new Error('Failed to fetch resources');
      return result.data;
    },
    enabled: !!packageId,
  });
}
