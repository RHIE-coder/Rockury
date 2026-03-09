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
    mutationFn: (args: { name: string; type: TDiagramType; version?: string; description?: string; tables?: ITable[] }) =>
      diagramApi.create(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: diagramKeys.all });
    },
  });
}

export function useUpdateDiagram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { id: string; name?: string; version?: string; description?: string; tables?: ITable[] }) =>
      diagramApi.update(args),
    onSuccess: (_, variables) => {
      // Only invalidate lists + detail; NOT layout/versions (they are managed separately)
      queryClient.invalidateQueries({ queryKey: ['diagrams', 'list'] });
      queryClient.invalidateQueries({ queryKey: diagramKeys.detail(variables.id) });
    },
  });
}

export function useCloneDiagram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { id: string; newName?: string }) =>
      diagramApi.clone(args.id, args.newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: diagramKeys.all });
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
    onMutate: (variables) => {
      // Optimistic: update cache SYNCHRONOUSLY so handleSave reads fresh positions
      queryClient.setQueryData(
        diagramKeys.layout(variables.diagramId),
        variables,
      );
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
    mutationFn: (args: { diagramId: string; name: string; ddlContent: string; schemaSnapshot?: unknown }) =>
      diagramApi.createVersion(args),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: diagramKeys.versions(variables.diagramId),
      });
    },
  });
}

export function useUpdateDiagramVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { id: string; diagramId: string; name?: string; ddlContent?: string; schemaSnapshot?: unknown; isLocked?: boolean }) =>
      diagramApi.updateVersion({ id: args.id, name: args.name, ddlContent: args.ddlContent, schemaSnapshot: args.schemaSnapshot, isLocked: args.isLocked }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: diagramKeys.versions(variables.diagramId),
      });
    },
  });
}

export function useDeleteDiagramVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { id: string; diagramId: string }) =>
      diagramApi.deleteVersion(args.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: diagramKeys.versions(variables.diagramId),
      });
    },
  });
}

export function useReorderVersions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { diagramId: string; orderedVersionIds: string[] }) =>
      diagramApi.reorderVersions(args.diagramId, args.orderedVersionIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: diagramKeys.versions(variables.diagramId),
      });
    },
  });
}

export function useReorderDiagrams() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { orderedDiagramIds: string[] }) =>
      diagramApi.reorderDiagrams(args.orderedDiagramIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: diagramKeys.all });
    },
  });
}

export function useMoveVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { versionId: string; sourceDiagramId: string; targetDiagramId: string }) =>
      diagramApi.moveVersion(args.versionId, args.targetDiagramId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: diagramKeys.versions(variables.sourceDiagramId) });
      queryClient.invalidateQueries({ queryKey: diagramKeys.versions(variables.targetDiagramId) });
    },
  });
}

export function useCopyVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { versionId: string; targetDiagramId: string }) =>
      diagramApi.copyVersion(args.versionId, args.targetDiagramId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: diagramKeys.versions(variables.targetDiagramId) });
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
