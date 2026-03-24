import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql, PostgreSQL, MySQL, MariaSQL } from '@codemirror/lang-sql';
import type { EditorView } from '@codemirror/view';
import { Compartment } from '@codemirror/state';
import { X, TableProperties } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { queryBrowserApi } from '../api/queryBrowserApi';
import { useSchemaData } from '../model/useSchemaData';
import { useQueryBrowserStore } from '../model/queryBrowserStore';
import { SchemaPanel } from './SchemaPanel';
import type { TDbType } from '~/shared/types/db';

const DIALECT_MAP = {
  postgresql: PostgreSQL,
  mysql: MySQL,
  mariadb: MariaSQL,
} as const;

function buildSqlExtension(
  dbType?: TDbType,
  schema?: Record<string, readonly string[]>,
) {
  return sql({
    dialect: dbType ? DIALECT_MAP[dbType] : undefined,
    schema,
    upperCaseKeywords: true,
  });
}

interface QueryEditModalProps {
  open: boolean;
  queryId: string;
  dbType?: TDbType;
  onClose: () => void;
  onSaved?: () => void;
}

export function QueryEditModal({ open, queryId, dbType, onClose, onSaved }: QueryEditModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sqlContent, setSqlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const originalRef = useRef<{ name: string; description: string; sqlContent: string } | null>(null);
  const metaRef = useRef<{ connectionId?: string; folderId?: string | null; sortOrder?: number } | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const { schemaPanelOpen, setSchemaPanelOpen } = useQueryBrowserStore();
  const { tables: schemaTables, isLoading: schemaLoading } = useSchemaData(connectionId);

  // Compartment for dynamic SQL reconfiguration without extension array change
  const sqlCompartment = useRef(new Compartment());

  useEffect(() => {
    if (!open || !queryId) return;
    setLoading(true);
    queryBrowserApi.queryGet(queryId).then((res) => {
      if (res.success && res.data) {
        const q = res.data;
        setName(q.name);
        setDescription(q.description);
        setSqlContent(q.sqlContent);
        originalRef.current = { name: q.name, description: q.description, sqlContent: q.sqlContent };
        metaRef.current = { connectionId: q.connectionId, folderId: q.folderId, sortOrder: q.sortOrder };
        setConnectionId(q.connectionId ?? null);
      }
      setLoading(false);
    });
  }, [open, queryId]);

  const hasChanges = originalRef.current
    ? name !== originalRef.current.name || description !== originalRef.current.description || sqlContent !== originalRef.current.sqlContent
    : false;

  const handleSave = useCallback(async () => {
    if (!metaRef.current) return;
    setSaving(true);
    await queryBrowserApi.querySave({
      id: queryId,
      connectionId: metaRef.current.connectionId ?? '',
      folderId: metaRef.current.folderId,
      name,
      description,
      sqlContent,
      sortOrder: metaRef.current.sortOrder ?? 0,
    });
    originalRef.current = { name, description, sqlContent };
    setSaving(false);
    onSaved?.();
  }, [queryId, name, description, sqlContent, onSaved]);

  const handleClose = useCallback(() => {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Discard?');
      if (!confirmed) return;
    }
    onClose();
  }, [hasChanges, onClose]);

  const handleSchemaInsert = useCallback((text: string) => {
    const view = editorViewRef.current;
    if (!view || view.destroyed) return;
    const docLen = view.state.doc.length;
    const from = Math.min(view.state.selection.main.from, docLen);
    view.dispatch({
      changes: { from, insert: text },
      selection: { anchor: from + text.length },
    });
    requestAnimationFrame(() => {
      if (editorViewRef.current && !editorViewRef.current.destroyed) {
        editorViewRef.current.focus();
      }
    });
  }, []);

  const sqlSchema = useMemo(() => {
    if (schemaTables.length === 0) return undefined;
    const schema: Record<string, readonly string[]> = {};
    for (const t of schemaTables) {
      schema[t.name] = t.columns.map((c) => c.name);
    }
    return schema;
  }, [schemaTables]);

  // Stable extensions — SQL config updates go through Compartment
  const extensions = useMemo(() => [
    sqlCompartment.current.of(buildSqlExtension(dbType, sqlSchema)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  // Reconfigure SQL when schema/dialect changes after initial mount
  const initialMount = useRef(true);
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    const view = editorViewRef.current;
    if (!view || view.destroyed) return;
    view.dispatch({
      effects: sqlCompartment.current.reconfigure(
        buildSqlExtension(dbType, sqlSchema),
      ),
    });
  }, [sqlSchema, dbType]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`flex h-[80vh] max-w-[90vw] flex-col rounded-lg border border-border bg-background shadow-xl transition-[width] ${schemaPanelOpen ? 'w-[960px]' : 'w-[700px]'}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Edit Query</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSchemaPanelOpen(!schemaPanelOpen)}
              className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                schemaPanelOpen
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
              title="Toggle Schema Panel"
            >
              <TableProperties className="size-3" />
              Schema
            </button>
            <button type="button" onClick={handleClose} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="flex min-h-0 flex-1">
            {/* Form + Editor */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Name */}
              <div className="border-b border-border px-4 py-2">
                <label className="text-[10px] font-semibold uppercase text-muted-foreground">Title</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Description */}
              <div className="border-b border-border px-4 py-2">
                <label className="text-[10px] font-semibold uppercase text-muted-foreground">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="mt-1 w-full resize-none rounded border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                  placeholder="What does this query do?"
                />
              </div>

              {/* SQL Editor */}
              <div className="flex min-h-0 flex-1 flex-col px-4 py-2">
                <label className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">SQL</label>
                <div className="min-h-0 flex-1 overflow-hidden rounded border border-border">
                  <CodeMirror
                    value={sqlContent}
                    height="100%"
                    extensions={extensions}
                    onChange={setSqlContent}
                    onCreateEditor={(view) => { editorViewRef.current = view; }}
                    theme="dark"
                    className="h-full"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  Cancel
                </Button>
                <Button variant="default" size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>

            {/* Schema Sidebar */}
            {schemaPanelOpen && (
              <SchemaPanel
                tables={schemaTables}
                isLoading={schemaLoading}
                onInsert={handleSchemaInsert}
                onClose={() => setSchemaPanelOpen(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
