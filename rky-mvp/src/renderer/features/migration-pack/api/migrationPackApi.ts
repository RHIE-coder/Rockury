import { getElectronApi } from '@/shared/api/electronApi';

const api = getElectronApi();

export const migrationPackApi = {
  list: (args: { diagramId: string }) =>
    api.MIGRATION_PACK_LIST(args),
  create: (args: {
    connectionId: string;
    diagramId: string;
    sourceVersionId: string | null;
    targetVersionId: string;
  }) =>
    api.MIGRATION_PACK_CREATE(args),
  get: (args: { id: string }) =>
    api.MIGRATION_PACK_GET(args),
  updateDml: (args: { id: string; seedDml: string }) =>
    api.MIGRATION_PACK_UPDATE_DML(args),
  execute: (args: { id: string }) =>
    api.MIGRATION_PACK_EXECUTE(args),
  rollback: (args: { id: string }) =>
    api.MIGRATION_PACK_ROLLBACK(args),
  delete: (args: { id: string }) =>
    api.MIGRATION_PACK_DELETE(args),
};
