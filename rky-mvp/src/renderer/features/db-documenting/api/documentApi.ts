import { getElectronApi } from '@/shared/api/electronApi';
import type { TExportFormat } from '@/entities/document';

const api = getElectronApi();

export const documentApi = {
  list: () => api.DOCUMENT_LIST(),
  get: (id: string) => api.DOCUMENT_GET({ id }),
  create: (args: { name: string; content: string }) => api.DOCUMENT_CREATE(args),
  update: (args: { id: string; name?: string; content?: string }) => api.DOCUMENT_UPDATE(args),
  delete: (id: string) => api.DOCUMENT_DELETE({ id }),
  autoGenerate: (diagramId: string) => api.DOCUMENT_AUTO_GENERATE({ diagramId }),
  export: (args: { documentId: string; format: TExportFormat; outputPath?: string }) =>
    api.DOCUMENT_EXPORT(args),
};
