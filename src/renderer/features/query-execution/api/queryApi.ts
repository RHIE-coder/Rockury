import { getElectronApi } from '@/shared/api/electronApi';

const api = getElectronApi();

export const queryApi = {
  execute: (args: { connectionId: string; sql: string }) => api.QUERY_EXECUTE(args),
  list: () => api.QUERY_LIST(),
  save: (args: { name: string; description: string; sqlContent: string; tags: string[] }) =>
    api.QUERY_SAVE(args),
  update: (args: { id: string; name?: string; description?: string; sqlContent?: string; tags?: string[] }) =>
    api.QUERY_UPDATE(args),
  delete: (id: string) => api.QUERY_DELETE({ id }),
  historyList: (limit?: number) => api.QUERY_HISTORY_LIST({ limit }),
};
