import { getDb } from '#/infrastructure';
import type { IPackage, IPackageResource, TResourceType } from '~/shared/types/db';

interface PackageRow {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface PackageResourceRow {
  id: string;
  package_id: string;
  resource_type: string;
  resource_id: string;
  is_shared: number;
}

function toPackage(row: PackageRow): IPackage {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPackageResource(row: PackageResourceRow): IPackageResource {
  return {
    id: row.id,
    packageId: row.package_id,
    resourceType: row.resource_type as TResourceType,
    resourceId: row.resource_id,
    isShared: row.is_shared === 1,
  };
}

export const packageRepository = {
  list(): IPackage[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM packages ORDER BY created_at DESC').all() as PackageRow[];
    return rows.map(toPackage);
  },

  getById(id: string): IPackage | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM packages WHERE id = ?').get(id) as PackageRow | undefined;
    return row ? toPackage(row) : null;
  },

  create(data: { name: string; description: string }): IPackage {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      'INSERT INTO packages (id, name, description) VALUES (?, ?, ?)',
    ).run(id, data.name, data.description);
    return this.getById(id)!;
  },

  update(data: { id: string; name: string; description: string }): IPackage {
    const db = getDb();
    db.prepare(
      `UPDATE packages SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(data.name, data.description, data.id);
    return this.getById(data.id)!;
  },

  deleteById(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM packages WHERE id = ?').run(id);
  },

  linkResource(data: {
    packageId: string;
    resourceType: TResourceType;
    resourceId: string;
  }): IPackageResource {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      'INSERT INTO package_resources (id, package_id, resource_type, resource_id) VALUES (?, ?, ?, ?)',
    ).run(id, data.packageId, data.resourceType, data.resourceId);
    const row = db.prepare('SELECT * FROM package_resources WHERE id = ?').get(id) as PackageResourceRow;
    return toPackageResource(row);
  },

  unlinkResource(data: {
    packageId: string;
    resourceType: TResourceType;
    resourceId: string;
  }): void {
    const db = getDb();
    db.prepare(
      'DELETE FROM package_resources WHERE package_id = ? AND resource_type = ? AND resource_id = ?',
    ).run(data.packageId, data.resourceType, data.resourceId);
  },

  getResources(packageId: string): IPackageResource[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM package_resources WHERE package_id = ?',
    ).all(packageId) as PackageResourceRow[];
    return rows.map(toPackageResource);
  },
};
