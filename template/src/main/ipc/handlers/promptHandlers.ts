import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { promptService } from '#/services';

export function registerPromptHandlers() {
  ipcMain.handle(CHANNELS.GET_PROMPTS, async () => {
    try {
      const data = promptService.getAll();
      return { success: true, data };
    } catch {
      return { success: false, data: [] };
    }
  });

  ipcMain.handle(CHANNELS.CREATE_PROMPT, async (_, args) => {
    try {
      const data = promptService.create(args);
      return { success: true, data };
    } catch {
      return { success: false, data: null };
    }
  });

  ipcMain.handle(CHANNELS.UPDATE_PROMPT, async (_, args) => {
    try {
      const data = promptService.update(args);
      return { success: true, data };
    } catch {
      return { success: false, data: null };
    }
  });

  ipcMain.handle(CHANNELS.DELETE_PROMPT, async (_, args) => {
    try {
      const deleted = promptService.delete(args.id);
      return { success: deleted };
    } catch {
      return { success: false };
    }
  });
}
