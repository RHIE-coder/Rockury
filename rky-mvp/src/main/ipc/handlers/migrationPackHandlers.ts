import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { migrationPackService } from '#/services';

export function registerMigrationPackHandlers() {
  ipcMain.handle(CHANNELS.MIGRATION_PACK_LIST, async (_event, args: { diagramId: string }) => {
    try {
      const data = migrationPackService.list(args.diagramId);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.MIGRATION_PACK_CREATE, async (_event, args: {
    connectionId: string;
    diagramId: string;
    sourceVersionId: string | null;
    targetVersionId: string;
  }) => {
    try {
      const data = migrationPackService.create(
        args.connectionId,
        args.diagramId,
        args.sourceVersionId,
        args.targetVersionId,
      );
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.MIGRATION_PACK_GET, async (_event, args: { id: string }) => {
    try {
      const data = migrationPackService.getById(args.id);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.MIGRATION_PACK_UPDATE_DML, async (_event, args: { id: string; seedDml: string }) => {
    try {
      const data = migrationPackService.updateSeedDml(args.id, args.seedDml);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.MIGRATION_PACK_EXECUTE, async (_event, args: { id: string }) => {
    try {
      const data = await migrationPackService.execute(args.id);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.MIGRATION_PACK_ROLLBACK, async (_event, args: { id: string }) => {
    try {
      const data = await migrationPackService.rollback(args.id);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.MIGRATION_PACK_DELETE, async (_event, args: { id: string }) => {
    try {
      migrationPackService.deleteById(args.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
