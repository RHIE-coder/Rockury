import { getElectronApi } from '@/shared/api/electronApi';

const api = getElectronApi();

export const validationSuiteApi = {
  list: () => api.VALIDATION_SUITE_LIST(),
  get: (args: { id: string }) => api.VALIDATION_SUITE_GET(args),
  create: (args: { name: string; description: string }) => api.VALIDATION_SUITE_CREATE(args),
  update: (args: { id: string; name?: string; description?: string; rules?: any[] }) =>
    api.VALIDATION_SUITE_UPDATE(args),
  delete: (args: { id: string }) => api.VALIDATION_SUITE_DELETE(args),
  run: (args: { suiteId: string; connectionId: string }) => api.VALIDATION_SUITE_RUN(args),
};
