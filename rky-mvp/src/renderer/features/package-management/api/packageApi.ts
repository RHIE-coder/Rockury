import { getElectronApi } from '@/shared/api/electronApi';
import type { TResourceType } from '@/entities/package';

const api = getElectronApi();

export const packageApi = {
  list: () => api.PACKAGE_LIST(),
  get: (id: string) => api.PACKAGE_GET({ id }),
  create: (args: { name: string; description: string }) => api.PACKAGE_CREATE(args),
  update: (args: { id: string; name: string; description: string }) => api.PACKAGE_UPDATE(args),
  delete: (id: string) => api.PACKAGE_DELETE({ id }),
  linkResource: (args: { packageId: string; resourceType: TResourceType; resourceId: string }) =>
    api.PACKAGE_LINK_RESOURCE(args),
  unlinkResource: (args: { packageId: string; resourceType: TResourceType; resourceId: string }) =>
    api.PACKAGE_UNLINK_RESOURCE(args),
  getResources: (packageId: string) => api.PACKAGE_GET_RESOURCES({ packageId }),
};
