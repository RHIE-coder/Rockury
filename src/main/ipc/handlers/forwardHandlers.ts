import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { forwardService } from '#/services';

export function registerForwardHandlers() {
  ipcMain.handle(CHANNELS.FORWARD_PRE_CHECK, async (_event, args: { connectionId: string; diagramId: string; targetVersionId: string }) => {
    try {
      const data = await forwardService.preCheck(args.connectionId, args.diagramId, args.targetVersionId);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.FORWARD_EXECUTE_STEP, async (_event, args: { connectionId: string; migrationPackId: string; statementIndex: number; expectedChecksum: string }) => {
    try {
      const data = await forwardService.executeStep(args.connectionId, args.migrationPackId, args.statementIndex, args.expectedChecksum);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.FORWARD_ROLLBACK, async (_event, args: { migrationPackId: string }) => {
    try {
      const data = await forwardService.rollback(args.migrationPackId);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });
}
