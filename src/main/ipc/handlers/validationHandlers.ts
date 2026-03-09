import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { validationService } from '#/services';

export function registerValidationHandlers() {
  ipcMain.handle(CHANNELS.VALIDATION_RUN, async (_event, args: { virtualDiagramId: string; connectionId: string }) => {
    try {
      const data = await validationService.validate(args.virtualDiagramId, args.connectionId);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });
}
