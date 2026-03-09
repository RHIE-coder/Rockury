import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { connectionService } from '#/services';
import type { IConnectionFormData } from '~/shared/types/db';

export function registerConnectionHandlers() {
  ipcMain.handle(CHANNELS.CONNECTION_LIST, async () => {
    try {
      const data = connectionService.list();
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.CONNECTION_GET, async (_event, args: { id: string }) => {
    try {
      const data = connectionService.getById(args.id);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.CONNECTION_CREATE, async (_event, args: IConnectionFormData) => {
    try {
      const data = connectionService.create(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.CONNECTION_UPDATE, async (_event, args: { id: string } & Partial<IConnectionFormData>) => {
    try {
      const { id, ...formData } = args;
      const data = connectionService.update(id, formData);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.CONNECTION_DELETE, async (_event, args: { id: string }) => {
    try {
      connectionService.deleteById(args.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.CONNECTION_REORDER, async (_event, args: { orderedIds: string[] }) => {
    try {
      connectionService.reorder(args.orderedIds);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.CONNECTION_GET_PASSWORD, async (_event, args: { id: string }) => {
    try {
      const config = connectionService.getConnectionConfig(args.id);
      return { success: true, data: config.password };
    } catch (error) {
      return { success: false, data: '', error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.CONNECTION_TEST, async (_event, args: IConnectionFormData) => {
    try {
      const data = await connectionService.testConnection(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.CONNECTION_SET_IGNORED, async (_event, args: { id: string; ignored: boolean }) => {
    try {
      const data = connectionService.setIgnored(args.id, args.ignored);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.CONNECTION_TEST_BY_ID, async (_event, args: { id: string }) => {
    try {
      const data = await connectionService.testConnectionById(args.id);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });
}
