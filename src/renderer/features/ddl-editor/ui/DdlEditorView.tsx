import { useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
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
}

export function DdlEditorView({ tables = [], onParsed, onClose, readOnly = false }: DdlEditorViewProps) {
  const [ddlContent, setDdlContent] = useState('');
  const [dbType, setDbType] = useState<TDbType>('mysql');

  // Auto-generate DDL in readOnly mode when tables change
  useEffect(() => {
    if (readOnly && tables.length > 0) {
      setDdlContent(schemaToDdl(tables, dbType));
    }
  }, [readOnly, tables, dbType]);

  function handleParse() {
    const parsed = parseDdl(ddlContent);
    onParsed?.(parsed);
  }

  function handleGenerate() {
    setDdlContent(schemaToDdl(tables, dbType));
  }

  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border p-2">
        <h3 className="text-sm font-semibold">{readOnly ? 'DDL View' : 'DDL Editor'}</h3>
        <Select
          className="h-7 w-32 text-xs"
          value={dbType}
          onChange={(e) => setDbType(e.target.value as TDbType)}
        >
          <option value="mysql">MySQL</option>
          <option value="mariadb">MariaDB</option>
          <option value="postgresql">PostgreSQL</option>
        </Select>
        <div className="ml-auto flex gap-1">
          {!readOnly && (
            <>
              <Button
                variant="outline"
                size="xs"
                onClick={handleParse}
                disabled={!ddlContent.trim()}
                title="Parse DDL to schema"
              >
                Parse
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={handleGenerate}
                disabled={tables.length === 0}
                title="Regenerate DDL from schema"
              >
                Generate
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

      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={ddlContent}
          height="100%"
          extensions={[sql()]}
          onChange={readOnly ? undefined : (value) => setDdlContent(value)}
          readOnly={readOnly}
          editable={!readOnly}
          className="h-full"
          theme="dark"
        />
      </div>
    </div>
  );
}
