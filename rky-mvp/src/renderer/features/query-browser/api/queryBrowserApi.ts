import { getElectronApi } from '@/shared/api/electronApi';

const api = getElectronApi();

export const queryBrowserApi = {
  // Query tree
  queryTreeList: (connectionId: string) => api.QB_QUERY_TREE_LIST({ connectionId }),
  queryFolderSave: (args: {
    id?: string;
    connectionId: string;
    parentId?: string | null;
    name: string;
    sortOrder: number;
  }) => api.QB_QUERY_FOLDER_SAVE(args),
  queryFolderDelete: (id: string) => api.QB_QUERY_FOLDER_DELETE({ id }),
  querySave: (args: {
    id?: string;
    connectionId: string;
    folderId?: string | null;
    name: string;
    description: string;
    sqlContent: string;
    sortOrder: number;
  }) => api.QB_QUERY_SAVE(args),
  queryGet: (id: string) => api.QB_QUERY_GET({ id }),
  queryDelete: (id: string) => api.QB_QUERY_DELETE({ id }),
  queryBulkMove: (items: { id: string; folderId?: string | null; sortOrder: number }[]) =>
    api.QB_QUERY_BULK_MOVE({ items }),

  // Collection tree
  collectionTreeList: (connectionId: string) => api.QB_COLLECTION_TREE_LIST({ connectionId }),
  collectionFolderSave: (args: {
    id?: string;
    connectionId: string;
    parentId?: string | null;
    name: string;
    sortOrder: number;
  }) => api.QB_COLLECTION_FOLDER_SAVE(args),
  collectionFolderDelete: (id: string) => api.QB_COLLECTION_FOLDER_DELETE({ id }),
  collectionSave: (args: {
    id?: string;
    connectionId: string;
    folderId?: string | null;
    name: string;
    description: string;
    sortOrder: number;
  }) => api.QB_COLLECTION_SAVE(args),
  collectionGet: (id: string) => api.QB_COLLECTION_GET({ id }),
  collectionDelete: (id: string) => api.QB_COLLECTION_DELETE({ id }),
  collectionItemSave: (collectionId: string, items: { queryId: string; sortOrder: number }[]) =>
    api.QB_COLLECTION_ITEM_SAVE({ collectionId, items }),

  // Transaction
  txBegin: (connectionId: string) => api.QB_TX_BEGIN({ connectionId }),
  txExecute: (txId: string, sql: string) => api.QB_TX_EXECUTE({ txId, sql }),
  txCommit: (txId: string) => api.QB_TX_COMMIT({ txId }),
  txRollback: (txId: string) => api.QB_TX_ROLLBACK({ txId }),

  // History
  historyList: (args: {
    connectionId?: string;
    source?: string;
    search?: string;
    page: number;
    pageSize: number;
  }) => api.QB_HISTORY_LIST(args as any),
  historyDelete: (id: string) => api.QB_HISTORY_DELETE({ id }),
};
