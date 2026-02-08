import { CHANNELS } from './channels';
import type { ISystemInfo } from '~/shared/types';

export interface IEvents {
  // App
  [CHANNELS.GET_APP_VERSION]: {
    args: void;
    response: { success: boolean; version: string };
  };
  // System
  [CHANNELS.GET_SYSTEM_INFO]: {
    args: void;
    response: { success: boolean; data: ISystemInfo };
  };
}