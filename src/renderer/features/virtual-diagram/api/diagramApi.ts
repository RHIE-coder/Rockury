import { getElectronApi } from '@/shared/api/electronApi';
import type { ITable } from '@/entities/table';
import type { TDiagramType, IDiagramLayout } from '~/shared/types/db';

const api = getElectronApi();

export const diagramApi = {
  list: (type?: TDiagramType) => api.DIAGRAM_LIST({ type }),
  get: (id: string) => api.DIAGRAM_GET({ id }),
  create: (args: { name: string; type: TDiagramType; version?: string; description?: string; tables?: ITable[] }) =>
    api.DIAGRAM_CREATE(args),
  update: (args: { id: string; name?: string; version?: string; description?: string; tables?: ITable[] }) =>
    api.DIAGRAM_UPDATE(args),
  updateMeta: (args: { id: string; name?: string; version?: string }) =>
    api.DIAGRAM_UPDATE_META(args),
  delete: (id: string) => api.DIAGRAM_DELETE({ id }),
  clone: (id: string, newName?: string) => api.DIAGRAM_CLONE({ id, newName }),
  getLayout: (diagramId: string) => api.DIAGRAM_GET_LAYOUT({ diagramId }),
  saveLayout: (layout: IDiagramLayout) => api.DIAGRAM_SAVE_LAYOUT(layout),

  // Version management
  listVersions: (diagramId: string) => api.DIAGRAM_VERSION_LIST({ diagramId }),
  createVersion: (args: { diagramId: string; name: string; ddlContent: string; schemaSnapshot?: unknown }) =>
    api.DIAGRAM_VERSION_CREATE(args),
  updateVersion: (args: { id: string; name?: string; ddlContent?: string; schemaSnapshot?: unknown }) =>
    api.DIAGRAM_VERSION_UPDATE(args),
  deleteVersion: (id: string) => api.DIAGRAM_VERSION_DELETE({ id }),
  restoreVersion: (versionId: string) => api.DIAGRAM_VERSION_RESTORE({ versionId }),
  reorderVersions: (diagramId: string, orderedVersionIds: string[]) =>
    api.DIAGRAM_VERSIONS_REORDER({ diagramId, orderedVersionIds }),
  reorderDiagrams: (orderedDiagramIds: string[]) =>
    api.DIAGRAMS_REORDER({ orderedDiagramIds }),
  moveVersion: (versionId: string, targetDiagramId: string) =>
    api.DIAGRAM_VERSION_MOVE({ versionId, targetDiagramId }),
  copyVersion: (versionId: string, targetDiagramId: string) =>
    api.DIAGRAM_VERSION_COPY({ versionId, targetDiagramId }),
};
