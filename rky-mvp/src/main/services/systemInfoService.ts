import { app } from 'electron';
import type { ISystemInfo } from '~/shared/types';

export const systemInfoService = {
  getSystemInfo(): ISystemInfo {
    return {
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
      platform: process.platform,
    };
  },
};
