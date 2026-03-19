import { collectionRepository } from '#/repositories';

export const collectionService = {
  listTree: (connectionId: string) => collectionRepository.listTree(connectionId),

  saveFolder: (data: Parameters<typeof collectionRepository.saveFolder>[0]) =>
    collectionRepository.saveFolder(data),

  deleteFolder: (id: string) => collectionRepository.deleteFolder(id),

  saveCollection: (data: Parameters<typeof collectionRepository.saveCollection>[0]) =>
    collectionRepository.saveCollection(data),

  getCollection: (id: string) => collectionRepository.getCollection(id),

  deleteCollection: (id: string) => collectionRepository.deleteCollection(id),

  saveItems: (collectionId: string, items: Parameters<typeof collectionRepository.saveItems>[1]) =>
    collectionRepository.saveItems(collectionId, items),
};
