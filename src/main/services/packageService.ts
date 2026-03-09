import { packageRepository } from '#/repositories';
import type { IPackage, IPackageResource, TResourceType } from '~/shared/types/db';

export const packageService = {
  list(): IPackage[] {
    return packageRepository.list();
  },

  getById(id: string): IPackage {
    const pkg = packageRepository.getById(id);
    if (!pkg) throw new Error(`Package not found: ${id}`);
    return pkg;
  },

  create(data: { name: string; description: string }): IPackage {
    return packageRepository.create(data);
  },

  update(data: { id: string; name: string; description: string }): IPackage {
    const existing = packageRepository.getById(data.id);
    if (!existing) throw new Error(`Package not found: ${data.id}`);
    return packageRepository.update(data);
  },

  deleteById(id: string): void {
    packageRepository.deleteById(id);
  },

  linkResource(data: {
    packageId: string;
    resourceType: TResourceType;
    resourceId: string;
  }): IPackageResource {
    return packageRepository.linkResource(data);
  },

  unlinkResource(data: {
    packageId: string;
    resourceType: TResourceType;
    resourceId: string;
  }): void {
    packageRepository.unlinkResource(data);
  },

  getResources(packageId: string): IPackageResource[] {
    return packageRepository.getResources(packageId);
  },
};
