import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { seedService } from '#/services';

export function registerSeedHandlers() {
  ipcMain.handle(CHANNELS.SEED_LIST, async () => {
    try {
      const data = seedService.list();
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.SEED_CREATE, async (_event, args: { name: string; description: string; dmlContent: string; targetTables: string[] }) => {
    try {
      const data = seedService.create(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.SEED_UPDATE, async (_event, args: { id: string; name?: string; description?: string; dmlContent?: string; targetTables?: string[] }) => {
    try {
      const { id, ...updates } = args;
      const data = seedService.update(id, updates);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.SEED_DELETE, async (_event, args: { id: string }) => {
    try {
      seedService.deleteById(args.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.SEED_CAPTURE, async (_event, args: { connectionId: string; tableName: string; whereClause?: string; limit?: number }) => {
    try {
      const data = await seedService.captureFromTable(args.connectionId, args.tableName, args.whereClause, args.limit);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });
}
