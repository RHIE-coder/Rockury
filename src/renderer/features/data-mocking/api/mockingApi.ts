import { getElectronApi } from '@/shared/api/electronApi';
import type { IMockResult } from '~/shared/types/db';

const api = getElectronApi();

export const mockingApi = {
  generate: (args: { tableIds: string[]; diagramId: string; rowCount: number }) =>
    api.MOCK_GENERATE(args),
  export: (args: { mockResult: IMockResult; format: 'sql' | 'csv' | 'json' }) =>
    api.MOCK_EXPORT(args),
};
