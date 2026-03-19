import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listTree: vi.fn(),
  saveFolder: vi.fn(),
  deleteFolder: vi.fn(),
  saveCollection: vi.fn(),
  getCollection: vi.fn(),
  deleteCollection: vi.fn(),
  saveItems: vi.fn(),
}));

vi.mock('#/repositories', () => ({
  collectionRepository: {
    listTree: mocks.listTree,
    saveFolder: mocks.saveFolder,
    deleteFolder: mocks.deleteFolder,
    saveCollection: mocks.saveCollection,
    getCollection: mocks.getCollection,
    deleteCollection: mocks.deleteCollection,
    saveItems: mocks.saveItems,
  },
}));

import { collectionService } from './collectionService';

describe('collectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listTree delegates to repository', () => {
    // Arrange
    const expected = { folders: [], collections: [] };
    mocks.listTree.mockReturnValue(expected);

    // Act
    const result = collectionService.listTree('conn-1');

    // Assert
    expect(mocks.listTree).toHaveBeenCalledWith('conn-1');
    expect(result).toBe(expected);
  });

  it('saveFolder delegates to repository', () => {
    // Arrange
    const data = { connectionId: 'conn-1', name: 'folder', sortOrder: 0 };
    const expected = { id: '1', ...data, parentId: null, createdAt: '', updatedAt: '' };
    mocks.saveFolder.mockReturnValue(expected);

    // Act
    const result = collectionService.saveFolder(data);

    // Assert
    expect(mocks.saveFolder).toHaveBeenCalledWith(data);
    expect(result).toBe(expected);
  });

  it('deleteFolder delegates to repository', () => {
    // Act
    collectionService.deleteFolder('folder-1');

    // Assert
    expect(mocks.deleteFolder).toHaveBeenCalledWith('folder-1');
  });

  it('saveCollection delegates to repository', () => {
    // Arrange
    const data = {
      connectionId: 'conn-1',
      name: 'col-1',
      description: 'desc',
      sortOrder: 0,
    };
    const expected = { id: '1', ...data, folderId: null, createdAt: '', updatedAt: '' };
    mocks.saveCollection.mockReturnValue(expected);

    // Act
    const result = collectionService.saveCollection(data);

    // Assert
    expect(mocks.saveCollection).toHaveBeenCalledWith(data);
    expect(result).toBe(expected);
  });

  it('getCollection delegates to repository', () => {
    // Arrange
    const expected = { collection: { id: '1' }, items: [] };
    mocks.getCollection.mockReturnValue(expected);

    // Act
    const result = collectionService.getCollection('1');

    // Assert
    expect(mocks.getCollection).toHaveBeenCalledWith('1');
    expect(result).toBe(expected);
  });

  it('getCollection returns null when not found', () => {
    // Arrange
    mocks.getCollection.mockReturnValue(null);

    // Act
    const result = collectionService.getCollection('nonexistent');

    // Assert
    expect(result).toBeNull();
  });

  it('deleteCollection delegates to repository', () => {
    // Act
    collectionService.deleteCollection('col-1');

    // Assert
    expect(mocks.deleteCollection).toHaveBeenCalledWith('col-1');
  });

  it('saveItems delegates to repository', () => {
    // Arrange
    const items = [{ queryId: 'q-1', sortOrder: 0 }, { queryId: 'q-2', sortOrder: 1 }];

    // Act
    collectionService.saveItems('col-1', items);

    // Assert
    expect(mocks.saveItems).toHaveBeenCalledWith('col-1', items);
  });
});
