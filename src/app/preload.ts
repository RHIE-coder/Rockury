import { contextBridge, ipcRenderer } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { type TElectronAPI } from '~/shared/ipc/preload';

const API: TElectronAPI = {
  // App
  [CHANNELS.GET_APP_VERSION]: () =>
    ipcRenderer.invoke(CHANNELS.GET_APP_VERSION),
  // System
  [CHANNELS.GET_SYSTEM_INFO]: () =>
    ipcRenderer.invoke(CHANNELS.GET_SYSTEM_INFO),
};

contextBridge.exposeInMainWorld('electronAPI', API);
