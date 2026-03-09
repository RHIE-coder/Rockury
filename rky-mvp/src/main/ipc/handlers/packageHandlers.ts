import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { packageService } from '#/services';

export function registerPackageHandlers() {
  ipcMain.handle(CHANNELS.PACKAGE_LIST, async () => {
    try {
      const data = packageService.list();
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.PACKAGE_GET, async (_event, args: { id: string }) => {
    try {
      const data = packageService.getById(args.id);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.PACKAGE_CREATE, async (_event, args: { name: string; description: string }) => {
    try {
      const data = packageService.create(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.PACKAGE_UPDATE, async (_event, args: { id: string; name: string; description: string }) => {
    try {
      const data = packageService.update(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.PACKAGE_DELETE, async (_event, args: { id: string }) => {
    try {
      packageService.deleteById(args.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.PACKAGE_LINK_RESOURCE, async (_event, args: { packageId: string; resourceType: 'connection' | 'diagram' | 'query' | 'document'; resourceId: string }) => {
    try {
      const data = packageService.linkResource(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.PACKAGE_UNLINK_RESOURCE, async (_event, args: { packageId: string; resourceType: 'connection' | 'diagram' | 'query' | 'document'; resourceId: string }) => {
    try {
      packageService.unlinkResource(args);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.PACKAGE_GET_RESOURCES, async (_event, args: { packageId: string }) => {
    try {
      const data = packageService.getResources(args.packageId);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });
}
