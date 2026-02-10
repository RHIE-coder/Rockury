import { getElectronApi } from '@/shared/api/electronApi';

const api = getElectronApi();

export const realDiagramApi = {
  fetchReal: (connectionId: string) => api.SCHEMA_FETCH_REAL({ connectionId }),
  syncReal: (connectionId: string) => api.SCHEMA_SYNC_REAL({ connectionId }),
  setHidden: (id: string, hidden: boolean) => api.DIAGRAM_SET_HIDDEN({ id, hidden }),
  listChangelogs: (connectionId: string) => api.CHANGELOG_LIST({ connectionId }),
  deleteChangelog: (id: string) => api.CHANGELOG_DELETE({ id }),
};
