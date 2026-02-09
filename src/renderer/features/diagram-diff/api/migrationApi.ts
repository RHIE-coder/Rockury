import { getElectronApi } from '@/shared/api/electronApi';
import type { TMigrationDirection, IDiffResult } from '~/shared/types/db';

const api = getElectronApi();

export const migrationApi = {
  list: (args: { diagramId: string; connectionId?: string }) =>
    api.MIGRATION_LIST(args),
  create: (args: {
    diagramId: string;
    connectionId: string;
    direction: TMigrationDirection;
    diffSnapshot: IDiffResult;
    migrationDdl: string;
  }) => api.MIGRATION_CREATE(args),
  apply: (migrationId: string) =>
    api.MIGRATION_APPLY({ migrationId }),
  delete: (migrationId: string) =>
    api.MIGRATION_DELETE({ migrationId }),
};
