import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';

interface JsonEditorModalProps {
  open: boolean;
  value: unknown;
  columnName: string;
  onSave: (value: unknown) => void;
  onClose: () => void;
}

function formatJson(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') {
    try {
      return JSON.stringify(JSON.parse(val), null, 2);
    } catch {
      return val;
    }
  }
  return JSON.stringify(val, null, 2);
}

function parseJsonValue(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  return JSON.parse(trimmed);
}

export function JsonEditorModal({ open, value, columnName, onSave, onClose }: JsonEditorModalProps) {
  const [text, setText] = useState(() => formatJson(value));
  const [error, setError] = useState<string | null>(null);

  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(text);
      setText(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [text]);

  const handleMinify = useCallback(() => {
    try {
      const parsed = JSON.parse(text);
      setText(JSON.stringify(parsed));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [text]);

  const handleSave = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed === '') {
      onSave(null);
      onClose();
      return;
    }
    try {
      const parsed = parseJsonValue(trimmed);
      onSave(typeof value === 'string' ? JSON.stringify(parsed) : parsed);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }, [text, value, onSave, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Edit JSON — <span className="font-mono text-muted-foreground">{columnName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex gap-1.5">
            <Button variant="outline" size="xs" onClick={handleFormat}>
              Format
            </Button>
            <Button variant="outline" size="xs" onClick={handleMinify}>
              Minify
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => { setText(''); setError(null); }}
            >
              Clear
            </Button>
          </div>

          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setError(null); }}
            className="h-64 w-full resize-y rounded-md border border-border bg-muted/30 p-3 font-mono text-xs outline-none focus:border-primary"
            spellCheck={false}
            placeholder="Enter JSON value..."
          />

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="xs" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" size="xs" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
