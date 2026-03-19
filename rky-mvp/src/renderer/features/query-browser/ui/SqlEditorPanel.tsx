import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { keymap } from '@codemirror/view';
import { Play, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface SqlEditorPanelProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  isLoading?: boolean;
}

const MIN_HEIGHT = 80;
const DEFAULT_HEIGHT = 160;

export function SqlEditorPanel({ value, onChange, onRun, isLoading = false }: SqlEditorPanelProps) {
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

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
          onRun();
          return true;
        },
      },
    ]),
  ], [onRun]);

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
            onClick={onRun}
            disabled={isLoading || !value.trim()}
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
          value={value}
          height={`${height}px`}
          extensions={extensions}
          onChange={onChange}
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
}
