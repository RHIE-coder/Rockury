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

  // Package
  [CHANNELS.PACKAGE_LIST]: () =>
    ipcRenderer.invoke(CHANNELS.PACKAGE_LIST),
  [CHANNELS.PACKAGE_GET]: (args) =>
    ipcRenderer.invoke(CHANNELS.PACKAGE_GET, args),
  [CHANNELS.PACKAGE_CREATE]: (args) =>
    ipcRenderer.invoke(CHANNELS.PACKAGE_CREATE, args),
  [CHANNELS.PACKAGE_UPDATE]: (args) =>
    ipcRenderer.invoke(CHANNELS.PACKAGE_UPDATE, args),
  [CHANNELS.PACKAGE_DELETE]: (args) =>
    ipcRenderer.invoke(CHANNELS.PACKAGE_DELETE, args),
  [CHANNELS.PACKAGE_LINK_RESOURCE]: (args) =>
    ipcRenderer.invoke(CHANNELS.PACKAGE_LINK_RESOURCE, args),
  [CHANNELS.PACKAGE_UNLINK_RESOURCE]: (args) =>
    ipcRenderer.invoke(CHANNELS.PACKAGE_UNLINK_RESOURCE, args),
  [CHANNELS.PACKAGE_GET_RESOURCES]: (args) =>
    ipcRenderer.invoke(CHANNELS.PACKAGE_GET_RESOURCES, args),

  // Connection
  [CHANNELS.CONNECTION_LIST]: () =>
    ipcRenderer.invoke(CHANNELS.CONNECTION_LIST),
  [CHANNELS.CONNECTION_GET]: (args) =>
    ipcRenderer.invoke(CHANNELS.CONNECTION_GET, args),
  [CHANNELS.CONNECTION_CREATE]: (args) =>
    ipcRenderer.invoke(CHANNELS.CONNECTION_CREATE, args),
  [CHANNELS.CONNECTION_UPDATE]: (args) =>
    ipcRenderer.invoke(CHANNELS.CONNECTION_UPDATE, args),
  [CHANNELS.CONNECTION_DELETE]: (args) =>
    ipcRenderer.invoke(CHANNELS.CONNECTION_DELETE, args),
  [CHANNELS.CONNECTION_TEST]: (args) =>
    ipcRenderer.invoke(CHANNELS.CONNECTION_TEST, args),

  // Diagram
  [CHANNELS.DIAGRAM_LIST]: (args) =>
    ipcRenderer.invoke(CHANNELS.DIAGRAM_LIST, args),
  [CHANNELS.DIAGRAM_GET]: (args) =>
    ipcRenderer.invoke(CHANNELS.DIAGRAM_GET, args),
  [CHANNELS.DIAGRAM_CREATE]: (args) =>
    ipcRenderer.invoke(CHANNELS.DIAGRAM_CREATE, args),
  [CHANNELS.DIAGRAM_UPDATE]: (args) =>
    ipcRenderer.invoke(CHANNELS.DIAGRAM_UPDATE, args),
  [CHANNELS.DIAGRAM_DELETE]: (args) =>
    ipcRenderer.invoke(CHANNELS.DIAGRAM_DELETE, args),
  [CHANNELS.DIAGRAM_GET_LAYOUT]: (args) =>
    ipcRenderer.invoke(CHANNELS.DIAGRAM_GET_LAYOUT, args),
  [CHANNELS.DIAGRAM_SAVE_LAYOUT]: (args) =>
    ipcRenderer.invoke(CHANNELS.DIAGRAM_SAVE_LAYOUT, args),

  // Diagram Versions
  [CHANNELS.DIAGRAM_VERSION_LIST]: (args) =>
    ipcRenderer.invoke(CHANNELS.DIAGRAM_VERSION_LIST, args),
  [CHANNELS.DIAGRAM_VERSION_CREATE]: (args) =>
    ipcRenderer.invoke(CHANNELS.DIAGRAM_VERSION_CREATE, args),
  [CHANNELS.DIAGRAM_VERSION_RESTORE]: (args) =>
    ipcRenderer.invoke(CHANNELS.DIAGRAM_VERSION_RESTORE, args),

  // Schema (Real)
  [CHANNELS.SCHEMA_FETCH_REAL]: (args) =>
    ipcRenderer.invoke(CHANNELS.SCHEMA_FETCH_REAL, args),

  // Diff
  [CHANNELS.SCHEMA_DIFF]: (args) =>
    ipcRenderer.invoke(CHANNELS.SCHEMA_DIFF, args),

  // DDL
  [CHANNELS.DDL_PARSE]: (args) =>
    ipcRenderer.invoke(CHANNELS.DDL_PARSE, args),
  [CHANNELS.DDL_GENERATE]: (args) =>
    ipcRenderer.invoke(CHANNELS.DDL_GENERATE, args),

  // Query
  [CHANNELS.QUERY_EXECUTE]: (args) =>
    ipcRenderer.invoke(CHANNELS.QUERY_EXECUTE, args),
  [CHANNELS.QUERY_LIST]: () =>
    ipcRenderer.invoke(CHANNELS.QUERY_LIST),
  [CHANNELS.QUERY_SAVE]: (args) =>
    ipcRenderer.invoke(CHANNELS.QUERY_SAVE, args),
  [CHANNELS.QUERY_UPDATE]: (args) =>
    ipcRenderer.invoke(CHANNELS.QUERY_UPDATE, args),
  [CHANNELS.QUERY_DELETE]: (args) =>
    ipcRenderer.invoke(CHANNELS.QUERY_DELETE, args),
  [CHANNELS.QUERY_HISTORY_LIST]: (args) =>
    ipcRenderer.invoke(CHANNELS.QUERY_HISTORY_LIST, args),

  // Document
  [CHANNELS.DOCUMENT_LIST]: () =>
    ipcRenderer.invoke(CHANNELS.DOCUMENT_LIST),
  [CHANNELS.DOCUMENT_GET]: (args) =>
    ipcRenderer.invoke(CHANNELS.DOCUMENT_GET, args),
  [CHANNELS.DOCUMENT_CREATE]: (args) =>
    ipcRenderer.invoke(CHANNELS.DOCUMENT_CREATE, args),
  [CHANNELS.DOCUMENT_UPDATE]: (args) =>
    ipcRenderer.invoke(CHANNELS.DOCUMENT_UPDATE, args),
  [CHANNELS.DOCUMENT_DELETE]: (args) =>
    ipcRenderer.invoke(CHANNELS.DOCUMENT_DELETE, args),
  [CHANNELS.DOCUMENT_AUTO_GENERATE]: (args) =>
    ipcRenderer.invoke(CHANNELS.DOCUMENT_AUTO_GENERATE, args),
  [CHANNELS.DOCUMENT_EXPORT]: (args) =>
    ipcRenderer.invoke(CHANNELS.DOCUMENT_EXPORT, args),

  // Validation
  [CHANNELS.VALIDATION_RUN]: (args) =>
    ipcRenderer.invoke(CHANNELS.VALIDATION_RUN, args),

  // Mocking
  [CHANNELS.MOCK_GENERATE]: (args) =>
    ipcRenderer.invoke(CHANNELS.MOCK_GENERATE, args),
  [CHANNELS.MOCK_EXPORT]: (args) =>
    ipcRenderer.invoke(CHANNELS.MOCK_EXPORT, args),
};

contextBridge.exposeInMainWorld('electronAPI', API);
