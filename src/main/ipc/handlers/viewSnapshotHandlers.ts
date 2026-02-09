import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { viewSnapshotService } from '#/services';

export function registerViewSnapshotHandlers() {
  ipcMain.handle(CHANNELS.VIEW_SNAPSHOT_LIST, (_, args: { diagramId: string }) => {
    try {
      const data = viewSnapshotService.list(args.diagramId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle(CHANNELS.VIEW_SNAPSHOT_CREATE, (_, args) => {
    try {
      const data = viewSnapshotService.create(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle(CHANNELS.VIEW_SNAPSHOT_RESTORE, (_, args: { snapshotId: string }) => {
    try {
      const data = viewSnapshotService.restore(args.snapshotId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle(CHANNELS.VIEW_SNAPSHOT_DELETE, (_, args: { snapshotId: string }) => {
    try {
      viewSnapshotService.delete(args.snapshotId);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
