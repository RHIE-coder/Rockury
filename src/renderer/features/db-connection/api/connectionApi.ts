import { getElectronApi } from '@/shared/api/electronApi';
import type { IConnectionFormData } from '@/entities/connection';

const api = getElectronApi();

export const connectionApi = {
  list: () => api.CONNECTION_LIST(),
  get: (id: string) => api.CONNECTION_GET({ id }),
  create: (args: IConnectionFormData) => api.CONNECTION_CREATE(args),
  update: (args: { id: string } & Partial<IConnectionFormData>) => api.CONNECTION_UPDATE(args),
  delete: (id: string) => api.CONNECTION_DELETE({ id }),
  test: (args: IConnectionFormData) => api.CONNECTION_TEST(args),
};
