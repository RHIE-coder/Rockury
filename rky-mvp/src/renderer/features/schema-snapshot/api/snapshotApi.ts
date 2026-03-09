import { getElectronApi } from '@/shared/api/electronApi';

const api = getElectronApi();

export const snapshotApi = {
  list: (args: { connectionId: string }) =>
    api.SCHEMA_SNAPSHOT_LIST(args),
  create: (args: { connectionId: string; name?: string }) =>
    api.SCHEMA_SNAPSHOT_CREATE(args),
  get: (args: { id: string }) =>
    api.SCHEMA_SNAPSHOT_GET(args),
  delete: (args: { id: string }) =>
    api.SCHEMA_SNAPSHOT_DELETE(args),
  rename: (args: { id: string; name: string }) =>
    api.SCHEMA_SNAPSHOT_RENAME(args),
  validate: (args: { snapshotId: string }) =>
    api.SCHEMA_SNAPSHOT_VALIDATE(args),
  validateAgainstVersion: (args: { connectionId: string; versionId: string }) =>
    api.SCHEMA_VALIDATE_AGAINST_VERSION(args),
};
