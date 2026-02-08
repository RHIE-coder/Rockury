import type { TElectronAPI } from "~/shared/ipc/preload";

declare global {
  interface Window {
    electronAPI: TElectronAPI;
  }
}

export {};
