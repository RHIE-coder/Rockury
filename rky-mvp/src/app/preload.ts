import { contextBridge, ipcRenderer } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { type TElectronAPI } from '~/shared/ipc/preload';

const API: TElectronAPI = {
  // App Info
  [CHANNELS.GET_APP_VERSION]: () =>
    ipcRenderer.invoke(CHANNELS.GET_APP_VERSION),
};

contextBridge.exposeInMainWorld('electronAPI', API);
