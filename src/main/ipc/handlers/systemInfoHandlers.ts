import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { systemInfoService } from '#/services';

export function registerSystemInfoHandlers() {
  ipcMain.handle(CHANNELS.GET_SYSTEM_INFO, async () => {
    try {
      const data = systemInfoService.getSystemInfo();
      return { success: true, data };
    } catch {
      return { success: false, data: null };
    }
  });
}
