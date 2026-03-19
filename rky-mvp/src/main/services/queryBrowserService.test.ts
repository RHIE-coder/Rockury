import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listTree: vi.fn(),
  saveFolder: vi.fn(),
  deleteFolder: vi.fn(),
  saveQuery: vi.fn(),
  getQuery: vi.fn(),
  deleteQuery: vi.fn(),
  bulkMove: vi.fn(),
}));

vi.mock('#/repositories', () => ({
  queryBrowserRepository: {
    listTree: mocks.listTree,
    saveFolder: mocks.saveFolder,
    deleteFolder: mocks.deleteFolder,
    saveQuery: mocks.saveQuery,
    getQuery: mocks.getQuery,
    deleteQuery: mocks.deleteQuery,
    bulkMove: mocks.bulkMove,
  },
}));

import { queryBrowserService } from './queryBrowserService';

describe('queryBrowserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listTree delegates to repository', () => {
    // Arrange
    const expected = { folders: [], queries: [] };
    mocks.listTree.mockReturnValue(expected);

    // Act
    const result = queryBrowserService.listTree('conn-1');

    // Assert
    expect(mocks.listTree).toHaveBeenCalledWith('conn-1');
    expect(result).toBe(expected);
  });

  it('saveFolder delegates to repository', () => {
    // Arrange
    const data = { connectionId: 'conn-1', name: 'test', sortOrder: 0 };
    const expected = { id: '1', ...data, parentId: null, createdAt: '', updatedAt: '' };
    mocks.saveFolder.mockReturnValue(expected);

    // Act
    const result = queryBrowserService.saveFolder(data);

    // Assert
    expect(mocks.saveFolder).toHaveBeenCalledWith(data);
    expect(result).toBe(expected);
  });

  it('deleteFolder delegates to repository', () => {
    // Act
    queryBrowserService.deleteFolder('folder-1');

    // Assert
    expect(mocks.deleteFolder).toHaveBeenCalledWith('folder-1');
  });

  it('saveQuery delegates to repository', () => {
    // Arrange
    const data = {
      connectionId: 'conn-1',
      name: 'q1',
      description: 'desc',
      sqlContent: 'SELECT 1',
      sortOrder: 0,
    };
    const expected = { id: '1', ...data, tags: [], folderId: null, createdAt: '', updatedAt: '' };
    mocks.saveQuery.mockReturnValue(expected);

    // Act
    const result = queryBrowserService.saveQuery(data);

    // Assert
    expect(mocks.saveQuery).toHaveBeenCalledWith(data);
    expect(result).toBe(expected);
  });

  it('getQuery delegates to repository', () => {
    // Arrange
    const expected = { id: '1', name: 'q1' };
    mocks.getQuery.mockReturnValue(expected);

    // Act
    const result = queryBrowserService.getQuery('1');

    // Assert
    expect(mocks.getQuery).toHaveBeenCalledWith('1');
    expect(result).toBe(expected);
  });

  it('deleteQuery delegates and returns referenced collections on failure', () => {
    // Arrange
    const expected = {
      success: false,
      referencedCollections: [{ id: 'col-1', name: 'My Collection' }],
    };
    mocks.deleteQuery.mockReturnValue(expected);

    // Act
    const result = queryBrowserService.deleteQuery('q-1');

    // Assert
    expect(mocks.deleteQuery).toHaveBeenCalledWith('q-1');
    expect(result).toEqual(expected);
    expect(result.referencedCollections).toHaveLength(1);
  });

  it('deleteQuery delegates and returns success', () => {
    // Arrange
    mocks.deleteQuery.mockReturnValue({ success: true });

    // Act
    const result = queryBrowserService.deleteQuery('q-2');

    // Assert
    expect(result).toEqual({ success: true });
  });

  it('bulkMove delegates to repository', () => {
    // Arrange
    const items = [{ id: '1', folderId: 'f-1', sortOrder: 0 }];

    // Act
    queryBrowserService.bulkMove(items);

    // Assert
    expect(mocks.bulkMove).toHaveBeenCalledWith(items);
  });
});
