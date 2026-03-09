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
  // Prompts
  [CHANNELS.GET_PROMPTS]: () =>
    ipcRenderer.invoke(CHANNELS.GET_PROMPTS),
  [CHANNELS.CREATE_PROMPT]: (args) =>
    ipcRenderer.invoke(CHANNELS.CREATE_PROMPT, args),
  [CHANNELS.UPDATE_PROMPT]: (args) =>
    ipcRenderer.invoke(CHANNELS.UPDATE_PROMPT, args),
  [CHANNELS.DELETE_PROMPT]: (args) =>
    ipcRenderer.invoke(CHANNELS.DELETE_PROMPT, args),
};

contextBridge.exposeInMainWorld('electronAPI', API);
