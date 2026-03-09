import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { validationSuiteService } from '#/services';
import type { IValidationRule } from '~/shared/types/db';

export function registerValidationSuiteHandlers() {
  ipcMain.handle(CHANNELS.VALIDATION_SUITE_LIST, async () => {
    try {
      const data = validationSuiteService.list();
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.VALIDATION_SUITE_GET, async (_event, args: { id: string }) => {
    try {
      const data = validationSuiteService.getById(args.id);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.VALIDATION_SUITE_CREATE, async (_event, args: { name: string; description: string }) => {
    try {
      const data = validationSuiteService.create(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.VALIDATION_SUITE_UPDATE, async (_event, args: { id: string; name?: string; description?: string; rules?: IValidationRule[] }) => {
    try {
      const { id, ...updates } = args;
      const data = validationSuiteService.update(id, updates);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.VALIDATION_SUITE_DELETE, async (_event, args: { id: string }) => {
    try {
      validationSuiteService.deleteById(args.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.VALIDATION_SUITE_RUN, async (_event, args: { suiteId: string; connectionId: string }) => {
    try {
      const data = await validationSuiteService.runSuite(args.suiteId, args.connectionId);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });
}
