import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { queryBrowserService, collectionService, transactionService } from '#/services';
import { queryHistoryRepository } from '#/repositories';

export function registerQueryBrowserHandlers() {
  // Query tree
  ipcMain.handle(CHANNELS.QB_QUERY_TREE_LIST, async (_e, args: { connectionId: string }) => {
    try {
      const data = queryBrowserService.listTree(args.connectionId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QB_QUERY_FOLDER_SAVE, async (_e, args) => {
    try {
      const data = queryBrowserService.saveFolder(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QB_QUERY_FOLDER_DELETE, async (_e, args: { id: string }) => {
    try {
      queryBrowserService.deleteFolder(args.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QB_QUERY_SAVE, async (_e, args) => {
    try {
      const data = queryBrowserService.saveQuery(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QB_QUERY_GET, async (_e, args: { id: string }) => {
    try {
      const data = queryBrowserService.getQuery(args.id);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QB_QUERY_DELETE, async (_e, args: { id: string }) => {
    try {
      const result = queryBrowserService.deleteQuery(args.id);
      if (!result.success) {
        return { success: false, referencedCollections: result.referencedCollections };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QB_QUERY_BULK_MOVE, async (_e, args: { items: { id: string; folderId?: string | null; sortOrder: number }[] }) => {
    try {
      queryBrowserService.bulkMove(args.items);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Collection tree
  ipcMain.handle(CHANNELS.QB_COLLECTION_TREE_LIST, async (_e, args: { connectionId: string }) => {
    try {
      const data = collectionService.listTree(args.connectionId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QB_COLLECTION_FOLDER_SAVE, async (_e, args) => {
    try {
      const data = collectionService.saveFolder(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QB_COLLECTION_FOLDER_DELETE, async (_e, args: { id: string }) => {
    try {
      collectionService.deleteFolder(args.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QB_COLLECTION_SAVE, async (_e, args) => {
    try {
      const data = collectionService.saveCollection(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QB_COLLECTION_GET, async (_e, args: { id: string }) => {
    try {
      const data = collectionService.getCollection(args.id);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QB_COLLECTION_DELETE, async (_e, args: { id: string }) => {
    try {
      collectionService.deleteCollection(args.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QB_COLLECTION_ITEM_SAVE, async (_e, args: { collectionId: string; items: { queryId: string; sortOrder: number }[] }) => {
    try {
      collectionService.saveItems(args.collectionId, args.items);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Transaction
  ipcMain.handle(CHANNELS.QB_TX_BEGIN, async (_e, args: { connectionId: string }) => {
    try {
      const txId = await transactionService.begin(args.connectionId);
      return { success: true, data: { txId } };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QB_TX_EXECUTE, async (_e, args: { txId: string; sql: string }) => {
    try {
      const data = await transactionService.executeInTx(args.txId, args.sql);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QB_TX_COMMIT, async (_e, args: { txId: string }) => {
    try {
      await transactionService.commit(args.txId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QB_TX_ROLLBACK, async (_e, args: { txId: string }) => {
    try {
      await transactionService.rollback(args.txId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // History
  ipcMain.handle(CHANNELS.QB_HISTORY_LIST, async (_e, args) => {
    try {
      const data = queryHistoryRepository.listFiltered(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(CHANNELS.QB_HISTORY_DELETE, async (_e, args: { id: string }) => {
    try {
      queryHistoryRepository.deleteById(args.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
