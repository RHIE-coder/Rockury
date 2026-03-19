import { queryBrowserRepository } from '#/repositories';

export const queryBrowserService = {
  listTree: (connectionId: string) => queryBrowserRepository.listTree(connectionId),

  saveFolder: (data: Parameters<typeof queryBrowserRepository.saveFolder>[0]) =>
    queryBrowserRepository.saveFolder(data),

  deleteFolder: (id: string) => queryBrowserRepository.deleteFolder(id),

  saveQuery: (data: Parameters<typeof queryBrowserRepository.saveQuery>[0]) =>
    queryBrowserRepository.saveQuery(data),

  getQuery: (id: string) => queryBrowserRepository.getQuery(id),

  deleteQuery: (id: string) => queryBrowserRepository.deleteQuery(id),

  bulkMove: (items: Parameters<typeof queryBrowserRepository.bulkMove>[0]) =>
    queryBrowserRepository.bulkMove(items),
};
