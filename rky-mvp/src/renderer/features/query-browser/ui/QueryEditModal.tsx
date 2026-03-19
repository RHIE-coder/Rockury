import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { queryBrowserApi } from '../api/queryBrowserApi';

interface QueryEditModalProps {
  open: boolean;
  queryId: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function QueryEditModal({ open, queryId, onClose, onSaved }: QueryEditModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sqlContent, setSqlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const originalRef = useRef<{ name: string; description: string; sqlContent: string } | null>(null);
  const metaRef = useRef<{ connectionId?: string; folderId?: string | null; sortOrder?: number } | null>(null);

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

  const extensions = useMemo(() => [sql()], []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[80vh] w-[700px] max-w-[90vw] flex-col rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Edit Query</span>
          <button type="button" onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
