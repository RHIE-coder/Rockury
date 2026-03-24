import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import {
  Play,
  Loader2,
  CheckCircle2,
  RotateCcw,
  XCircle,
  AlertTriangle,
  FileCode,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { generateUuid } from '@/features/data-browser/lib/uuid';
import { useCollectionTree, useCollectionDetail } from '../model/useCollectionTree';
import { useCollectionRunner } from '../model/useCollectionRunner';
import { useQueryTree } from '../model/useQueryTree';
import { useQueryBrowserStore } from '../model/queryBrowserStore';
import { queryBrowserApi } from '../api/queryBrowserApi';
import { FileTreePanel } from './FileTreePanel';
import { CollectionQueryList } from './CollectionQueryList';
import { CollectionResultModal } from './CollectionResultModal';
import { QueryPickerPanel } from './QueryPickerPanel';
import { QueryEditModal } from './QueryEditModal';
import { KeywordInputPanel } from './KeywordInputPanel';
import { extractKeywordsFromMultiple, replaceKeywords } from '../lib/keywords';
import type { TDbType, ICollectionItem } from '~/shared/types/db';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CollectionTabProps {
  connectionId: string;
  dbType: TDbType;
}

interface CollectionMeta {
  id: string;
  name: string;
  description: string;
  folderId: string | null;
  sortOrder: number;
}

/* ------------------------------------------------------------------ */
/*  Collection list drop zone                                          */
/* ------------------------------------------------------------------ */

function CollectionDropZone({ children, isEmpty }: { children: React.ReactNode; isEmpty: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'collection-drop-zone' });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 overflow-y-auto ${isOver ? 'bg-primary/5 ring-2 ring-inset ring-primary/30' : ''}`}
    >
      {children}
      {isEmpty && (
        <div className={`flex items-center justify-center py-8 text-xs ${isOver ? 'text-primary' : 'text-muted-foreground'}`}>
          {isOver ? 'Drop to add query' : 'Drag queries from the right panel'}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CollectionTab({ connectionId, dbType }: CollectionTabProps) {
  const { selectedCollectionId, setSelectedCollectionId } = useQueryBrowserStore();
  const collectionTree = useCollectionTree(connectionId);
  const queryTree = useQueryTree(connectionId);
  const detail = useCollectionDetail(selectedCollectionId);
  const runner = useCollectionRunner(connectionId);

  const [collectionMeta, setCollectionMeta] = useState<CollectionMeta | null>(null);
  const [items, setItems] = useState<ICollectionItem[]>([]);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [resultModal, setResultModal] = useState<{ itemId: string; queryName: string } | null>(null);
  const [editQueryId, setEditQueryId] = useState<string | null>(null);
  const [pendingKeywords, setPendingKeywords] = useState<string[] | null>(null);
  const [lastKeywordValues, setLastKeywordValues] = useState<Record<string, string>>({});
  const [dragOverlayName, setDragOverlayName] = useState<string | null>(null);

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDndDragEnd = useCallback((event: DragEndEvent) => {
    setDragOverlayName(null);
    const { active, over } = event;
    if (!over || !collectionMeta) return;

    const data = active.data.current as { type?: string; queryId?: string } | undefined;

    // Case 1: Dropping a query from picker panel into collection
    if (data?.type === 'picker-query' && data.queryId) {
      if (over.id === 'collection-drop-zone' || items.some((i) => i.id === over.id)) {
        const newItems = [
          ...items.map((i) => ({ queryId: i.queryId, sortOrder: i.sortOrder })),
          { queryId: data.queryId, sortOrder: items.length },
        ];
        collectionTree.saveItems({
          collectionId: collectionMeta.id,
          items: newItems,
        }).then(() => detail.refetch());
      }
      return;
    }

    // Case 2: Reordering within the collection list
    if (active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(items, oldIndex, newIndex);
        // Optimistic update — apply new order immediately
        setItems(reordered.map((item, idx) => ({ ...item, sortOrder: idx })));
        const reorderedPayload = reordered.map((item: ICollectionItem, idx: number) => ({
          queryId: item.queryId,
          sortOrder: idx,
        }));
        collectionTree.saveItems({
          collectionId: collectionMeta.id,
          items: reorderedPayload,
        }).then(() => detail.refetch());
      }
    }
  }, [items, collectionMeta, collectionTree, detail]);

  /* -- Sync loaded detail into local state ----------------------------- */
  const detailCollectionId = detail.collection?.id ?? null;
  const detailItemsJson = JSON.stringify(detail.items.map((i) => i.id));
  useEffect(() => {
    if (detail.collection) {
      setCollectionMeta({
        id: detail.collection.id,
        name: detail.collection.name,
        description: detail.collection.description,
        folderId: detail.collection.folderId ?? null,
        sortOrder: detail.collection.sortOrder ?? 0,
      });
      setItems(detail.items);
    } else if (!selectedCollectionId) {
      setCollectionMeta(null);
      setItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailCollectionId, detailItemsJson, selectedCollectionId]);

  /* -- Description editing --------------------------------------------- */
  const handleDescriptionClick = useCallback(() => {
    if (!collectionMeta) return;
    setDescriptionDraft(collectionMeta.description);
    setIsEditingDescription(true);
  }, [collectionMeta]);

  const handleDescriptionBlur = useCallback(() => {
    setIsEditingDescription(false);
    if (!collectionMeta) return;
    const trimmed = descriptionDraft.trim();
    if (trimmed === collectionMeta.description) return;
    const updated = { ...collectionMeta, description: trimmed };
    setCollectionMeta(updated);
    collectionTree.saveCollection({
      id: updated.id,
      connectionId,
      folderId: updated.folderId,
      name: updated.name,
      description: trimmed,
      sortOrder: updated.sortOrder,
    });
  }, [collectionMeta, descriptionDraft, connectionId, collectionTree]);

  /* -- Run handlers ---------------------------------------------------- */
  const runnableItems = useMemo(() => items.filter((i) => i.sqlContent?.trim()), [items]);

  const handleRunAll = useCallback(() => {
    if (runnableItems.length === 0) return;

    // Check for keywords across all queries
    const sqls = runnableItems.map((i) => i.sqlContent ?? '').filter(Boolean);
    const keywords = extractKeywordsFromMultiple(sqls);
    if (keywords.length > 0) {
      setPendingKeywords(keywords);
      return;
    }

    setPendingKeywords(null);
    runner.runAll(runnableItems);
  }, [runnableItems, runner]);

  const handleKeywordSubmit = useCallback((values: Record<string, string>) => {
    setLastKeywordValues(values);
    setPendingKeywords(null);
    // Replace keywords in runnable items and run
    const resolvedItems = runnableItems.map((item) => ({
      ...item,
      sqlContent: item.sqlContent ? replaceKeywords(item.sqlContent, values) : item.sqlContent,
    }));
    runner.runAll(resolvedItems);
  }, [runnableItems, runner]);

  const handleKeywordCancel = useCallback(() => {
    setPendingKeywords(null);
  }, []);

  const handleRunSingle = useCallback(
    (item: ICollectionItem) => {
      runner.runSingle(item);
    },
    [runner],
  );

  const handleRetry = useCallback(() => {
    runner.retry(items);
  }, [runner, items]);

  /* -- Item management ------------------------------------------------- */
  const handleReorder = useCallback(
    (reorderedItems: { queryId: string; sortOrder: number }[]) => {
      if (!collectionMeta) return;
      collectionTree.saveItems({
        collectionId: collectionMeta.id,
        items: reorderedItems,
      }).then(() => detail.refetch());
    },
    [collectionMeta, collectionTree, detail],
  );

  const handleRemove = useCallback(
    (itemId: string) => {
      if (!collectionMeta) return;
      const remaining = items
        .filter((i) => i.id !== itemId)
        .map((i, idx) => ({ queryId: i.queryId, sortOrder: idx }));
      collectionTree.saveItems({
        collectionId: collectionMeta.id,
        items: remaining,
      }).then(() => detail.refetch());
    },
    [collectionMeta, items, collectionTree, detail],
  );

  /* -- View result ----------------------------------------------------- */
  const handleViewResult = useCallback(
    (itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;
      setResultModal({ itemId, queryName: item.queryName ?? 'Query' });
    },
    [items],
  );

  const selectResultIds = useMemo(
    () => new Set(runner.selectResults.keys()),
    [runner.selectResults],
  );

  /* -- File tree callbacks --------------------------------------------- */
  const handleSelect = useCallback(
    (id: string) => {
      setSelectedCollectionId(id);
    },
    [setSelectedCollectionId],
  );

  const handleCreateFolder = useCallback(
    (parentId: string | null) => {
      collectionTree.saveFolder({
        id: generateUuid(),
        connectionId,
        parentId,
        name: 'New Folder',
        sortOrder: collectionTree.folders.length,
      });
    },
    [collectionTree, connectionId],
  );

  const handleCreateItem = useCallback(
    (folderId: string | null) => {
      const id = generateUuid();
      collectionTree
        .saveCollection({
          id,
          connectionId,
          folderId,
          name: 'Untitled Collection',
          description: '',
          sortOrder: collectionTree.collections.length,
        })
        .then(() => setSelectedCollectionId(id));
    },
    [collectionTree, connectionId, setSelectedCollectionId],
  );

  const handleRenameFolder = useCallback(
    (id: string, name: string) => {
      const folder = collectionTree.folders.find((f) => f.id === id);
      if (!folder) return;
      collectionTree.saveFolder({
        id,
        connectionId,
        parentId: folder.parentId,
        name,
        sortOrder: folder.sortOrder,
      });
    },
    [collectionTree, connectionId],
  );

  const handleRenameItem = useCallback(
    (id: string, name: string) => {
      if (collectionMeta && collectionMeta.id === id) {
        const updated = { ...collectionMeta, name };
        setCollectionMeta(updated);
        collectionTree.saveCollection({
          id,
          connectionId,
          folderId: updated.folderId,
          name,
          description: updated.description,
          sortOrder: updated.sortOrder,
        });
      } else {
        queryBrowserApi.collectionGet(id).then((res) => {
          if (!res.success || !res.data) return;
          const c = res.data.collection;
          collectionTree.saveCollection({
            id,
            connectionId,
            folderId: c.folderId,
            name,
            description: c.description,
            sortOrder: c.sortOrder ?? 0,
          });
        });
      }
    },
    [collectionMeta, collectionTree, connectionId],
  );

  const handleDeleteFolder = useCallback(
    (id: string) => {
      collectionTree.deleteFolder(id);
    },
    [collectionTree],
  );

  const handleDeleteItem = useCallback(
    async (id: string) => {
      const res = await collectionTree.deleteCollection(id);
      if (res.success && selectedCollectionId === id) {
        setSelectedCollectionId(null);
      }
      return res;
    },
    [collectionTree, selectedCollectionId, setSelectedCollectionId],
  );

  const handleMove = useCallback(
    (moveItems: { id: string; folderId?: string | null; sortOrder: number }[]) => {
      // Collections don't have bulkMove in the API, so save each individually
      // For now, reuse the folder-level approach: saveCollection for each
      for (const item of moveItems) {
        const col = collectionTree.collections.find((c) => c.id === item.id);
        if (!col) continue;
        collectionTree.saveCollection({
          id: col.id,
          connectionId,
          folderId: item.folderId ?? null,
          name: col.name,
          description: col.description ?? '',
          sortOrder: item.sortOrder,
        });
      }
    },
    [collectionTree, connectionId],
  );

  const handleMoveFolder = useCallback(
    (folderId: string, newParentId: string | null) => {
      const folder = collectionTree.folders.find((f) => f.id === folderId);
      if (!folder) return;
      collectionTree.saveFolder({
        id: folderId,
        connectionId,
        parentId: newParentId,
        name: folder.name,
        sortOrder: folder.sortOrder,
      });
    },
    [collectionTree, connectionId],
  );

  /* -- Map tree data for FileTreePanel --------------------------------- */
  const treeFolders = collectionTree.folders.map((f) => ({
    id: f.id,
    parentId: f.parentId ?? null,
    name: f.name,
    sortOrder: f.sortOrder ?? 0,
  }));

  const treeItems = collectionTree.collections.map((c) => ({
    id: c.id,
    name: c.name,
    folderId: c.folderId ?? null,
    sortOrder: c.sortOrder ?? 0,
    description: c.description,
  }));


  /* -- Render ---------------------------------------------------------- */
  const isRunning = runner.state.isRunning;
  const hasFailed = runner.state.failedItem !== null;
  const isCompleted = runner.state.completedAll;
  const hasTx = runner.state.txId !== null;

  return (
    <DndContext
      sensors={dndSensors}
      onDragStart={(e) => {
        const data = e.active.data.current as { queryName?: string } | undefined;
        if (data?.queryName) {
          setDragOverlayName(data.queryName);
        } else {
          // Reorder drag — find item name
          const item = items.find((i) => i.id === e.active.id);
          setDragOverlayName(item?.queryName ?? null);
        }
      }}
      onDragEnd={handleDndDragEnd}
    >
    <div className="flex h-full">
      {/* Left Panel: Collection File Tree */}
      <FileTreePanel
        folders={treeFolders}
        items={treeItems}
        selectedId={selectedCollectionId}
        onSelect={handleSelect}
        onCreateFolder={handleCreateFolder}
        onCreateItem={handleCreateItem}
        onRenameFolder={handleRenameFolder}
        onRenameItem={handleRenameItem}
        onDeleteFolder={handleDeleteFolder}
        onDeleteItem={handleDeleteItem}
        onMove={handleMove}
        onMoveFolder={handleMoveFolder}
        searchPlaceholder="Filter collections..."
        createItemLabel="New Collection"
        itemIcon="collection"
      />

      {/* Main Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {collectionMeta ? (
          <>
            {/* Toolbar: collection name + description + run all */}
            <div className="flex shrink-0 items-start justify-between border-b border-border px-3 py-1.5">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{collectionMeta.name}</span>
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
                    {collectionMeta.description || 'Add description...'}
                  </button>
                )}
              </div>
              <Button
                variant="default"
                size="xs"
                onClick={handleRunAll}
                disabled={isRunning || runnableItems.length === 0}
              >
                {isRunning ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : (
                  <Play className="mr-1 size-3" />
                )}
                Run All
              </Button>
            </div>

            {/* Keyword Input */}
            {pendingKeywords && pendingKeywords.length > 0 && (
              <KeywordInputPanel
                keywords={pendingKeywords}
                initialValues={lastKeywordValues}
                onSubmit={handleKeywordSubmit}
                onCancel={handleKeywordCancel}
                submitLabel="Run All"
              />
            )}

            {/* Query list (droppable zone) */}
            <CollectionDropZone isEmpty={items.length === 0}>
              <CollectionQueryList
                items={items}
                itemStatuses={runner.state.itemStatuses}
                onRunSingle={handleRunSingle}
                onReorder={handleReorder}
                onRemove={handleRemove}
                onViewResult={handleViewResult}
                onEditQuery={(queryId) => setEditQueryId(queryId)}
                selectResultIds={selectResultIds}
              />
            </CollectionDropZone>

            {/* Error banner */}
            {hasFailed && runner.state.failedItem && (
              <div className="flex items-center gap-2 border-t border-border bg-destructive/10 px-3 py-2">
                <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
                <span className="flex-1 text-xs text-destructive">
                  Item #{runner.state.failedItem.index + 1} failed: {runner.state.failedItem.error}
                </span>
                <Button variant="outline" size="xs" onClick={handleRetry}>
                  <RotateCcw className="mr-1 size-3" />
                  Retry
                </Button>
                <Button variant="destructive" size="xs" onClick={runner.abort}>
                  <XCircle className="mr-1 size-3" />
                  Abort
                </Button>
              </div>
            )}

            {/* Transaction controls */}
            {isCompleted && hasTx && (
              <div className="flex items-center gap-2 border-t border-border bg-green-500/10 px-3 py-2">
                <CheckCircle2 className="size-3.5 shrink-0 text-green-600" />
                <span className="flex-1 text-xs text-green-700 dark:text-green-400">
                  All queries completed. Confirm or rollback the transaction.
                </span>
                <Button variant="default" size="xs" onClick={runner.confirm}>
                  Confirm
                </Button>
                <Button variant="outline" size="xs" onClick={runner.rollback}>
                  Rollback
                </Button>
              </div>
            )}

            {isCompleted && !hasTx && (
              <div className="flex items-center gap-2 border-t border-border bg-green-500/10 px-3 py-2">
                <CheckCircle2 className="size-3.5 shrink-0 text-green-600" />
                <span className="flex-1 text-xs text-green-700 dark:text-green-400">
                  All queries completed successfully.
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <p className="text-sm">Select a collection or create one</p>
          </div>
        )}
      </div>

      {/* Right Panel: Query Picker */}
      {collectionMeta && (
        <QueryPickerPanel
          folders={queryTree.folders}
          queries={queryTree.queries}
        />
      )}

      {/* Drag overlay */}
      <DragOverlay>
        {dragOverlayName ? (
          <div className="flex items-center gap-1 rounded bg-background px-2 py-1 text-xs shadow-md border border-border">
            <FileCode className="size-3 text-muted-foreground" />
            <span className="truncate">{dragOverlayName}</span>
          </div>
        ) : null}
      </DragOverlay>

      {/* Result Modal */}
      {resultModal && runner.selectResults.has(resultModal.itemId) && (
        <CollectionResultModal
          open
          queryName={resultModal.queryName}
          result={runner.selectResults.get(resultModal.itemId)!}
          onClose={() => setResultModal(null)}
        />
      )}

      {/* Query Edit Modal */}
      {editQueryId && (
        <QueryEditModal
          open
          queryId={editQueryId}
          dbType={dbType}
          onClose={() => setEditQueryId(null)}
          onSaved={() => detail.refetch()}
        />
      )}
    </div>
    </DndContext>
  );
}
