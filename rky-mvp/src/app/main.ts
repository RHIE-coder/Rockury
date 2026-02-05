import { app, BrowserWindow } from 'electron';
import started from 'electron-squirrel-startup';
import { BROWSER_WINDOWS } from './windows-config';
import { createWindow } from './windows';
import { registerAllHandlers } from '#/ipc';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Register all IPC handlers
  registerAllHandlers();

  createWindow(BROWSER_WINDOWS.MAIN);
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create a window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow(BROWSER_WINDOWS.MAIN);
  }
});
