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

  ipcMain.handle(CHANNELS.CONNECTION_TEST, async (_event, args: IConnectionFormData) => {
    try {
      const data = await connectionService.testConnection(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });
}
