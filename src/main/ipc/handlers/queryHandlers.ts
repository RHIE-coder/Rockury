import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { queryService } from '#/services';

export function registerQueryHandlers() {
  ipcMain.handle(CHANNELS.QUERY_EXECUTE, async (_event, args: { connectionId: string; sql: string }) => {
    try {
      const data = await queryService.executeQuery(args.connectionId, args.sql);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QUERY_LIST, async () => {
    try {
      const data = queryService.listQueries();
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QUERY_SAVE, async (_event, args: { name: string; description: string; sqlContent: string; tags: string[] }) => {
    try {
      const data = queryService.saveQuery(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QUERY_UPDATE, async (_event, args: { id: string; name?: string; description?: string; sqlContent?: string; tags?: string[] }) => {
    try {
      const { id, ...data } = args;
      const result = queryService.updateQuery(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QUERY_DELETE, async (_event, args: { id: string }) => {
    try {
      queryService.deleteQuery(args.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QUERY_HISTORY_LIST, async (_event, args: { limit?: number }) => {
    try {
      const data = queryService.listHistory(args?.limit);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });
}
