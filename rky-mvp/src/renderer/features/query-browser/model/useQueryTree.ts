import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryBrowserApi } from '../api/queryBrowserApi';

const queryTreeKeys = {
  all: (connId: string) => ['queryTree', connId] as const,
};

export function useQueryTree(connectionId: string) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryTreeKeys.all(connectionId) });

  const { data, isLoading } = useQuery({
    queryKey: queryTreeKeys.all(connectionId),
    queryFn: async () => {
      const res = await queryBrowserApi.queryTreeList(connectionId);
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
    }) => queryBrowserApi.queryFolderSave(args),
    onSuccess: invalidate,
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => queryBrowserApi.queryFolderDelete(id),
    onSuccess: invalidate,
  });

  const saveQueryMutation = useMutation({
    mutationFn: (args: {
      id?: string;
      connectionId: string;
      folderId?: string | null;
      name: string;
      description: string;
      sqlContent: string;
      sortOrder: number;
    }) => queryBrowserApi.querySave(args),
    onSuccess: invalidate,
  });

  const deleteQueryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await queryBrowserApi.queryDelete(id);
      return res;
    },
    onSuccess: (res) => {
      if (res.success) invalidate();
    },
  });

  const bulkMoveMutation = useMutation({
    mutationFn: (items: { id: string; folderId?: string | null; sortOrder: number }[]) =>
      queryBrowserApi.queryBulkMove(items),
    onSuccess: invalidate,
  });

  return {
    folders: data?.folders ?? [],
    queries: data?.queries ?? [],
    isLoading,
    saveFolder: saveFolderMutation.mutateAsync,
    deleteFolder: deleteFolderMutation.mutateAsync,
    saveQuery: saveQueryMutation.mutateAsync,
    deleteQuery: deleteQueryMutation.mutateAsync,
    bulkMove: bulkMoveMutation.mutateAsync,
  };
}
