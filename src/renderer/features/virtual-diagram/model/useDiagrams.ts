import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { diagramApi } from '../api/diagramApi';
import type { ITable } from '@/entities/table';
import type { TDiagramType } from '~/shared/types/db';

const diagramKeys = {
  all: ['diagrams'] as const,
  lists: (type?: TDiagramType) => [...diagramKeys.all, 'list', type] as const,
  detail: (id: string) => [...diagramKeys.all, 'detail', id] as const,
  layout: (diagramId: string) => [...diagramKeys.all, 'layout', diagramId] as const,
  versions: (diagramId: string) => [...diagramKeys.all, 'versions', diagramId] as const,
};

export function useDiagrams(type?: TDiagramType) {
  return useQuery({
    queryKey: diagramKeys.lists(type),
    queryFn: async () => {
      const result = await diagramApi.list(type);
      if (!result.success) throw new Error('Failed to fetch diagrams');
      return result.data;
    },
  });
}

export function useDiagram(id: string) {
  return useQuery({
    queryKey: diagramKeys.detail(id),
    queryFn: async () => {
      const result = await diagramApi.get(id);
      if (!result.success) throw new Error('Failed to fetch diagram');
      return result.data;
    },
    enabled: !!id,
  });
}

export function useCreateDiagram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { name: string; type: TDiagramType; tables?: ITable[] }) =>
      diagramApi.create(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: diagramKeys.all });
    },
  });
}

export function useUpdateDiagram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { id: string; name?: string; tables?: ITable[] }) =>
      diagramApi.update(args),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: diagramKeys.all });
      queryClient.invalidateQueries({ queryKey: diagramKeys.detail(variables.id) });
    },
  });
}

export function useDeleteDiagram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => diagramApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: diagramKeys.all });
    },
  });
}

export function useDiagramLayout(diagramId: string) {
  return useQuery({
    queryKey: diagramKeys.layout(diagramId),
    queryFn: async () => {
      const result = await diagramApi.getLayout(diagramId);
      if (!result.success) throw new Error('Failed to fetch layout');
      return result.data;
    },
    enabled: !!diagramId,
  });
}

export function useSaveDiagramLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: diagramApi.saveLayout,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: diagramKeys.layout(variables.diagramId),
      });
    },
  });
}

export function useDiagramVersions(diagramId: string) {
  return useQuery({
    queryKey: diagramKeys.versions(diagramId),
    queryFn: async () => {
      const result = await diagramApi.listVersions(diagramId);
      if (!result.success) throw new Error('Failed to fetch versions');
      return result.data;
    },
    enabled: !!diagramId,
  });
}

export function useCreateDiagramVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { diagramId: string; ddlContent: string }) =>
      diagramApi.createVersion(args),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: diagramKeys.versions(variables.diagramId),
      });
    },
  });
}

export function useRestoreDiagramVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => diagramApi.restoreVersion(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: diagramKeys.all });
    },
  });
}
