import { BrowserWindow } from "electron";
import path from "path";
import { OPTIONS } from "./windows-config";

export const createWindow = (target: string) => {
  const option = OPTIONS[target]

  const window = new BrowserWindow({
    ...option.windowOptions,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: true,
    },
  });
  // and load the index.html of the app.
  if (typeof option.devServerUrl !== 'undefined') {
    window.loadURL(option.devServerUrl);
  } else {
    window.loadFile(
      path.join(__dirname, `../renderer/${option.rendererName}/index.html`)
    );
  }

  // Open the DevTools.
  window.webContents.openDevTools();
  // mainWindow.webContents.toggleDevTools();

  return window;
};
