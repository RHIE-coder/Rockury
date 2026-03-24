import { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { EditorView, keymap as cmKeymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { EditorState, Compartment, Prec } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { sql, PostgreSQL, MySQL, MariaSQL } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { Play, Loader2, Paintbrush, Zap } from 'lucide-react';
import { format as formatSql } from 'sql-formatter';
import { Button } from '@/shared/components/ui/button';
import type { TDbType } from '~/shared/types/db';

export interface SqlEditorPanelHandle {
  getValue: () => string;
  insertText: (text: string) => void;
}

interface SqlEditorPanelProps {
  initialValue: string;
  onContentChange?: (value: string) => void;
  onRun: (sql: string) => void;
  onExplain?: (sql: string) => void;
  isLoading?: boolean;
  sqlSchema?: Record<string, readonly string[]>;
  dbType?: TDbType;
}

const FORMATTER_DIALECT: Record<string, string> = {
  postgresql: 'postgresql',
  mysql: 'mysql',
  mariadb: 'mariadb',
  sqlite: 'sqlite',
};

const DIALECT_MAP = {
  postgresql: PostgreSQL,
  mysql: MySQL,
  mariadb: MariaSQL,
} as const;

const MIN_HEIGHT = 80;
const DEFAULT_HEIGHT = 160;

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

export const SqlEditorPanel = forwardRef<SqlEditorPanelHandle, SqlEditorPanelProps>(
  function SqlEditorPanel({ initialValue, onContentChange, onRun, onExplain, isLoading = false, sqlSchema, dbType }, ref) {
    const contentRef = useRef(initialValue);
    const [hasContent, setHasContent] = useState(!!initialValue.trim());
    const [height, setHeight] = useState(DEFAULT_HEIGHT);
    const isDragging = useRef(false);
    const startY = useRef(0);
    const startHeight = useRef(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const sqlCompartment = useRef(new Compartment());
    const onRunRef = useRef(onRun);
    onRunRef.current = onRun;
    const onContentChangeRef = useRef(onContentChange);
    onContentChangeRef.current = onContentChange;
    const contentChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Create EditorView on mount, destroy on unmount
    useEffect(() => {
      if (!containerRef.current) return;

      let prevHasContent = !!initialValue.trim();

      const updateListener = EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;

        // Lightweight check — avoid doc.toString() for button state
        const nowHasContent = update.state.doc.length > 0;
        if (nowHasContent !== prevHasContent) {
          prevHasContent = nowHasContent;
          setHasContent(nowHasContent);
        }

        // Debounce content change callback (keyword detection, auto-save)
        if (contentChangeTimer.current) clearTimeout(contentChangeTimer.current);
        contentChangeTimer.current = setTimeout(() => {
          const value = update.state.doc.toString();
          contentRef.current = value;
          onContentChangeRef.current?.(value);
        }, 150);
      });

      const runKeymap = cmKeymap.of([
        {
          key: 'Mod-Enter',
          run: (view) => {
            const value = view.state.doc.toString();
            if (value.trim()) onRunRef.current(value);
            return true;
          },
        },
      ]);

      const state = EditorState.create({
        doc: initialValue,
        extensions: [
          // Minimal setup — only what a SQL editor needs
          lineNumbers(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          bracketMatching(),
          autocompletion(),
          cmKeymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap]),
          oneDark,
          EditorView.theme({
            '&': { height: '100%' },
            '.cm-scroller': { overflow: 'auto' },
          }),
          sqlCompartment.current.of(buildSqlExtension(dbType, sqlSchema)),
          Prec.highest(runKeymap),
          updateListener,
          EditorView.lineWrapping,
          EditorView.exceptionSink.of(() => {}),
        ],
      });

      const view = new EditorView({ state, parent: containerRef.current });
      viewRef.current = view;

      return () => {
        if (contentChangeTimer.current) clearTimeout(contentChangeTimer.current);
        view.destroy();
        viewRef.current = null;
      };
    // initialValue is stable per instance (key-based remount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reconfigure SQL extension when schema/dialect changes
    const initialMount = useRef(true);
    useEffect(() => {
      if (initialMount.current) {
        initialMount.current = false;
        return;
      }
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: sqlCompartment.current.reconfigure(
          buildSqlExtension(dbType, sqlSchema),
        ),
      });
    }, [sqlSchema, dbType]);

    useImperativeHandle(ref, () => ({
      getValue: () => viewRef.current?.state.doc.toString() ?? contentRef.current,
      insertText: (text: string) => {
        const view = viewRef.current;
        if (!view) return;
        const docLen = view.state.doc.length;
        const from = Math.min(view.state.selection.main.from, docLen);
        view.dispatch({
          changes: { from, insert: text },
          selection: { anchor: from + text.length },
        });
        view.focus();
      },
    }), []);

    const handleRun = useCallback(() => {
      const value = contentRef.current;
      if (!value.trim()) return;
      onRun(value);
    }, [onRun]);

    const onExplainRef = useRef(onExplain);
    onExplainRef.current = onExplain;

    const handleFormat = useCallback(() => {
      const view = viewRef.current;
      if (!view) return;
      const raw = view.state.doc.toString();
      if (!raw.trim()) return;
      try {
        const formatted = formatSql(raw, {
          language: FORMATTER_DIALECT[dbType ?? 'postgresql'] ?? 'sql',
        });
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: formatted },
        });
      } catch {
        // Formatting failed — leave editor unchanged
      }
    }, [dbType]);

    const handleExplain = useCallback(() => {
      const value = contentRef.current;
      if (!value.trim()) return;
      onExplainRef.current?.(value);
    }, []);

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
                variant="ghost"
                size="xs"
                onClick={handleFormat}
                disabled={isLoading || !hasContent}
                title="Format SQL"
              >
                <Paintbrush className="size-3" />
              </Button>
              {onExplain && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleExplain}
                  disabled={isLoading || !hasContent}
                  title="Explain Plan"
                >
                  <Zap className="size-3" />
                </Button>
              )}
              <Button
                variant="default"
                size="xs"
                onClick={handleRun}
                disabled={isLoading || !hasContent}
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

        {/* Editor area — direct EditorView, no @uiw/react-codemirror wrapper */}
        <div
          ref={containerRef}
          style={{ height }}
          className="min-h-0 overflow-hidden"
        />

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
