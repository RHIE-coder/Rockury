import { getElectronApi } from '@/shared/api/electronApi';

const api = getElectronApi();

export const diffApi = {
  compare: (args: { virtualDiagramId: string; connectionId: string }) =>
    api.SCHEMA_DIFF(args),
};
