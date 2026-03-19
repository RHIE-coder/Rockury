import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryBrowserApi } from '../api/queryBrowserApi';
import type { ICollection, ICollectionItem } from '~/shared/types/db';

const collectionTreeKeys = {
  all: (connId: string) => ['collectionTree', connId] as const,
  detail: (id: string) => ['collection', id] as const,
};

export function useCollectionTree(connectionId: string) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: collectionTreeKeys.all(connectionId) });

  const { data, isLoading } = useQuery({
    queryKey: collectionTreeKeys.all(connectionId),
    queryFn: async () => {
      const res = await queryBrowserApi.collectionTreeList(connectionId);
      if (!res.success) throw new Error(res.error);
      return res.data!;
    },
    enabled: !!connectionId,
  });

  const saveFolderMutation = useMutation({
    mutationFn: (args: {
      id?: string;
      connectionId: string;
      parentId?: string | null;
      name: string;
      sortOrder: number;
    }) => queryBrowserApi.collectionFolderSave(args),
    onSuccess: invalidate,
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => queryBrowserApi.collectionFolderDelete(id),
    onSuccess: invalidate,
  });

  const saveCollectionMutation = useMutation({
    mutationFn: (args: {
      id?: string;
      connectionId: string;
      folderId?: string | null;
      name: string;
      description: string;
      sortOrder: number;
    }) => queryBrowserApi.collectionSave(args),
    onSuccess: invalidate,
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await queryBrowserApi.collectionDelete(id);
      return res;
    },
    onSuccess: (res) => {
      if (res.success) invalidate();
    },
  });

  const saveItemsMutation = useMutation({
    mutationFn: (args: { collectionId: string; items: { queryId: string; sortOrder: number }[] }) =>
      queryBrowserApi.collectionItemSave(args.collectionId, args.items),
    onSuccess: invalidate,
  });

  return {
    folders: data?.folders ?? [],
    collections: data?.collections ?? [],
    isLoading,
    saveFolder: saveFolderMutation.mutateAsync,
    deleteFolder: deleteFolderMutation.mutateAsync,
    saveCollection: saveCollectionMutation.mutateAsync,
    deleteCollection: deleteCollectionMutation.mutateAsync,
    saveItems: saveItemsMutation.mutateAsync,
  };
}

/** Fetch a single collection with its items */
export function useCollectionDetail(collectionId: string | null) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: collectionTreeKeys.detail(collectionId ?? ''),
    queryFn: async () => {
      const res = await queryBrowserApi.collectionGet(collectionId!);
      if (!res.success) throw new Error(res.error);
      return res.data as { collection: ICollection; items: ICollectionItem[] };
    },
    enabled: !!collectionId,
  });

  return {
    collection: data?.collection ?? null,
    items: data?.items ?? [],
    isLoading,
    refetch,
  };
}
