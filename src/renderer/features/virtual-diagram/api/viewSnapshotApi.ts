import { getElectronApi } from '@/shared/api/electronApi';
import type { IDiagramFilter, IDiagramLayout } from '~/shared/types/db';

const api = getElectronApi();

export const viewSnapshotApi = {
  list: (diagramId: string) => api.VIEW_SNAPSHOT_LIST({ diagramId }),
  create: (args: { diagramId: string; name: string; filter: IDiagramFilter; layout: IDiagramLayout }) =>
    api.VIEW_SNAPSHOT_CREATE(args),
  restore: (snapshotId: string) => api.VIEW_SNAPSHOT_RESTORE({ snapshotId }),
  delete: (snapshotId: string) => api.VIEW_SNAPSHOT_DELETE({ snapshotId }),
};
