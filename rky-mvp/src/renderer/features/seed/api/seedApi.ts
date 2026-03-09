import { getElectronApi } from '@/shared/api/electronApi';

const api = getElectronApi();

export const seedApi = {
  list: () => api.SEED_LIST(),
  create: (args: { name: string; description: string; dmlContent: string; targetTables: string[] }) =>
    api.SEED_CREATE(args),
  update: (args: { id: string; name?: string; description?: string; dmlContent?: string; targetTables?: string[] }) =>
    api.SEED_UPDATE(args),
  delete: (args: { id: string }) =>
    api.SEED_DELETE(args),
  capture: (args: { connectionId: string; tableName: string; whereClause?: string; limit?: number }) =>
    api.SEED_CAPTURE(args),
};
