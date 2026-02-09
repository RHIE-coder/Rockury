import { getElectronApi } from '@/shared/api/electronApi';
import type { ITable } from '@/entities/table';
import type { TDiagramType, IDiagramLayout } from '~/shared/types/db';

const api = getElectronApi();

export const diagramApi = {
  list: (type?: TDiagramType) => api.DIAGRAM_LIST({ type }),
  get: (id: string) => api.DIAGRAM_GET({ id }),
  create: (args: { name: string; type: TDiagramType; version?: string; tables?: ITable[] }) =>
    api.DIAGRAM_CREATE(args),
  update: (args: { id: string; name?: string; version?: string; tables?: ITable[] }) =>
    api.DIAGRAM_UPDATE(args),
  updateMeta: (args: { id: string; name?: string; version?: string }) =>
    api.DIAGRAM_UPDATE_META(args),
  delete: (id: string) => api.DIAGRAM_DELETE({ id }),
  getLayout: (diagramId: string) => api.DIAGRAM_GET_LAYOUT({ diagramId }),
  saveLayout: (layout: IDiagramLayout) => api.DIAGRAM_SAVE_LAYOUT(layout),

  // Version management
  listVersions: (diagramId: string) => api.DIAGRAM_VERSION_LIST({ diagramId }),
  createVersion: (args: { diagramId: string; ddlContent: string }) =>
    api.DIAGRAM_VERSION_CREATE(args),
  restoreVersion: (versionId: string) => api.DIAGRAM_VERSION_RESTORE({ versionId }),
};
