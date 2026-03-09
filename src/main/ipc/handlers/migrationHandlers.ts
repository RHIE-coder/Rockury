import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { migrationService } from '#/services';
import type { TMigrationDirection, IDiffResult } from '~/shared/types/db';

export function registerMigrationHandlers() {
  ipcMain.handle(CHANNELS.MIGRATION_LIST, async (_event, args: { diagramId: string; connectionId?: string }) => {
    try {
      const data = migrationService.list(args.diagramId, args.connectionId);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.MIGRATION_CREATE, async (_event, args: {
    diagramId: string;
    connectionId: string;
    direction: TMigrationDirection;
    diffSnapshot: IDiffResult;
    migrationDdl: string;
    rollbackDdl?: string;
  }) => {
    try {
      const data = migrationService.create(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.MIGRATION_APPLY, async (_event, args: { migrationId: string }) => {
    try {
      const data = await migrationService.apply(args.migrationId);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.MIGRATION_ROLLBACK, async (_event, args: { migrationId: string }) => {
    try {
      const data = await migrationService.rollback(args.migrationId);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.MIGRATION_DELETE, async (_event, args: { migrationId: string }) => {
    try {
      migrationService.delete(args.migrationId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
