import { useState, useCallback, useRef, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { keymap } from '@codemirror/view';
import { Play, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export interface SqlEditorPanelHandle {
  getValue: () => string;
}

interface SqlEditorPanelProps {
  initialValue: string;
  onContentChange?: (value: string) => void;
  onRun: (sql: string) => void;
  isLoading?: boolean;
}

const MIN_HEIGHT = 80;
const DEFAULT_HEIGHT = 160;

export const SqlEditorPanel = forwardRef<SqlEditorPanelHandle, SqlEditorPanelProps>(
  function SqlEditorPanel({ initialValue, onContentChange, onRun, isLoading = false }, ref) {
    // Internal state — CodeMirror owns the content, no external controlled value
    const [content, setContent] = useState(initialValue);
    const [height, setHeight] = useState(DEFAULT_HEIGHT);
    const isDragging = useRef(false);
    const startY = useRef(0);
    const startHeight = useRef(0);

    // Expose getValue to parent via ref
    useImperativeHandle(ref, () => ({
      getValue: () => content,
    }), [content]);

    const handleChange = useCallback((value: string) => {
      setContent(value);
      onContentChange?.(value);
    }, [onContentChange]);

    const handleRun = useCallback(() => {
      if (!content.trim()) return;
      onRun(content);
    }, [content, onRun]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      isDragging.current = true;
      startY.current = e.clientY;
      startHeight.current = height;
      e.preventDefault();
    }, [height]);

    useEffect(() => {
      function handleMouseMove(e: MouseEvent) {
        if (!isDragging.current) return;
        const delta = e.clientY - startY.current;
        setHeight(Math.max(MIN_HEIGHT, startHeight.current + delta));
      }

      function handleMouseUp() {
        isDragging.current = false;
      }

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, []);

    const extensions = useMemo(() => [
      sql(),
      keymap.of([
        {
          key: 'Mod-Enter',
          run: () => {
            // Use latest content via closure — handleRun captures stale content
            // so we dispatch a custom event instead
            document.dispatchEvent(new CustomEvent('sql-editor-run'));
            return true;
          },
        },
      ]),
    ], []);

    // Listen for the custom run event
    useEffect(() => {
      const handler = () => { handleRun(); };
      document.addEventListener('sql-editor-run', handler);
      return () => document.removeEventListener('sql-editor-run', handler);
    }, [handleRun]);

    return (
      <div className="flex flex-col border-b border-border">
        {/* Toolbar */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-1">
          <span className="text-xs font-medium text-muted-foreground">SQL Editor</span>
          <div className="ml-auto flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">
              {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to run
            </span>
            <Button
              variant="default"
              size="xs"
              onClick={handleRun}
              disabled={isLoading || !content.trim()}
            >
              {isLoading ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : (
                <Play className="mr-1 size-3" />
              )}
              Run
            </Button>
          </div>
        </div>

        {/* Editor area */}
        <div style={{ height }} className="min-h-0 overflow-hidden">
          <CodeMirror
            value={content}
            height={`${height}px`}
            extensions={extensions}
            onChange={handleChange}
            className="h-full w-full"
            theme="dark"
          />
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="flex h-1.5 shrink-0 cursor-row-resize items-center justify-center hover:bg-muted/50"
        >
          <div className="h-px w-8 rounded bg-border" />
        </div>
      </div>
    );
  },
);
