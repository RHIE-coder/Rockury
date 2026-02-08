import { BrowserWindowConstructorOptions } from "electron";

export type TAppBrowserWindowOptions = {
  devServerUrl?: string;
  rendererName: string;
  windowOptions: BrowserWindowConstructorOptions;
}

declare const MAIN_WINDOW_VITE_NAME: string;
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;

export const BROWSER_WINDOWS = {
    MAIN: MAIN_WINDOW_VITE_NAME,
} as const

export type WindowTarget = keyof typeof BROWSER_WINDOWS;

export const OPTIONS:Record<string, TAppBrowserWindowOptions> = {
    [BROWSER_WINDOWS.MAIN]: {
        devServerUrl: MAIN_WINDOW_VITE_DEV_SERVER_URL,
        rendererName: MAIN_WINDOW_VITE_NAME,
        windowOptions: {
            width: 1280,
            height: 720,
            resizable: true,
            // maxWidth: 1920,
            // maxHeight: 1080,
            minWidth: 640,
            minHeight: 480,
        }
    },
}
