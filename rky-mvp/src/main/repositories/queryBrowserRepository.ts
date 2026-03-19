import { getDb } from '#/infrastructure';
import type { IQuery, IQueryFolder } from '~/shared/types/db';

interface QueryFolderRow {
  id: string;
  connection_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface QueryRow {
  id: string;
  name: string;
  description: string;
  sql_content: string;
  tags: string;
  connection_id?: string;
  folder_id?: string | null;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

function toQueryFolder(row: QueryFolderRow): IQueryFolder {
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

function toQuery(row: QueryRow): IQuery {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sqlContent: row.sql_content,
    tags: JSON.parse(row.tags) as string[],
    connectionId: row.connection_id,
    folderId: row.folder_id ?? null,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const queryBrowserRepository = {
  listTree(connectionId: string): { folders: IQueryFolder[]; queries: IQuery[] } {
    const db = getDb();
    const folders = db
      .prepare('SELECT * FROM query_folders WHERE connection_id = ? ORDER BY sort_order ASC')
      .all(connectionId) as QueryFolderRow[];
    const queries = db
      .prepare('SELECT * FROM queries WHERE connection_id = ? ORDER BY sort_order ASC')
      .all(connectionId) as QueryRow[];

    return {
      folders: folders.map(toQueryFolder),
      queries: queries.map(toQuery),
    };
  },

  saveFolder(data: {
    id?: string;
    connectionId: string;
    parentId?: string | null;
    name: string;
    sortOrder: number;
  }): IQueryFolder {
    const db = getDb();

    if (data.id) {
      const sets: string[] = [];
      const values: unknown[] = [];

      sets.push('name = ?'); values.push(data.name);
      sets.push('sort_order = ?'); values.push(data.sortOrder);
      if (data.parentId !== undefined) { sets.push('parent_id = ?'); values.push(data.parentId); }
      sets.push(`updated_at = datetime('now')`);
      values.push(data.id);

      db.prepare(`UPDATE query_folders SET ${sets.join(', ')} WHERE id = ?`).run(...values);

      const row = db.prepare('SELECT * FROM query_folders WHERE id = ?').get(data.id) as QueryFolderRow;
      return toQueryFolder(row);
    }

    const id = crypto.randomUUID();
    db.prepare(
      'INSERT INTO query_folders (id, connection_id, parent_id, name, sort_order) VALUES (?, ?, ?, ?, ?)',
    ).run(id, data.connectionId, data.parentId ?? null, data.name, data.sortOrder);

    const row = db.prepare('SELECT * FROM query_folders WHERE id = ?').get(id) as QueryFolderRow;
    return toQueryFolder(row);
  },

  deleteFolder(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM query_folders WHERE id = ?').run(id);
  },

  saveQuery(data: {
    id?: string;
    connectionId: string;
    folderId?: string | null;
    name: string;
    description: string;
    sqlContent: string;
    sortOrder: number;
  }): IQuery {
    const db = getDb();

    if (data.id) {
      const sets: string[] = [];
      const values: unknown[] = [];

      if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
      if (data.description !== undefined) { sets.push('description = ?'); values.push(data.description); }
      if (data.sqlContent !== undefined) { sets.push('sql_content = ?'); values.push(data.sqlContent); }
      if (data.folderId !== undefined) { sets.push('folder_id = ?'); values.push(data.folderId); }
      if (data.sortOrder !== undefined) { sets.push('sort_order = ?'); values.push(data.sortOrder); }

      if (sets.length > 0) {
        sets.push(`updated_at = datetime('now')`);
        values.push(data.id);
        db.prepare(`UPDATE queries SET ${sets.join(', ')} WHERE id = ?`).run(...values);
      }

      const row = db.prepare('SELECT * FROM queries WHERE id = ?').get(data.id) as QueryRow;
      return toQuery(row);
    }

    const id = crypto.randomUUID();
    db.prepare(
      'INSERT INTO queries (id, connection_id, folder_id, name, description, sql_content, tags, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(id, data.connectionId, data.folderId ?? null, data.name, data.description, data.sqlContent, '[]', data.sortOrder);

    const row = db.prepare('SELECT * FROM queries WHERE id = ?').get(id) as QueryRow;
    return toQuery(row);
  },

  getQuery(id: string): IQuery | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM queries WHERE id = ?').get(id) as QueryRow | undefined;
    return row ? toQuery(row) : null;
  },

  deleteQuery(id: string): { success: boolean; referencedCollections?: { id: string; name: string }[] } {
    const db = getDb();
    const refs = db.prepare(
      'SELECT c.id, c.name FROM collections c JOIN collection_items ci ON ci.collection_id = c.id WHERE ci.query_id = ?',
    ).all(id) as { id: string; name: string }[];

    if (refs.length > 0) {
      return { success: false, referencedCollections: refs };
    }

    db.prepare('DELETE FROM queries WHERE id = ?').run(id);
    return { success: true };
  },

  bulkMove(items: { id: string; folderId?: string | null; sortOrder: number }[]): void {
    const db = getDb();
    const stmt = db.prepare('UPDATE queries SET folder_id = ?, sort_order = ?, updated_at = datetime(\'now\') WHERE id = ?');

    const runTransaction = db.transaction(() => {
      for (const item of items) {
        stmt.run(item.folderId ?? null, item.sortOrder, item.id);
      }
    });

    runTransaction();
  },
};
