import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { documentService } from '#/services';
import type { TExportFormat } from '~/shared/types/db';

export function registerDocumentHandlers() {
  ipcMain.handle(CHANNELS.DOCUMENT_LIST, async () => {
    try {
      const data = documentService.list();
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.DOCUMENT_GET, async (_event, args: { id: string }) => {
    try {
      const data = documentService.getById(args.id);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.DOCUMENT_CREATE, async (_event, args: { name: string; content: string }) => {
    try {
      const data = documentService.create(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.DOCUMENT_UPDATE, async (_event, args: { id: string; name?: string; content?: string }) => {
    try {
      const { id, ...data } = args;
      const result = documentService.update(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.DOCUMENT_DELETE, async (_event, args: { id: string }) => {
    try {
      documentService.deleteById(args.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.DOCUMENT_AUTO_GENERATE, async (_event, args: { diagramId: string }) => {
    try {
      const data = documentService.autoGenerate(args.diagramId);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.DOCUMENT_EXPORT, async (_event, args: { documentId: string; format: TExportFormat; outputPath?: string }) => {
    try {
      // Export is primarily handled by the renderer for PDF/image formats.
      // For markdown, we return the content directly.
      const doc = documentService.getById(args.documentId);
      return { success: true, data: { filePath: '', content: doc.content } };
    } catch (error) {
      return { success: false, data: null, error: (error as Error).message };
    }
  });
}
