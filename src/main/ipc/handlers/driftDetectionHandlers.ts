import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { driftDetectionService } from '#/services';

export function registerDriftDetectionHandlers() {
  ipcMain.handle(CHANNELS.DRIFT_LIGHTWEIGHT_CHECK, async (_event, args: { connectionId: string }) => {
    try {
      const data = await driftDetectionService.lightweightCheck(args.connectionId);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.DRIFT_FULL_CHECK, async (_event, args: { connectionId: string }) => {
    try {
      const data = await driftDetectionService.fullCheck(args.connectionId);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });
}
