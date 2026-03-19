import { getDb } from '#/infrastructure';
import type { ICollection, ICollectionFolder, ICollectionItem } from '~/shared/types/db';

interface CollectionFolderRow {
  id: string;
  connection_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface CollectionRow {
  id: string;
  connection_id: string;
  folder_id: string | null;
  name: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface CollectionItemRow {
  id: string;
  collection_id: string;
  query_id: string;
  sort_order: number;
  query_name?: string;
  query_description?: string;
  sql_content?: string;
}

function toCollectionFolder(row: CollectionFolderRow): ICollectionFolder {
  return {
    id: row.id,
    connectionId: row.connection_id,
    parentId: row.parent_id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCollection(row: CollectionRow): ICollection {
  return {
    id: row.id,
    connectionId: row.connection_id,
    folderId: row.folder_id,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCollectionItem(row: CollectionItemRow): ICollectionItem {
  return {
    id: row.id,
    collectionId: row.collection_id,
    queryId: row.query_id,
    sortOrder: row.sort_order,
    queryName: row.query_name,
    queryDescription: row.query_description,
    sqlContent: row.sql_content,
  };
}

export const collectionRepository = {
  listTree(connectionId: string): { folders: ICollectionFolder[]; collections: ICollection[] } {
    const db = getDb();
    const folders = db
      .prepare('SELECT * FROM collection_folders WHERE connection_id = ? ORDER BY sort_order ASC')
      .all(connectionId) as CollectionFolderRow[];
    const collections = db
      .prepare('SELECT * FROM collections WHERE connection_id = ? ORDER BY sort_order ASC')
      .all(connectionId) as CollectionRow[];

    return {
      folders: folders.map(toCollectionFolder),
      collections: collections.map(toCollection),
    };
  },

  saveFolder(data: {
    id?: string;
    connectionId: string;
    parentId?: string | null;
    name: string;
    sortOrder: number;
  }): ICollectionFolder {
    const db = getDb();

    if (data.id) {
      const existing = db.prepare('SELECT id FROM collection_folders WHERE id = ?').get(data.id);
      if (existing) {
        const sets: string[] = [];
        const values: unknown[] = [];

        sets.push('name = ?'); values.push(data.name);
        sets.push('sort_order = ?'); values.push(data.sortOrder);
        if (data.parentId !== undefined) { sets.push('parent_id = ?'); values.push(data.parentId); }
        sets.push(`updated_at = datetime('now')`);
        values.push(data.id);

        db.prepare(`UPDATE collection_folders SET ${sets.join(', ')} WHERE id = ?`).run(...values);

        const row = db.prepare('SELECT * FROM collection_folders WHERE id = ?').get(data.id) as CollectionFolderRow;
        return toCollectionFolder(row);
      }
    }

    const id = data.id ?? crypto.randomUUID();
    db.prepare(
      'INSERT INTO collection_folders (id, connection_id, parent_id, name, sort_order) VALUES (?, ?, ?, ?, ?)',
    ).run(id, data.connectionId, data.parentId ?? null, data.name, data.sortOrder);

    const row = db.prepare('SELECT * FROM collection_folders WHERE id = ?').get(id) as CollectionFolderRow;
    return toCollectionFolder(row);
  },

  deleteFolder(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM collection_folders WHERE id = ?').run(id);
  },

  saveCollection(data: {
    id?: string;
    connectionId: string;
    folderId?: string | null;
    name: string;
    description: string;
    sortOrder: number;
  }): ICollection {
    const db = getDb();

    if (data.id) {
      const existing = db.prepare('SELECT id FROM collections WHERE id = ?').get(data.id);
      if (existing) {
        const sets: string[] = [];
        const values: unknown[] = [];

        if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
        if (data.description !== undefined) { sets.push('description = ?'); values.push(data.description); }
        if (data.folderId !== undefined) { sets.push('folder_id = ?'); values.push(data.folderId); }
        if (data.sortOrder !== undefined) { sets.push('sort_order = ?'); values.push(data.sortOrder); }

        if (sets.length > 0) {
          sets.push(`updated_at = datetime('now')`);
          values.push(data.id);
          db.prepare(`UPDATE collections SET ${sets.join(', ')} WHERE id = ?`).run(...values);
        }

        const row = db.prepare('SELECT * FROM collections WHERE id = ?').get(data.id) as CollectionRow;
        return toCollection(row);
      }
    }

    const id = data.id ?? crypto.randomUUID();
    db.prepare(
      'INSERT INTO collections (id, connection_id, folder_id, name, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(id, data.connectionId, data.folderId ?? null, data.name, data.description, data.sortOrder);

    const row = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as CollectionRow;
    return toCollection(row);
  },

  getCollection(id: string): { collection: ICollection; items: ICollectionItem[] } | null {
    const db = getDb();
    const collectionRow = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as CollectionRow | undefined;

    if (!collectionRow) return null;

    const itemRows = db.prepare(
      'SELECT ci.*, q.name as query_name, q.description as query_description, q.sql_content FROM collection_items ci JOIN queries q ON q.id = ci.query_id WHERE ci.collection_id = ? ORDER BY ci.sort_order ASC',
    ).all(id) as CollectionItemRow[];

    return {
      collection: toCollection(collectionRow),
      items: itemRows.map(toCollectionItem),
    };
  },

  deleteCollection(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM collections WHERE id = ?').run(id);
  },

  saveItems(collectionId: string, items: { queryId: string; sortOrder: number }[]): void {
    const db = getDb();

    const runTransaction = db.transaction(() => {
      db.prepare('DELETE FROM collection_items WHERE collection_id = ?').run(collectionId);

      const stmt = db.prepare(
        'INSERT INTO collection_items (id, collection_id, query_id, sort_order) VALUES (?, ?, ?, ?)',
      );

      for (const item of items) {
        stmt.run(crypto.randomUUID(), collectionId, item.queryId, item.sortOrder);
      }
    });

    runTransaction();
  },
};
