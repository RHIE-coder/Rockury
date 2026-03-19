# Query Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Query Browser service to Live Console with SQL query management, collection execution, and unified history.

**Architecture:** Independent `query-browser` feature under `src/renderer/features/`, with backend services in `src/main/`. Reuses `DataGrid`/`DataFooter` from `data-browser` for result display. Transaction management via a new `transactionService` that holds DB connections open for DML confirm/rollback. IPC channels prefixed with `QB_` to avoid conflicts with existing `query-execution` feature.

**Tech Stack:** React, Zustand, TanStack Table, CodeMirror 6, @dnd-kit, better-sqlite3 (localDb), mysql2, pg

**Spec:** `docs/superpowers/specs/2026-03-19-query-browser-design.md`

---

## File Map

### Main Process (Backend)

| File | Action | Responsibility |
|------|--------|---------------|
| `src/shared/ipc/channels.ts` | Modify | Add `QB_*` channel constants |
| `src/shared/ipc/events.ts` | Modify | Add event type definitions for QB channels |
| `src/shared/types/db.ts` | Modify | Add query browser types (IQueryFolder, ICollection, etc.) |
| `src/main/infrastructure/database/localDb.schema.ts` | Modify | Add 4 new tables + indexes + ALTER migrations |
| `src/main/repositories/queryBrowserRepository.ts` | Create | Query/folder CRUD with tree operations |
| `src/main/repositories/collectionRepository.ts` | Create | Collection/folder/item CRUD with reference checks |
| `src/main/repositories/index.ts` | Modify | Export new repositories |
| `src/main/services/queryBrowserService.ts` | Create | Query/folder business logic |
| `src/main/services/collectionService.ts` | Create | Collection business logic + reference validation |
| `src/main/services/transactionService.ts` | Create | DB connection hold + BEGIN/COMMIT/ROLLBACK |
| `src/main/services/transactionService.test.ts` | Create | Unit tests for transaction lifecycle |
| `src/main/services/queryBrowserService.test.ts` | Create | Unit tests for query CRUD + reference check |
| `src/main/services/collectionService.test.ts` | Create | Unit tests for collection CRUD |
| `src/main/repositories/queryHistoryRepository.ts` | Modify | Extend with filter/pagination support for new fields |
| `src/main/services/index.ts` | Modify | Export new services |
| `src/main/ipc/handlers/queryBrowserHandlers.ts` | Create | IPC handler registration for all QB channels |
| `src/main/ipc/handlers/index.ts` | Modify | Register queryBrowserHandlers |
| `src/app/preload.ts` | Modify | Add QB channel mappings |
| `src/app/main.ts` | Modify | Add transactionService cleanup on before-quit |

### Renderer (Frontend)

| File | Action | Responsibility |
|------|--------|---------------|
| `src/renderer/shared/config/constants.ts` | Modify | Add QUERY route |
| `src/renderer/app/routes/index.tsx` | Modify | Add Query route |
| `src/renderer/app/layouts/LiveConsoleLayout.tsx` | Modify | Add Query tab |
| `src/renderer/features/query-browser/index.ts` | Create | Feature exports |
| `src/renderer/features/query-browser/api/queryBrowserApi.ts` | Create | IPC wrapper |
| `src/renderer/features/query-browser/model/queryBrowserStore.ts` | Create | Zustand store |
| `src/renderer/features/query-browser/model/useQueryTree.ts` | Create | Query folder/file CRUD hook |
| `src/renderer/features/query-browser/model/useCollectionTree.ts` | Create | Collection folder/file CRUD hook |
| `src/renderer/features/query-browser/model/useQueryExecution.ts` | Create | SQL execution + transaction hook |
| `src/renderer/features/query-browser/model/useCollectionRunner.ts` | Create | Collection sequential execution hook |
| `src/renderer/features/query-browser/model/useQueryHistory.ts` | Create | History query hook |
| `src/renderer/features/query-browser/lib/ddlDetection.ts` | Create | isDdl() utility |
| `src/renderer/features/query-browser/lib/ddlDetection.test.ts` | Create | DDL detection tests |
| `src/renderer/features/query-browser/model/useCollectionRunner.test.ts` | Create | Collection runner unit tests (90%+ coverage) |
| `src/renderer/features/query-browser/model/queryBrowserStore.test.ts` | Create | Store unit tests (75% coverage) |
| `src/renderer/features/query-browser/ui/FileTreePanel.tsx` | Create | Folder/file tree with dnd-kit |
| `src/renderer/features/query-browser/ui/SqlEditorPanel.tsx` | Create | CodeMirror SQL editor + resize |
| `src/renderer/features/query-browser/ui/DmlResultPanel.tsx` | Create | DML result + Confirm/Rollback |
| `src/renderer/features/query-browser/ui/QueryTab.tsx` | Create | Query tab orchestrator |
| `src/renderer/features/query-browser/ui/CollectionQueryList.tsx` | Create | Collection query list with accordion |
| `src/renderer/features/query-browser/ui/CollectionResultModal.tsx` | Create | SELECT result modal |
| `src/renderer/features/query-browser/ui/CollectionTab.tsx` | Create | Collection tab orchestrator |
| `src/renderer/features/query-browser/ui/HistoryTable.tsx` | Create | History table with filters |
| `src/renderer/features/query-browser/ui/HistoryTab.tsx` | Create | History tab orchestrator |
| `src/renderer/features/query-browser/ui/HistoryDrawer.tsx` | Create | Side drawer for recent history |
| `src/renderer/pages/db-query/ui/QueryBrowserPage.tsx` | Create | Page with tab switching + drawer |

---

## Task 1: Database Schema & Migrations

**Files:**
- Modify: `src/main/infrastructure/database/localDb.schema.ts`
- Modify: `src/shared/types/db.ts`

- [ ] **Step 1: Add type definitions**

Add to `src/shared/types/db.ts`:

```typescript
// Query Browser types
export interface IQueryFolder {
  id: string;
  connectionId: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ICollectionFolder {
  id: string;
  connectionId: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ICollection {
  id: string;
  connectionId: string;
  folderId: string | null;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ICollectionItem {
  id: string;
  collectionId: string;
  queryId: string;
  sortOrder: number;
  // Joined fields (optional, populated by getCollection)
  queryName?: string;
  sqlContent?: string;
}

export type THistorySource = 'query' | 'data' | 'collection';
export type TDmlType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'DDL';
```

Also extend the existing `IQuery` interface:

```typescript
// Add optional fields to existing IQuery
export interface IQuery {
  // ... existing fields
  connectionId?: string;
  folderId?: string | null;
  sortOrder?: number;
}
```

And extend `IQueryHistory`:

```typescript
export interface IQueryHistory {
  // ... existing fields
  connectionId?: string;
  source?: THistorySource;
  affectedTables?: string[];
  affectedRows?: number;
  dmlType?: TDmlType;
}
```

- [ ] **Step 2: Add CREATE TABLE statements to localDb.schema.ts**

Add after existing SQL constants:

```typescript
export const SQL_CREATE_QUERY_FOLDERS = `
CREATE TABLE IF NOT EXISTS query_folders (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  parent_id TEXT,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES query_folders(id) ON DELETE CASCADE
);
`;

export const SQL_CREATE_QUERY_FOLDERS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_query_folders_connection ON query_folders(connection_id);
CREATE INDEX IF NOT EXISTS idx_query_folders_parent ON query_folders(parent_id);
`;

export const SQL_CREATE_COLLECTION_FOLDERS = `
CREATE TABLE IF NOT EXISTS collection_folders (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  parent_id TEXT,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES collection_folders(id) ON DELETE CASCADE
);
`;

export const SQL_CREATE_COLLECTION_FOLDERS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_collection_folders_connection ON collection_folders(connection_id);
`;

export const SQL_CREATE_COLLECTIONS = `
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  folder_id TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
  FOREIGN KEY (folder_id) REFERENCES collection_folders(id) ON DELETE SET NULL
);
`;

export const SQL_CREATE_COLLECTIONS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_collections_connection ON collections(connection_id);
`;

export const SQL_CREATE_COLLECTION_ITEMS = `
CREATE TABLE IF NOT EXISTS collection_items (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  query_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE RESTRICT
);
`;

export const SQL_CREATE_COLLECTION_ITEMS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_query ON collection_items(query_id);
`;
```

- [ ] **Step 3: Register in ALL_MIGRATIONS and alterMigrations**

Add to `ALL_MIGRATIONS` array:

```typescript
SQL_CREATE_QUERY_FOLDERS,
SQL_CREATE_QUERY_FOLDERS_INDEXES,
SQL_CREATE_COLLECTION_FOLDERS,
SQL_CREATE_COLLECTION_FOLDERS_INDEXES,
SQL_CREATE_COLLECTIONS,
SQL_CREATE_COLLECTIONS_INDEXES,
SQL_CREATE_COLLECTION_ITEMS,
SQL_CREATE_COLLECTION_ITEMS_INDEXES,
```

Add to `alterMigrations` array inside `runMigrations()`:

```typescript
`ALTER TABLE queries ADD COLUMN connection_id TEXT;`,
`ALTER TABLE queries ADD COLUMN folder_id TEXT;`,
`ALTER TABLE queries ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;`,
`ALTER TABLE query_history ADD COLUMN connection_id TEXT;`,
`ALTER TABLE query_history ADD COLUMN source TEXT NOT NULL DEFAULT 'query';`,
`ALTER TABLE query_history ADD COLUMN affected_tables TEXT NOT NULL DEFAULT '[]';`,
`ALTER TABLE query_history ADD COLUMN affected_rows INTEGER NOT NULL DEFAULT 0;`,
`ALTER TABLE query_history ADD COLUMN dml_type TEXT;`,
```

Also add index migrations (safe with IF NOT EXISTS):

```typescript
// Add after alterMigrations loop
db.exec('CREATE INDEX IF NOT EXISTS idx_queries_connection ON queries(connection_id);');
db.exec('CREATE INDEX IF NOT EXISTS idx_queries_folder ON queries(folder_id);');
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```
feat(query-browser): add database schema and type definitions
```

---

## Task 2: IPC Channel Definitions

**Files:**
- Modify: `src/shared/ipc/channels.ts`
- Modify: `src/shared/ipc/events.ts`

- [ ] **Step 1: Add QB channel constants to channels.ts**

```typescript
// Query Browser
QB_QUERY_TREE_LIST: 'QB_QUERY_TREE_LIST',
QB_QUERY_FOLDER_SAVE: 'QB_QUERY_FOLDER_SAVE',
QB_QUERY_FOLDER_DELETE: 'QB_QUERY_FOLDER_DELETE',
QB_QUERY_SAVE: 'QB_QUERY_SAVE',
QB_QUERY_GET: 'QB_QUERY_GET',
QB_QUERY_DELETE: 'QB_QUERY_DELETE',
QB_QUERY_BULK_MOVE: 'QB_QUERY_BULK_MOVE',
QB_COLLECTION_TREE_LIST: 'QB_COLLECTION_TREE_LIST',
QB_COLLECTION_FOLDER_SAVE: 'QB_COLLECTION_FOLDER_SAVE',
QB_COLLECTION_FOLDER_DELETE: 'QB_COLLECTION_FOLDER_DELETE',
QB_COLLECTION_SAVE: 'QB_COLLECTION_SAVE',
QB_COLLECTION_GET: 'QB_COLLECTION_GET',
QB_COLLECTION_DELETE: 'QB_COLLECTION_DELETE',
QB_COLLECTION_ITEM_SAVE: 'QB_COLLECTION_ITEM_SAVE',
QB_TX_BEGIN: 'QB_TX_BEGIN',
QB_TX_EXECUTE: 'QB_TX_EXECUTE',
QB_TX_COMMIT: 'QB_TX_COMMIT',
QB_TX_ROLLBACK: 'QB_TX_ROLLBACK',
QB_HISTORY_LIST: 'QB_HISTORY_LIST',
QB_HISTORY_DELETE: 'QB_HISTORY_DELETE',
```

- [ ] **Step 2: Add event type definitions to events.ts**

Add all QB event types to `IEvents` interface. Each follows the pattern:

```typescript
[CHANNELS.QB_QUERY_TREE_LIST]: {
  args: { connectionId: string };
  response: { success: boolean; data?: { folders: IQueryFolder[]; queries: IQuery[] }; error?: string };
};
[CHANNELS.QB_QUERY_FOLDER_SAVE]: {
  args: { id?: string; connectionId: string; parentId?: string | null; name: string; sortOrder: number };
  response: { success: boolean; data?: IQueryFolder; error?: string };
};
[CHANNELS.QB_QUERY_FOLDER_DELETE]: {
  args: { id: string };
  response: { success: boolean; error?: string };
};
[CHANNELS.QB_QUERY_SAVE]: {
  args: { id?: string; connectionId: string; folderId?: string | null; name: string; description: string; sqlContent: string; sortOrder: number };
  response: { success: boolean; data?: IQuery; error?: string };
};
[CHANNELS.QB_QUERY_GET]: {
  args: { id: string };
  response: { success: boolean; data?: IQuery; error?: string };
};
[CHANNELS.QB_QUERY_DELETE]: {
  args: { id: string };
  response: { success: boolean; error?: string; referencedCollections?: { id: string; name: string }[] };
};
[CHANNELS.QB_QUERY_BULK_MOVE]: {
  args: { items: { id: string; folderId?: string | null; sortOrder: number }[] };
  response: { success: boolean; error?: string };
};
[CHANNELS.QB_COLLECTION_TREE_LIST]: {
  args: { connectionId: string };
  response: { success: boolean; data?: { folders: ICollectionFolder[]; collections: ICollection[] }; error?: string };
};
[CHANNELS.QB_COLLECTION_FOLDER_SAVE]: {
  args: { id?: string; connectionId: string; parentId?: string | null; name: string; sortOrder: number };
  response: { success: boolean; data?: ICollectionFolder; error?: string };
};
[CHANNELS.QB_COLLECTION_FOLDER_DELETE]: {
  args: { id: string };
  response: { success: boolean; error?: string };
};
[CHANNELS.QB_COLLECTION_SAVE]: {
  args: { id?: string; connectionId: string; folderId?: string | null; name: string; description: string; sortOrder: number };
  response: { success: boolean; data?: ICollection; error?: string };
};
[CHANNELS.QB_COLLECTION_GET]: {
  args: { id: string };
  response: { success: boolean; data?: { collection: ICollection; items: ICollectionItem[] }; error?: string };
};
[CHANNELS.QB_COLLECTION_DELETE]: {
  args: { id: string };
  response: { success: boolean; error?: string };
};
[CHANNELS.QB_COLLECTION_ITEM_SAVE]: {
  args: { collectionId: string; items: { queryId: string; sortOrder: number }[] };
  response: { success: boolean; error?: string };
};
[CHANNELS.QB_TX_BEGIN]: {
  args: { connectionId: string };
  response: { success: boolean; data?: { txId: string }; error?: string };
};
[CHANNELS.QB_TX_EXECUTE]: {
  args: { txId: string; sql: string };
  response: { success: boolean; data?: IQueryResult; error?: string };
};
[CHANNELS.QB_TX_COMMIT]: {
  args: { txId: string };
  response: { success: boolean; error?: string };
};
[CHANNELS.QB_TX_ROLLBACK]: {
  args: { txId: string };
  response: { success: boolean; error?: string };
};
[CHANNELS.QB_HISTORY_LIST]: {
  args: { connectionId?: string; source?: THistorySource; search?: string; page: number; pageSize: number };
  response: { success: boolean; data?: { items: IQueryHistory[]; total: number }; error?: string };
};
[CHANNELS.QB_HISTORY_DELETE]: {
  args: { id: string };
  response: { success: boolean; error?: string };
};
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```
feat(query-browser): add IPC channel and event type definitions
```

---

## Task 3: Repositories

**Files:**
- Create: `src/main/repositories/queryBrowserRepository.ts`
- Create: `src/main/repositories/collectionRepository.ts`
- Modify: `src/main/repositories/index.ts`

- [ ] **Step 1: Create queryBrowserRepository.ts**

Implements: `listTree`, `saveFolder`, `deleteFolder`, `saveQuery`, `getQuery`, `deleteQuery`, `bulkMove`, `getReferencingCollections`.

Pattern follows existing `queryRepository.ts`:
- Use `getDb()` from `#/infrastructure`
- Prepared statements with `?` placeholders
- Mapper functions for snake_case → camelCase
- `crypto.randomUUID()` for new IDs

Key method — `deleteQuery` with reference check:
```typescript
deleteQuery(id: string): { success: boolean; referencedCollections?: { id: string; name: string }[] } {
  const db = getDb();
  const refs = db.prepare(`
    SELECT c.id, c.name FROM collections c
    JOIN collection_items ci ON ci.collection_id = c.id
    WHERE ci.query_id = ?
  `).all(id) as { id: string; name: string }[];

  if (refs.length > 0) {
    return { success: false, referencedCollections: refs };
  }

  db.prepare('DELETE FROM queries WHERE id = ?').run(id);
  return { success: true };
}
```

- [ ] **Step 2: Create collectionRepository.ts**

Implements: `listTree`, `saveFolder`, `deleteFolder`, `saveCollection`, `getCollection` (with items JOIN), `deleteCollection`, `saveItems`.

Key method — `getCollection` with items:
```typescript
getCollection(id: string): { collection: ICollection; items: ICollectionItem[] } | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
  if (!row) return null;

  const items = db.prepare(`
    SELECT ci.*, q.name as query_name, q.sql_content
    FROM collection_items ci
    JOIN queries q ON q.id = ci.query_id
    WHERE ci.collection_id = ?
    ORDER BY ci.sort_order ASC
  `).all(id);

  return { collection: toCollection(row), items: items.map(toCollectionItem) };
}
```

Key method — `saveItems` (bulk replace):
```typescript
saveItems(collectionId: string, items: { queryId: string; sortOrder: number }[]): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM collection_items WHERE collection_id = ?').run(collectionId);
    const insert = db.prepare(
      'INSERT INTO collection_items (id, collection_id, query_id, sort_order) VALUES (?, ?, ?, ?)'
    );
    for (const item of items) {
      insert.run(crypto.randomUUID(), collectionId, item.queryId, item.sortOrder);
    }
  });
  tx();
}
```

- [ ] **Step 3: Export from repositories/index.ts**

```typescript
export { queryBrowserRepository } from './queryBrowserRepository';
export { collectionRepository } from './collectionRepository';
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```
feat(query-browser): add query browser and collection repositories
```

---

## Task 4: Services + Tests

**Files:**
- Create: `src/main/services/queryBrowserService.ts`
- Create: `src/main/services/queryBrowserService.test.ts`
- Create: `src/main/services/collectionService.ts`
- Create: `src/main/services/collectionService.test.ts`
- Create: `src/main/services/transactionService.ts`
- Create: `src/main/services/transactionService.test.ts`
- Modify: `src/main/services/index.ts`

- [ ] **Step 1: Write transactionService tests**

Test cases:
- `begin()` creates a transaction and returns txId
- `executeInTx()` executes SQL within the transaction
- `commit()` commits and closes connection
- `rollback()` rolls back and closes connection
- `commit/rollback` with invalid txId throws error
- `cleanup()` auto-rollbacks transactions older than 5 minutes
- `cleanupAll()` rollbacks all active transactions

- [ ] **Step 2: Implement transactionService.ts**

```typescript
import { connectionService } from './connectionService';
import { createMysqlConnection, closeMysqlConnection, createPgConnection, closePgConnection } from '#/infrastructure';

interface ActiveTransaction {
  connection: any;
  dbType: 'mysql' | 'mariadb' | 'postgresql';
  connectionId: string;
  createdAt: number;
}

const activeTxMap = new Map<string, ActiveTransaction>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export const transactionService = {
  async begin(connectionId: string): Promise<string> { /* ... */ },
  async executeInTx(txId: string, sql: string): Promise<IQueryResult> { /* ... */ },
  async commit(txId: string): Promise<void> { /* ... */ },
  async rollback(txId: string): Promise<void> { /* ... */ },
  startCleanup(): void { /* setInterval every 60s, rollback if > 5min */ },
  async cleanupAll(): Promise<void> { /* rollback all, called on app quit */ },
};
```

- [ ] **Step 3: Run transactionService tests**

Run: `npx vitest run src/main/services/transactionService.test.ts`
Expected: PASS

- [ ] **Step 4: Write queryBrowserService tests**

Test cases:
- `listTree()` returns folders and queries for connectionId
- `saveFolder()` creates/updates folder
- `deleteFolder()` removes folder and children
- `saveQuery()` creates/updates query
- `getQuery()` returns query with sql_content
- `deleteQuery()` fails when referenced by collection

- [ ] **Step 5: Implement queryBrowserService.ts**

Delegates to `queryBrowserRepository`. Thin service layer.

- [ ] **Step 6: Run queryBrowserService tests**

Run: `npx vitest run src/main/services/queryBrowserService.test.ts`
Expected: PASS

- [ ] **Step 7: Write collectionService tests**

Test cases:
- `listTree()` returns folders and collections
- `saveCollection()` creates/updates
- `getCollection()` returns collection with items and query details
- `deleteCollection()` cascades items
- `saveItems()` replaces item list atomically

- [ ] **Step 8: Implement collectionService.ts**

- [ ] **Step 9: Run collectionService tests**

Run: `npx vitest run src/main/services/collectionService.test.ts`
Expected: PASS

- [ ] **Step 10: Extend queryHistoryRepository.ts**

Modify `src/main/repositories/queryHistoryRepository.ts` to support:
- `listFiltered(filter)` — accepts `connectionId`, `source`, `search` (SQL LIKE), `page`, `pageSize`; returns `{ items, total }`
- `createExtended(data)` — accepts `connectionId`, `source`, `dmlType`, `affectedTables`, `affectedRows` in addition to existing fields
- `deleteById(id)` — already exists or add if missing

The `QB_HISTORY_LIST` and `QB_HISTORY_DELETE` IPC handlers will delegate to this repository.

- [ ] **Step 11: Export services**

Add to `src/main/services/index.ts`:
```typescript
export { queryBrowserService } from './queryBrowserService';
export { collectionService } from './collectionService';
export { transactionService } from './transactionService';
```

- [ ] **Step 12: Commit**

```
feat(query-browser): add services with transaction management
```

---

## Task 5: IPC Handlers + Preload

**Files:**
- Create: `src/main/ipc/handlers/queryBrowserHandlers.ts`
- Modify: `src/main/ipc/handlers/index.ts`
- Modify: `src/app/preload.ts`
- Modify: `src/app/main.ts`

- [ ] **Step 1: Create queryBrowserHandlers.ts**

Register all `QB_*` channels. Pattern from existing `queryHandlers.ts`:

```typescript
import { ipcMain } from 'electron';
import { CHANNELS } from '~/shared/ipc/channels';
import { queryBrowserService, collectionService, transactionService } from '#/services';

export function registerQueryBrowserHandlers() {
  // Query tree
  ipcMain.handle(CHANNELS.QB_QUERY_TREE_LIST, async (_e, args) => {
    try {
      const data = queryBrowserService.listTree(args.connectionId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // ... all other QB_* handlers following same pattern

  // Transaction handlers
  ipcMain.handle(CHANNELS.QB_TX_BEGIN, async (_e, args) => {
    try {
      const txId = await transactionService.begin(args.connectionId);
      return { success: true, data: { txId } };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // ... QB_TX_EXECUTE, QB_TX_COMMIT, QB_TX_ROLLBACK
}
```

- [ ] **Step 2: Register in handlers/index.ts**

```typescript
import { registerQueryBrowserHandlers } from './queryBrowserHandlers';

export function registerAllHandlers() {
  // ... existing
  registerQueryBrowserHandlers();
}
```

- [ ] **Step 3: Add preload mappings**

Add all QB channels to `src/app/preload.ts`:

```typescript
[CHANNELS.QB_QUERY_TREE_LIST]: (args) => ipcRenderer.invoke(CHANNELS.QB_QUERY_TREE_LIST, args),
[CHANNELS.QB_QUERY_FOLDER_SAVE]: (args) => ipcRenderer.invoke(CHANNELS.QB_QUERY_FOLDER_SAVE, args),
// ... all QB_* channels
```

- [ ] **Step 4: Add cleanup on app quit**

In `src/app/main.ts`, before `app.whenReady()`:

```typescript
app.on('before-quit', async () => {
  await transactionService.cleanupAll();
});
```

And after `registerAllHandlers()`:

```typescript
transactionService.startCleanup();
```

- [ ] **Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```
feat(query-browser): add IPC handlers and preload mappings
```

---

## Task 6: Navigation Integration + Renderer API

**Files:**
- Modify: `src/renderer/shared/config/constants.ts`
- Modify: `src/renderer/app/layouts/LiveConsoleLayout.tsx`
- Modify: `src/renderer/app/routes/index.tsx`
- Create: `src/renderer/features/query-browser/api/queryBrowserApi.ts`
- Create: `src/renderer/features/query-browser/index.ts`
- Create: `src/renderer/pages/db-query/ui/QueryBrowserPage.tsx` (placeholder)

- [ ] **Step 1: Add route constant**

In `constants.ts`, add to `LIVE_CONSOLE`:

```typescript
QUERY: '/db/console/query',
```

- [ ] **Step 2: Add tab to LiveConsoleLayout.tsx**

Import `Terminal` icon and add tab:

```typescript
{ id: 'query', label: 'Query', icon: Terminal, path: ROUTES.DB.LIVE_CONSOLE.QUERY, disabled: !hasConnection },
```

- [ ] **Step 3: Add route**

In `routes/index.tsx`, import and add:

```typescript
import { QueryBrowserPage } from '@/pages/db-query';
// ...
<Route path="query" element={<QueryBrowserPage />} />
```

- [ ] **Step 4: Create queryBrowserApi.ts**

```typescript
import { getElectronApi } from '@/shared/api/electronApi';

const api = getElectronApi();

export const queryBrowserApi = {
  // Query tree
  queryTreeList: (connectionId: string) => api.QB_QUERY_TREE_LIST({ connectionId }),
  queryFolderSave: (args: { id?: string; connectionId: string; parentId?: string | null; name: string; sortOrder: number }) =>
    api.QB_QUERY_FOLDER_SAVE(args),
  queryFolderDelete: (id: string) => api.QB_QUERY_FOLDER_DELETE({ id }),
  querySave: (args: { id?: string; connectionId: string; folderId?: string | null; name: string; description: string; sqlContent: string; sortOrder: number }) =>
    api.QB_QUERY_SAVE(args),
  queryGet: (id: string) => api.QB_QUERY_GET({ id }),
  queryDelete: (id: string) => api.QB_QUERY_DELETE({ id }),
  queryBulkMove: (items: { id: string; folderId?: string | null; sortOrder: number }[]) =>
    api.QB_QUERY_BULK_MOVE({ items }),

  // Collection tree
  collectionTreeList: (connectionId: string) => api.QB_COLLECTION_TREE_LIST({ connectionId }),
  collectionFolderSave: (args: { id?: string; connectionId: string; parentId?: string | null; name: string; sortOrder: number }) =>
    api.QB_COLLECTION_FOLDER_SAVE(args),
  collectionFolderDelete: (id: string) => api.QB_COLLECTION_FOLDER_DELETE({ id }),
  collectionSave: (args: { id?: string; connectionId: string; folderId?: string | null; name: string; description: string; sortOrder: number }) =>
    api.QB_COLLECTION_SAVE(args),
  collectionGet: (id: string) => api.QB_COLLECTION_GET({ id }),
  collectionDelete: (id: string) => api.QB_COLLECTION_DELETE({ id }),
  collectionItemSave: (collectionId: string, items: { queryId: string; sortOrder: number }[]) =>
    api.QB_COLLECTION_ITEM_SAVE({ collectionId, items }),

  // Transaction
  txBegin: (connectionId: string) => api.QB_TX_BEGIN({ connectionId }),
  txExecute: (txId: string, sql: string) => api.QB_TX_EXECUTE({ txId, sql }),
  txCommit: (txId: string) => api.QB_TX_COMMIT({ txId }),
  txRollback: (txId: string) => api.QB_TX_ROLLBACK({ txId }),

  // History
  historyList: (args: { connectionId?: string; source?: string; search?: string; page: number; pageSize: number }) =>
    api.QB_HISTORY_LIST(args),
  historyDelete: (id: string) => api.QB_HISTORY_DELETE({ id }),
};
```

- [ ] **Step 5: Create placeholder page**

```typescript
// src/renderer/pages/db-query/ui/QueryBrowserPage.tsx
export function QueryBrowserPage() {
  return <div className="flex h-full items-center justify-center text-muted-foreground">
    <p className="text-sm">Query Browser — coming soon</p>
  </div>;
}
```

- [ ] **Step 6: Create feature index.ts**

```typescript
// src/renderer/features/query-browser/index.ts
export { queryBrowserApi } from './api/queryBrowserApi';
```

- [ ] **Step 7: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 8: Commit**

```
feat(query-browser): add navigation, routing, and API wrapper
```

---

## Task 7: Zustand Store + DDL Detection

**Files:**
- Create: `src/renderer/features/query-browser/model/queryBrowserStore.ts`
- Create: `src/renderer/features/query-browser/lib/ddlDetection.ts`
- Create: `src/renderer/features/query-browser/lib/ddlDetection.test.ts`

- [ ] **Step 1: Write DDL detection tests**

```typescript
import { isDdl } from './ddlDetection';

describe('isDdl', () => {
  it('detects CREATE TABLE', () => expect(isDdl('CREATE TABLE users (...)')).toBe(true));
  it('detects ALTER TABLE', () => expect(isDdl('ALTER TABLE users ADD COLUMN ...')).toBe(true));
  it('detects DROP TABLE', () => expect(isDdl('DROP TABLE users')).toBe(true));
  it('detects TRUNCATE', () => expect(isDdl('TRUNCATE TABLE users')).toBe(true));
  it('detects GRANT', () => expect(isDdl('GRANT SELECT ON users TO role')).toBe(true));
  it('detects COMMENT ON', () => expect(isDdl('COMMENT ON TABLE users IS ...')).toBe(true));
  it('ignores leading -- comments', () => expect(isDdl('-- note\nDROP TABLE users')).toBe(true));
  it('ignores leading /* */ comments', () => expect(isDdl('/* note */\nDROP TABLE users')).toBe(true));
  it('returns false for SELECT', () => expect(isDdl('SELECT * FROM users')).toBe(false));
  it('returns false for INSERT', () => expect(isDdl('INSERT INTO users VALUES ...')).toBe(false));
  it('returns false for UPDATE', () => expect(isDdl('UPDATE users SET ...')).toBe(false));
  it('returns false for DELETE', () => expect(isDdl('DELETE FROM users')).toBe(false));
});
```

- [ ] **Step 2: Implement ddlDetection.ts**

```typescript
export function isDdl(sql: string): boolean {
  const stripped = sql.replace(/^\s*(--[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/g, '').trim();
  const normalized = stripped.toUpperCase();
  return /^(CREATE|ALTER|DROP|TRUNCATE|RENAME|GRANT|REVOKE|COMMENT\s+ON)\s/.test(normalized);
}
```

- [ ] **Step 3: Run DDL tests**

Run: `npx vitest run src/renderer/features/query-browser/lib/ddlDetection.test.ts`
Expected: PASS

- [ ] **Step 4: Create queryBrowserStore.ts**

```typescript
import { create } from 'zustand';

type TQueryBrowserTab = 'query' | 'collection' | 'history';

interface QueryBrowserState {
  activeTab: TQueryBrowserTab;
  selectedQueryId: string | null;
  selectedCollectionId: string | null;
  historyDrawerOpen: boolean;

  setActiveTab: (tab: TQueryBrowserTab) => void;
  setSelectedQueryId: (id: string | null) => void;
  setSelectedCollectionId: (id: string | null) => void;
  setHistoryDrawerOpen: (open: boolean) => void;
}

export const useQueryBrowserStore = create<QueryBrowserState>((set) => ({
  activeTab: 'query',
  selectedQueryId: null,
  selectedCollectionId: null,
  historyDrawerOpen: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedQueryId: (id) => set({ selectedQueryId: id }),
  setSelectedCollectionId: (id) => set({ selectedCollectionId: id }),
  setHistoryDrawerOpen: (open) => set({ historyDrawerOpen: open }),
}));
```

- [ ] **Step 5: Write queryBrowserStore tests**

Create `src/renderer/features/query-browser/model/queryBrowserStore.test.ts`:

```typescript
import { useQueryBrowserStore } from './queryBrowserStore';

describe('queryBrowserStore', () => {
  beforeEach(() => useQueryBrowserStore.setState({
    activeTab: 'query', selectedQueryId: null, selectedCollectionId: null, historyDrawerOpen: false,
  }));

  it('sets active tab', () => {
    useQueryBrowserStore.getState().setActiveTab('collection');
    expect(useQueryBrowserStore.getState().activeTab).toBe('collection');
  });
  it('sets selected query id', () => {
    useQueryBrowserStore.getState().setSelectedQueryId('q1');
    expect(useQueryBrowserStore.getState().selectedQueryId).toBe('q1');
  });
  it('toggles history drawer', () => {
    useQueryBrowserStore.getState().setHistoryDrawerOpen(true);
    expect(useQueryBrowserStore.getState().historyDrawerOpen).toBe(true);
  });
});
```

- [ ] **Step 6: Run store tests**

Run: `npx vitest run src/renderer/features/query-browser/model/queryBrowserStore.test.ts`
Expected: PASS

- [ ] **Step 7: Export from index.ts**

Update `src/renderer/features/query-browser/index.ts`:

```typescript
export { queryBrowserApi } from './api/queryBrowserApi';
export { useQueryBrowserStore } from './model/queryBrowserStore';
export { isDdl } from './lib/ddlDetection';
```

- [ ] **Step 8: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 9: Commit**

```
feat(query-browser): add Zustand store and DDL detection utility
```

---

## Task 8: Query Tree Hook + FileTreePanel

**Files:**
- Create: `src/renderer/features/query-browser/model/useQueryTree.ts`
- Create: `src/renderer/features/query-browser/ui/FileTreePanel.tsx`

- [ ] **Step 1: Implement useQueryTree.ts**

React Query hooks for query folder/file CRUD:

```typescript
const queryTreeKeys = {
  all: (connId: string) => ['queryTree', connId] as const,
};

export function useQueryTree(connectionId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryTreeKeys.all(connectionId),
    queryFn: async () => {
      const res = await queryBrowserApi.queryTreeList(connectionId);
      if (!res.success) throw new Error(res.error);
      return res.data!;
    },
    enabled: !!connectionId,
  });

  const saveFolderMutation = useMutation({ /* ... invalidate tree */ });
  const deleteFolderMutation = useMutation({ /* ... */ });
  const saveQueryMutation = useMutation({ /* ... */ });
  const deleteQueryMutation = useMutation({ /* ... returns referencedCollections on failure */ });
  const bulkMoveMutation = useMutation({ /* ... for DnD reorder */ });

  return {
    folders: data?.folders ?? [],
    queries: data?.queries ?? [],
    isLoading,
    saveFolder: saveFolderMutation.mutateAsync,
    deleteFolder: deleteFolderMutation.mutateAsync,
    saveQuery: saveQueryMutation.mutateAsync,
    deleteQuery: deleteQueryMutation.mutateAsync,
    bulkMove: bulkMoveMutation.mutateAsync,
  };
}
```

- [ ] **Step 2: Implement FileTreePanel.tsx**

Reusable tree component for both Query and Collection tabs:

```typescript
interface FileTreePanelProps {
  folders: IQueryFolder[] | ICollectionFolder[];
  items: { id: string; name: string; folderId: string | null; sortOrder: number }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateFolder: (parentId: string | null) => void;
  onCreateItem: (folderId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onRenameItem: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onDeleteItem: (id: string) => Promise<{ success: boolean; referencedCollections?: { id: string; name: string }[] }>;
  onMove: (items: { id: string; folderId?: string | null; sortOrder: number }[]) => void;
  searchPlaceholder?: string;
  createItemLabel?: string;
  itemIcon?: 'query' | 'collection';
}
```

Features:
- Search filter
- @dnd-kit `DndContext` + `SortableContext` for drag & drop
- Nested folder rendering with indentation
- Right-click context menu (rename, delete)
- Delete with collection reference error dialog
- New folder / new item buttons

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```
feat(query-browser): add file tree panel with drag and drop
```

---

## Task 9: SQL Editor + DML Result Panel

**Files:**
- Create: `src/renderer/features/query-browser/ui/SqlEditorPanel.tsx`
- Create: `src/renderer/features/query-browser/model/useQueryExecution.ts`
- Create: `src/renderer/features/query-browser/ui/DmlResultPanel.tsx`

- [ ] **Step 1: Implement useQueryExecution.ts**

Hook managing SQL execution with transaction support:

```typescript
export function useQueryExecution(connectionId: string) {
  const [result, setResult] = useState<IQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [txState, setTxState] = useState<{ txId: string; dmlType: string; affectedRows: number } | null>(null);

  const execute = useCallback(async (sql: string) => {
    // Note: imports queryApi.execute() from '@/features/query-execution' for SELECT/DDL
    if (isDdl(sql)) {
      // Execute directly without transaction
      const res = await queryApi.execute({ connectionId, sql });
      // Set result with DDL warning
      // Record history: source='query', dmlType='DDL'
      return;
    }

    // Check if DML (non-SELECT)
    const isDml = /^\s*(INSERT|UPDATE|DELETE)\s/i.test(sql);

    if (isDml) {
      // BEGIN transaction, execute, show confirm/rollback
      const beginRes = await queryBrowserApi.txBegin(connectionId);
      const txId = beginRes.data!.txId;
      const execRes = await queryBrowserApi.txExecute(txId, sql);
      setTxState({ txId, dmlType: /* parsed */, affectedRows: execRes.data!.affectedRows ?? 0 });
      // History recorded on confirm/rollback (not here)
    } else {
      // SELECT: execute directly
      const res = await queryApi.execute({ connectionId, sql });
      setResult(res.data!);
      // Record history: source='query', dmlType='SELECT'
    }
  }, [connectionId]);

  // Note: History recording happens via the existing queryService.executeQuery()
  // which already writes to query_history. For DML with transactions, history is
  // recorded after confirm/rollback in the commit/rollback callbacks above.

  const confirm = useCallback(async () => {
    if (!txState) return;
    await queryBrowserApi.txCommit(txState.txId);
    setTxState(null);
  }, [txState]);

  const rollback = useCallback(async () => {
    if (!txState) return;
    await queryBrowserApi.txRollback(txState.txId);
    setTxState(null);
  }, [txState]);

  return { result, error, isLoading, txState, execute, confirm, rollback };
}
```

- [ ] **Step 2: Implement SqlEditorPanel.tsx**

CodeMirror 6 editor with SQL highlighting and resizable split:

```typescript
interface SqlEditorPanelProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  isLoading?: boolean;
}
```

Features:
- CodeMirror with `@codemirror/lang-sql`
- Cmd+Enter to run
- Drag handle for vertical resize between editor and result
- Min height constraints

Note: Check if CodeMirror is already installed. If not, add `@codemirror/lang-sql` and `codemirror` deps.
Reference: existing `JsonEditorModal.tsx` already uses CodeMirror in this project.

- [ ] **Step 3: Implement DmlResultPanel.tsx**

```typescript
interface DmlResultPanelProps {
  dmlType: string;
  affectedRows: number;
  onConfirm: () => void;
  onRollback: () => void;
  isProcessing?: boolean;
}
```

Shows: DML type, affected rows, transaction status, Confirm/Rollback buttons.
DDL warning variant: "This statement was executed immediately (not in transaction)".

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```
feat(query-browser): add SQL editor panel and DML result panel
```

---

## Task 10: Query Tab

**Files:**
- Create: `src/renderer/features/query-browser/ui/QueryTab.tsx`

- [ ] **Step 1: Implement QueryTab.tsx**

Orchestrates: FileTreePanel + SqlEditorPanel + DataGrid/DmlResultPanel + DataFooter.

```typescript
interface QueryTabProps {
  connectionId: string;
  dbType: TDbType;
}
```

State management:
- Selected query (from store)
- SQL content (local state, synced to server on blur/save)
- Execution result (from useQueryExecution)
- Edit mode for description (inline)
- Collection badges (fetch from collection items referencing this query)

Layout: flex row — left panel (FileTreePanel, 220px) + right area (toolbar + editor + result).

Reuses from data-browser:
- `DataGrid` for SELECT results (read-only, no edit mode)
- `DataFooter` for pagination
- `ColumnVisibility` for column toggling
- `ExportMenu` for result export

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```
feat(query-browser): add Query tab with editor and result display
```

---

## Task 11: Collection Tab

**Files:**
- Create: `src/renderer/features/query-browser/model/useCollectionTree.ts`
- Create: `src/renderer/features/query-browser/model/useCollectionRunner.ts`
- Create: `src/renderer/features/query-browser/ui/CollectionQueryList.tsx`
- Create: `src/renderer/features/query-browser/ui/CollectionResultModal.tsx`
- Create: `src/renderer/features/query-browser/ui/CollectionTab.tsx`

- [ ] **Step 1: Implement useCollectionTree.ts**

Same pattern as useQueryTree but for collections. Uses `queryBrowserApi.collectionTreeList`, etc.

- [ ] **Step 2: Implement useCollectionRunner.ts**

Hook for sequential collection execution:

```typescript
interface CollectionRunState {
  isRunning: boolean;
  currentIndex: number;
  itemStatuses: Map<string, 'pending' | 'running' | 'success' | 'error' | 'skipped'>;
  txId: string | null;
  failedItem: { index: number; error: string } | null;
}

export function useCollectionRunner(connectionId: string) {
  const [state, setState] = useState<CollectionRunState>(/* initial */);

  const runAll = useCallback(async (items: ICollectionItem[]) => {
    // 1. BEGIN transaction
    // 2. Loop through items sequentially
    // 3. On each: execute SQL, update status
    // 4. On failure: pause, show retry/abort
    // 5. On complete: await confirm/rollback
  }, [connectionId]);

  const runSingle = useCallback(async (item: ICollectionItem) => {
    // Execute single query (with transaction for DML, without for SELECT)
  }, [connectionId]);

  const retry = useCallback(async () => { /* retry failed item */ }, []);
  const abort = useCallback(async () => { /* rollback entire transaction */ }, []);
  const confirm = useCallback(async () => { /* commit transaction */ }, []);
  const rollback = useCallback(async () => { /* rollback transaction */ }, []);

  return { state, runAll, runSingle, retry, abort, confirm, rollback };
}
```

- [ ] **Step 3: Implement CollectionQueryList.tsx**

Ordered list of queries in a collection:

```typescript
interface CollectionQueryListProps {
  items: ICollectionItem[];
  itemStatuses: Map<string, string>;
  onRunSingle: (item: ICollectionItem) => void;
  onReorder: (items: { queryId: string; sortOrder: number }[]) => void;
  onRemove: (itemId: string) => void;
  onViewResult: (item: ICollectionItem) => void;
}
```

Features:
- Numbered list with query name
- Hover: SQL preview tooltip
- Click: accordion expand to show full SQL
- Individual run button per item
- Status badge (pending/running/success/error)
- @dnd-kit for reorder
- Remove button

- [ ] **Step 4: Implement CollectionResultModal.tsx**

Modal for viewing SELECT results from collection execution:

```typescript
interface CollectionResultModalProps {
  open: boolean;
  queryName: string;
  result: IQueryResult;
  onClose: () => void;
}
```

Uses `DataGrid` and `DataFooter` from data-browser inside a dialog.

- [ ] **Step 5: Implement CollectionTab.tsx**

Orchestrates: FileTreePanel + CollectionQueryList + Add Query picker.

- [ ] **Step 6: Write useCollectionRunner tests**

Create `src/renderer/features/query-browser/model/useCollectionRunner.test.ts`:

Test cases:
- `runAll` executes items sequentially and tracks status
- `runAll` begins transaction and awaits confirm/rollback
- On failure, sets failedItem and pauses execution
- `retry` re-executes the failed item
- `abort` rolls back the entire transaction
- `confirm` commits the transaction
- `rollback` rolls back the transaction
- `runSingle` executes a single query (with transaction for DML)

Mock `queryBrowserApi.txBegin/txExecute/txCommit/txRollback` and `queryApi.execute`.

- [ ] **Step 7: Run collection runner tests**

Run: `npx vitest run src/renderer/features/query-browser/model/useCollectionRunner.test.ts`
Expected: PASS

- [ ] **Step 8: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 9: Commit**

```
feat(query-browser): add Collection tab with sequential execution
```

---

## Task 12: History Tab + Drawer

**Files:**
- Create: `src/renderer/features/query-browser/model/useQueryHistory.ts`
- Create: `src/renderer/features/query-browser/ui/HistoryTable.tsx`
- Create: `src/renderer/features/query-browser/ui/HistoryTab.tsx`
- Create: `src/renderer/features/query-browser/ui/HistoryDrawer.tsx`

- [ ] **Step 1: Implement useQueryHistory.ts**

```typescript
const historyKeys = {
  all: (connId: string) => ['qbHistory', connId] as const,
  list: (connId: string, filter: object) => [...historyKeys.all(connId), filter] as const,
};

export function useQueryHistory(connectionId: string, filter: {
  source?: THistorySource;
  search?: string;
  page: number;
  pageSize: number;
}) {
  return useQuery({
    queryKey: historyKeys.list(connectionId, filter),
    queryFn: async () => {
      const res = await queryBrowserApi.historyList({ connectionId, ...filter });
      if (!res.success) throw new Error(res.error);
      return res.data!;
    },
    enabled: !!connectionId,
  });
}
```

- [ ] **Step 2: Implement HistoryTable.tsx**

Table component with source filter, search, and detail panel:

```typescript
interface HistoryTableProps {
  items: IQueryHistory[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onDelete: (id: string) => void;
  onRerun: (sql: string) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}
```

Features:
- Columns: Time, Source (color-coded badge), SQL (truncated), Rows, Speed, Status
- Click row to show detail panel below (full SQL, error message)
- Actions: Delete, Copy SQL, Re-run

- [ ] **Step 3: Implement HistoryTab.tsx**

Combines filter bar + HistoryTable:

```typescript
interface HistoryTabProps {
  connectionId: string;
  onRerun: (sql: string) => void;
}
```

- [ ] **Step 4: Implement HistoryDrawer.tsx**

Side drawer showing recent 20 history items:

```typescript
interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  onViewAll: () => void;
  onRerun: (sql: string) => void;
}
```

Uses a Sheet/Drawer from Radix UI (or custom). Slides from right.

- [ ] **Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```
feat(query-browser): add History tab and side drawer
```

---

## Task 13: QueryBrowserPage Assembly

**Files:**
- Modify: `src/renderer/pages/db-query/ui/QueryBrowserPage.tsx`
- Modify: `src/renderer/features/query-browser/index.ts`

- [ ] **Step 1: Implement full QueryBrowserPage.tsx**

Replace placeholder with full implementation:

```typescript
export function QueryBrowserPage() {
  const { selectedConnectionId } = useConnectionStore();
  const connectionId = selectedConnectionId ?? '';
  const { data: connections } = useConnections();
  const dbType: TDbType = (connections?.find(c => c.id === connectionId)?.dbType as TDbType) ?? 'mysql';

  const { activeTab, setActiveTab, historyDrawerOpen, setHistoryDrawerOpen } = useQueryBrowserStore();

  if (!connectionId) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">
      <p className="text-sm">Connect to a database first</p>
    </div>;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex items-center border-b px-3">
        <TabButton active={activeTab === 'query'} onClick={() => setActiveTab('query')}>Query</TabButton>
        <TabButton active={activeTab === 'collection'} onClick={() => setActiveTab('collection')}>Collection</TabButton>
        <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')}>History</TabButton>
        <div className="ml-auto">
          <button onClick={() => setHistoryDrawerOpen(!historyDrawerOpen)}>History</button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'query' && <QueryTab connectionId={connectionId} dbType={dbType} />}
        {activeTab === 'collection' && <CollectionTab connectionId={connectionId} dbType={dbType} />}
        {activeTab === 'history' && <HistoryTab connectionId={connectionId} onRerun={/* switch to query tab */} />}
      </div>

      {/* History drawer */}
      <HistoryDrawer
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        connectionId={connectionId}
        onViewAll={() => { setActiveTab('history'); setHistoryDrawerOpen(false); }}
        onRerun={/* switch to query tab with SQL */}
      />
    </div>
  );
}
```

- [ ] **Step 2: Update feature exports**

Add all public components to `src/renderer/features/query-browser/index.ts`.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```
feat(query-browser): assemble QueryBrowserPage with all tabs
```

---

## Task 14: Integration Testing + Polish

**Files:**
- Various UI fixes and adjustments

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Manual smoke test checklist**

Verify in app:
- [ ] Query tab visible in Live Console after connecting
- [ ] Can create folders and queries in tree
- [ ] Can drag & drop to reorder
- [ ] SQL editor loads with syntax highlighting
- [ ] SELECT execution shows results in DataGrid
- [ ] DML execution shows Confirm/Rollback panel
- [ ] DDL execution shows warning
- [ ] Collection tab shows query list
- [ ] Collection Run All executes sequentially
- [ ] History tab shows all entries with filters
- [ ] History drawer opens from any tab
- [ ] Query delete fails when referenced by collection

- [ ] **Step 4: Final commit**

```
feat(query-browser): complete Query Browser service integration
```
