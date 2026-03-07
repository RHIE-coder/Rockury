import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { search, openSearchPanel } from '@codemirror/search';
import { EditorView } from '@codemirror/view';
import { Search } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import type { TDbType } from '@/entities/connection';
import type { ITable } from '@/entities/table';
import { parseDdl } from '../lib/ddlParser';
import { schemaToDdl } from '../lib/schemaToDdl';

interface DdlEditorViewProps {
  tables?: ITable[];
  onParsed?: (tables: ITable[]) => void;
  onClose?: () => void;
  readOnly?: boolean;
  initialDbType?: TDbType;
  /** Table name to scroll to in the DDL editor */
  focusTableName?: string | null;
}

export function DdlEditorView({
  tables = [],
  onParsed,
  onClose,
  readOnly = false,
  initialDbType = 'mysql',
  focusTableName = null,
}: DdlEditorViewProps) {
  const [ddlContent, setDdlContent] = useState('');
  const [dbType, setDbType] = useState<TDbType>(initialDbType);
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  useEffect(() => {
    setDbType(initialDbType);
  }, [initialDbType]);

  // Auto-generate DDL in readOnly mode when tables change
  useEffect(() => {
    if (readOnly && tables.length > 0) {
      setDdlContent(schemaToDdl(tables, dbType));
    }
  }, [readOnly, tables, dbType]);

  // Auto-regenerate DDL for editable mode when tables change
  useEffect(() => {
    if (!readOnly && tables.length > 0) {
      setDdlContent(schemaToDdl(tables, dbType));
    }
  // Only regenerate when tables change, not on every content change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables, dbType]);

  function handleParse() {
    const parsed = parseDdl(ddlContent);
    onParsed?.(parsed);
  }

  function handleGenerate() {
    setDdlContent(schemaToDdl(tables, dbType));
  }

  // Scroll to a specific table's CREATE TABLE declaration
  useEffect(() => {
    if (!focusTableName || !ddlContent || !editorRef.current?.view) return;
    const view = editorRef.current.view;
    const q = dbType === 'postgresql' ? `"${focusTableName}"` : `\`${focusTableName}\``;
    const pattern = `CREATE TABLE ${q}`;
    const pos = ddlContent.indexOf(pattern);
    if (pos === -1) return;

    const line = view.state.doc.lineAt(pos);
    view.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 40 }),
    });
  }, [focusTableName, ddlContent, dbType]);

  const handleOpenSearch = useCallback(() => {
    if (!editorRef.current?.view) return;
    openSearchPanel(editorRef.current.view);
  }, []);

  const extensions = useMemo(() => [sql(), search()], []);

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden border-l border-border bg-background ddl-editor-shell">
      {/* Toolbar - shrink-0 prevents flex compression on scroll */}
      <div className="flex min-w-0 shrink-0 items-center gap-2 border-b border-border p-2">
        <h3 className="shrink-0 text-sm font-semibold">{readOnly ? 'DDL View' : 'DDL Editor'}</h3>
        <Select
          className="h-7 w-32 shrink-0 text-xs"
          value={dbType}
          onChange={(e) => setDbType(e.target.value as TDbType)}
        >
          <option value="mysql">MySQL</option>
          <option value="mariadb">MariaDB</option>
          <option value="postgresql">PostgreSQL</option>
        </Select>
        <div className="ml-auto flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={handleOpenSearch}
            title="Find (Ctrl+F)"
          >
            <Search className="size-3.5" />
          </Button>
          {!readOnly && (
            <>
              <Button
                variant="outline"
                size="xs"
                onClick={handleParse}
                disabled={!ddlContent.trim()}
                title="Apply DDL changes to diagram"
              >
                DDL → Diagram
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={handleGenerate}
                disabled={tables.length === 0}
                title="Regenerate DDL from current diagram"
              >
                Diagram → DDL
              </Button>
            </>
          )}
          {onClose && (
            <Button variant="ghost" size="xs" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 min-w-0 w-full flex-1 overflow-hidden">
        <CodeMirror
          ref={editorRef}
          value={ddlContent}
          height="100%"
          extensions={extensions}
          onChange={readOnly ? undefined : (value) => setDdlContent(value)}
          readOnly={readOnly}
          editable={!readOnly}
          className="h-full w-full"
          style={{ width: '100%' }}
          theme="dark"
        />
      </div>
    </div>
  );
}
