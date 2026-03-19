import { useState, useCallback, useEffect, useRef } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import { DataGrid, DataFooter } from '@/features/data-browser';
import { generateUuid } from '@/features/data-browser/lib/uuid';
import { useQueryTree } from '../model/useQueryTree';
import { useQueryExecution } from '../model/useQueryExecution';
import { useQueryBrowserStore } from '../model/queryBrowserStore';
import { queryBrowserApi } from '../api/queryBrowserApi';
import { FileTreePanel } from './FileTreePanel';
import { SqlEditorPanel } from './SqlEditorPanel';
import { DmlResultPanel } from './DmlResultPanel';
import type { TDbType } from '~/shared/types/db';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface QueryTabProps {
  connectionId: string;
  dbType: TDbType;
}

interface QueryMeta {
  id: string;
  name: string;
  description: string;
  folderId: string | null;
  sortOrder: number;
}

const AUTO_SAVE_DELAY = 2000;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function QueryTab({ connectionId, dbType }: QueryTabProps) {
  const { selectedQueryId, setSelectedQueryId } = useQueryBrowserStore();
  const queryTree = useQueryTree(connectionId);
  const execution = useQueryExecution(connectionId);

  const [sqlContent, setSqlContent] = useState('');
  const [queryMeta, setQueryMeta] = useState<QueryMeta | null>(null);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSqlRef = useRef('');

  /* -- Load query on selection -------------------------------------- */
  useEffect(() => {
    if (!selectedQueryId) {
      setQueryMeta(null);
      setSqlContent('');
      lastSavedSqlRef.current = '';
      return;
    }

    let cancelled = false;
    queryBrowserApi.queryGet(selectedQueryId).then((res) => {
      if (cancelled || !res.success || !res.data) return;
      const q = res.data;
      setQueryMeta({
        id: q.id,
        name: q.name,
        description: q.description,
        folderId: q.folderId ?? null,
        sortOrder: q.sortOrder ?? 0,
      });
      setSqlContent(q.sqlContent);
      lastSavedSqlRef.current = q.sqlContent;
    });

    return () => { cancelled = true; };
  }, [selectedQueryId]);

  /* -- Auto-save SQL on inactivity ---------------------------------- */
  const saveCurrentSql = useCallback(
    (sql: string) => {
      if (!queryMeta || sql === lastSavedSqlRef.current) return;
      lastSavedSqlRef.current = sql;
      queryTree.saveQuery({
        id: queryMeta.id,
        connectionId,
        folderId: queryMeta.folderId,
        name: queryMeta.name,
        description: queryMeta.description,
        sqlContent: sql,
        sortOrder: queryMeta.sortOrder,
      });
    },
    [queryMeta, connectionId, queryTree],
  );

  const handleSqlChange = useCallback(
    (value: string) => {
      setSqlContent(value);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => saveCurrentSql(value), AUTO_SAVE_DELAY);
    },
    [saveCurrentSql],
  );

  const handleSqlBlur = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    saveCurrentSql(sqlContent);
  }, [saveCurrentSql, sqlContent]);

  /* -- Description editing ------------------------------------------ */
  const handleDescriptionClick = useCallback(() => {
    if (!queryMeta) return;
    setDescriptionDraft(queryMeta.description);
    setIsEditingDescription(true);
  }, [queryMeta]);

  const handleDescriptionBlur = useCallback(() => {
    setIsEditingDescription(false);
    if (!queryMeta) return;
    const trimmed = descriptionDraft.trim();
    if (trimmed === queryMeta.description) return;
    const updated = { ...queryMeta, description: trimmed };
    setQueryMeta(updated);
    queryTree.saveQuery({
      id: updated.id,
      connectionId,
      folderId: updated.folderId,
      name: updated.name,
      description: trimmed,
      sqlContent,
      sortOrder: updated.sortOrder,
    });
  }, [queryMeta, descriptionDraft, connectionId, sqlContent, queryTree]);

  /* -- Run query ---------------------------------------------------- */
  const handleRun = useCallback(() => {
    if (!sqlContent.trim()) return;
    // Save before running
    saveCurrentSql(sqlContent);
    setPage(0);
    execution.execute(sqlContent);
  }, [sqlContent, saveCurrentSql, execution]);

  /* -- File tree callbacks ------------------------------------------ */
  const handleSelect = useCallback(
    (id: string) => {
      // Save current before switching
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      saveCurrentSql(sqlContent);
      setSelectedQueryId(id);
      setColumnVisibility({});
      setPage(0);
    },
    [saveCurrentSql, sqlContent, setSelectedQueryId],
  );

  const handleCreateFolder = useCallback(
    (parentId: string | null) => {
      queryTree.saveFolder({
        id: generateUuid(),
        connectionId,
        parentId,
        name: 'New Folder',
        sortOrder: queryTree.folders.length,
      });
    },
    [queryTree, connectionId],
  );

  const handleCreateItem = useCallback(
    (folderId: string | null) => {
      const id = generateUuid();
      queryTree
        .saveQuery({
          id,
          connectionId,
          folderId,
          name: 'Untitled Query',
          description: '',
          sqlContent: '',
          sortOrder: queryTree.queries.length,
        })
        .then(() => setSelectedQueryId(id));
    },
    [queryTree, connectionId, setSelectedQueryId],
  );

  const handleRenameFolder = useCallback(
    (id: string, name: string) => {
      const folder = queryTree.folders.find((f) => f.id === id);
      if (!folder) return;
      queryTree.saveFolder({
        id,
        connectionId,
        parentId: folder.parentId,
        name,
        sortOrder: folder.sortOrder,
      });
    },
    [queryTree, connectionId],
  );

  const handleRenameItem = useCallback(
    (id: string, name: string) => {
      // Also update local meta if it is the selected query
      if (queryMeta && queryMeta.id === id) {
        const updated = { ...queryMeta, name };
        setQueryMeta(updated);
        queryTree.saveQuery({
          id,
          connectionId,
          folderId: updated.folderId,
          name,
          description: updated.description,
          sqlContent,
          sortOrder: updated.sortOrder,
        });
      } else {
        // Need to fetch the query data to preserve other fields
        queryBrowserApi.queryGet(id).then((res) => {
          if (!res.success || !res.data) return;
          const q = res.data;
          queryTree.saveQuery({
            id,
            connectionId,
            folderId: q.folderId,
            name,
            description: q.description,
            sqlContent: q.sqlContent,
            sortOrder: q.sortOrder ?? 0,
          });
        });
      }
    },
    [queryMeta, queryTree, connectionId, sqlContent],
  );

  const handleDeleteFolder = useCallback(
    (id: string) => {
      queryTree.deleteFolder(id);
    },
    [queryTree],
  );

  const handleDeleteItem = useCallback(
    async (id: string) => {
      const res = await queryTree.deleteQuery(id);
      if (res.success && selectedQueryId === id) {
        setSelectedQueryId(null);
      }
      return res;
    },
    [queryTree, selectedQueryId, setSelectedQueryId],
  );

  const handleMove = useCallback(
    (items: { id: string; folderId?: string | null; sortOrder: number }[]) => {
      queryTree.bulkMove(items);
    },
    [queryTree],
  );

  /* -- Map tree items for FileTreePanel ----------------------------- */
  const treeItems = queryTree.queries.map((q) => ({
    id: q.id,
    name: q.name,
    folderId: q.folderId ?? null,
    sortOrder: q.sortOrder ?? 0,
  }));

  const treeFolders = queryTree.folders.map((f) => ({
    id: f.id,
    parentId: f.parentId ?? null,
    name: f.name,
    sortOrder: f.sortOrder ?? 0,
  }));

  /* -- Result display logic ----------------------------------------- */
  const hasSelectResult =
    execution.result && execution.result.columns && execution.result.columns.length > 0;

  return (
    <div className="flex h-full">
      {/* Left Panel: File Tree */}
      <FileTreePanel
        folders={treeFolders}
        items={treeItems}
        selectedId={selectedQueryId}
        onSelect={handleSelect}
        onCreateFolder={handleCreateFolder}
        onCreateItem={handleCreateItem}
        onRenameFolder={handleRenameFolder}
        onRenameItem={handleRenameItem}
        onDeleteFolder={handleDeleteFolder}
        onDeleteItem={handleDeleteItem}
        onMove={handleMove}
        searchPlaceholder="Filter queries..."
        createItemLabel="New Query"
        itemIcon="query"
      />

      {/* Main Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {queryMeta ? (
          <>
            {/* Toolbar: filename + description */}
            <div className="flex shrink-0 flex-col border-b border-border px-3 py-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{queryMeta.name}</span>
                {/* TODO: collection badges */}
              </div>
              {isEditingDescription ? (
                <input
                  type="text"
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  onBlur={handleDescriptionBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDescriptionBlur();
                    if (e.key === 'Escape') setIsEditingDescription(false);
                  }}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  className="mt-0.5 min-w-0 bg-transparent text-xs text-muted-foreground outline-none"
                  placeholder="Add description..."
                />
              ) : (
                <button
                  type="button"
                  onClick={handleDescriptionClick}
                  className="mt-0.5 text-left text-xs text-muted-foreground hover:text-foreground"
                >
                  {queryMeta.description || 'Add description...'}
                </button>
              )}
            </div>

            {/* SQL Editor — key forces remount on query switch to avoid CodeMirror state mismatch */}
            <SqlEditorPanel
              key={queryMeta.id}
              value={sqlContent}
              onChange={handleSqlChange}
              onRun={handleRun}
              isLoading={execution.isLoading}
            />

            {/* Blur handler for auto-save (invisible) */}
            <div onFocus={handleSqlBlur} className="sr-only" tabIndex={-1} />

            {/* Error Banner */}
            {execution.error && (
              <div className="flex items-center gap-2 bg-destructive/10 px-3 py-2">
                <span className="flex-1 text-xs text-destructive">{execution.error}</span>
                <button
                  type="button"
                  onClick={execution.dismissError}
                  className="text-xs text-destructive underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Result area */}
            {execution.txState ? (
              <div className="p-3">
                <DmlResultPanel
                  dmlType={execution.txState.dmlType}
                  affectedRows={execution.txState.affectedRows}
                  onConfirm={execution.confirm}
                  onRollback={execution.rollback}
                />
              </div>
            ) : execution.isDdlWarning ? (
              <div className="p-3">
                <DmlResultPanel
                  dmlType="DDL"
                  affectedRows={0}
                  isDdlWarning
                  onConfirm={() => {}}
                  onRollback={() => {}}
                />
              </div>
            ) : hasSelectResult ? (
              <DataGrid
                result={execution.result!}
                pageOffset={page * pageSize}
                orderBy={null}
                onToggleSort={() => {}}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
                canEdit={false}
                pendingChanges={new Map()}
                insertedRows={[]}
                getRowKey={(row) => JSON.stringify(row)}
                onCellSave={() => {}}
                onRowContextMenu={() => {}}
              />
            ) : execution.isLoading ? (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                <span className="text-sm">Executing...</span>
              </div>
            ) : null}

            {/* Footer */}
            {hasSelectResult && (
              <DataFooter
                rowCount={execution.result!.rowCount}
                executionTimeMs={execution.result!.executionTimeMs}
                page={page}
                pageSize={pageSize}
                isLoading={execution.isLoading}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <p className="text-sm">Select a query or create one</p>
          </div>
        )}
      </div>
    </div>
  );
}
