import { getElectronApi } from '@/shared/api/electronApi';

const api = getElectronApi();

export const realDiagramApi = {
  fetchReal: (connectionId: string) => api.SCHEMA_FETCH_REAL({ connectionId }),
};
