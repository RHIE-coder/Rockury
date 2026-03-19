import { useState, useCallback, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
import { EditorView } from '@codemirror/view';
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

function validateJson(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  try {
    JSON.parse(trimmed);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

export function JsonEditorModal({ open, value, columnName, onSave, onClose }: JsonEditorModalProps) {
  const [text, setText] = useState(() => formatJson(value));

  const error = useMemo(() => validateJson(text), [text]);

  const extensions = useMemo(
    () => [json(), linter(jsonParseLinter()), lintGutter(), EditorView.lineWrapping],
    [],
  );

  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(text);
      setText(JSON.stringify(parsed, null, 2));
    } catch {
      // error already shown via lint
    }
  }, [text]);

  const handleMinify = useCallback(() => {
    try {
      const parsed = JSON.parse(text);
      setText(JSON.stringify(parsed));
    } catch {
      // error already shown via lint
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
    } catch {
      // error already shown via lint
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
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="xs" onClick={handleFormat} disabled={!!error}>
              Format
            </Button>
            <Button variant="outline" size="xs" onClick={handleMinify} disabled={!!error}>
              Minify
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setText('')}
            >
              Clear
            </Button>
            {error && (
              <span className="ml-2 text-[10px] text-destructive">{error}</span>
            )}
          </div>

          <div className="overflow-hidden rounded-md border border-border">
            <CodeMirror
              value={text}
              height="280px"
              extensions={extensions}
              onChange={(val) => setText(val)}
              className="text-xs"
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: false,
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="xs" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" size="xs" onClick={handleSave} disabled={!!error}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
