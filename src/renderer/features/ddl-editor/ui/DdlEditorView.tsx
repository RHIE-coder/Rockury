import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import type { TDbType } from '@/entities/connection';
import type { ITable } from '@/entities/table';
import { ddlApi } from '../api/ddlApi';
import { parseDdl } from '../lib/ddlParser';
import { schemaToDdl } from '../lib/schemaToDdl';

interface DdlEditorViewProps {
  tables?: ITable[];
  onParsed?: (tables: ITable[]) => void;
  onClose?: () => void;
}

export function DdlEditorView({ tables = [], onParsed, onClose }: DdlEditorViewProps) {
  const [ddlContent, setDdlContent] = useState('');
  const [dbType, setDbType] = useState<TDbType>('mysql');

  const parseMutation = useMutation({
    mutationFn: () => ddlApi.parse({ ddl: ddlContent, dbType }),
    onSuccess: (result) => {
      if (result.success) {
        onParsed?.(result.data);
      }
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => ddlApi.generate({ tables, dbType }),
    onSuccess: (result) => {
      if (result.success) {
        setDdlContent(result.data.ddl);
      }
    },
  });

  function handleLocalParse() {
    const parsed = parseDdl(ddlContent);
    onParsed?.(parsed);
  }

  function handleLocalGenerate() {
    const generated = schemaToDdl(tables, dbType);
    setDdlContent(generated);
  }

  function handleFormat() {
    // Simple formatting: normalize whitespace
    setDdlContent((prev) =>
      prev
        .replace(/\n{3,}/g, '\n\n')
        .replace(/;\s*(?=CREATE)/gi, ';\n\n')
        .trim(),
    );
  }

  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border p-2">
        <h3 className="text-sm font-semibold">DDL Editor</h3>
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
          <Button
            variant="outline"
            size="xs"
            onClick={() => parseMutation.mutate()}
            disabled={parseMutation.isPending || !ddlContent.trim()}
            title="Parse DDL via IPC"
          >
            Parse (IPC)
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={handleLocalParse}
            disabled={!ddlContent.trim()}
            title="Parse DDL locally"
          >
            Parse
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || tables.length === 0}
            title="Generate DDL via IPC"
          >
            Generate (IPC)
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={handleLocalGenerate}
            disabled={tables.length === 0}
            title="Generate DDL locally"
          >
            Generate
          </Button>
          <Button variant="outline" size="xs" onClick={handleFormat}>
            Format
          </Button>
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
          onChange={(value) => setDdlContent(value)}
          className="h-full"
          theme="dark"
        />
      </div>
    </div>
  );
}
