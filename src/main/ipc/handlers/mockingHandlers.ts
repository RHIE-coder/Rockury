import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { mockingService } from '#/services';
import type { IMockResult } from '~/shared/types/db';

export function registerMockingHandlers() {
  ipcMain.handle(CHANNELS.MOCK_GENERATE, async (_event, args: { tableIds: string[]; diagramId: string; rowCount: number }) => {
    try {
      const data = mockingService.generate(args.tableIds, args.diagramId, args.rowCount);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.MOCK_EXPORT, async (_event, args: { mockResult: IMockResult; format: 'sql' | 'csv' | 'json' }) => {
    try {
      const content = mockingService.exportMock(args.mockResult, args.format);
      return { success: true, data: { content } };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });
}
