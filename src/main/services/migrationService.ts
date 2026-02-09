import { migrationRepository } from '#/repositories';
import type { IMigration, TMigrationDirection, IDiffResult } from '~/shared/types/db';

export const migrationService = {
  list(diagramId: string, connectionId?: string): IMigration[] {
    return migrationRepository.list(diagramId, connectionId);
  },

  create(data: {
    diagramId: string;
    connectionId: string;
    direction: TMigrationDirection;
    diffSnapshot: IDiffResult;
    migrationDdl: string;
  }): IMigration {
    return migrationRepository.create(data);
  },

  apply(migrationId: string): IMigration {
    const migration = migrationRepository.getById(migrationId);
    if (!migration) throw new Error(`Migration not found: ${migrationId}`);
    if (migration.status === 'applied') throw new Error('Migration already applied');
    return migrationRepository.updateStatus(migrationId, 'applied');
  },

  delete(migrationId: string): void {
    const migration = migrationRepository.getById(migrationId);
    if (!migration) throw new Error(`Migration not found: ${migrationId}`);
    migrationRepository.deleteById(migrationId);
  },
};
