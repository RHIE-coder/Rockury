import { useState, useEffect, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { Filter } from 'lucide-react';
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
  // DDL include/exclude filter
  includedTableIds?: string[] | null;
  onIncludedTableIdsChange?: (ids: string[] | null) => void;
  allTables?: ITable[];
}

export function DdlEditorView({
  tables = [],
  onParsed,
  onClose,
  readOnly = false,
  includedTableIds = null,
  onIncludedTableIdsChange,
  allTables,
}: DdlEditorViewProps) {
  const [ddlContent, setDdlContent] = useState('');
  const [dbType, setDbType] = useState<TDbType>('mysql');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // The tables to generate DDL from (filtered if include list set)
  const filteredTables = useMemo(() => {
    if (!includedTableIds) return tables;
    const idSet = new Set(includedTableIds);
    return tables.filter((t) => idSet.has(t.id));
  }, [tables, includedTableIds]);

  // Auto-generate DDL in readOnly mode when tables change
  useEffect(() => {
    if (readOnly && filteredTables.length > 0) {
      setDdlContent(schemaToDdl(filteredTables, dbType));
    }
  }, [readOnly, filteredTables, dbType]);

  // Auto-regenerate DDL for editable mode when filter changes
  useEffect(() => {
    if (!readOnly && filteredTables.length > 0) {
      setDdlContent(schemaToDdl(filteredTables, dbType));
    }
  // Only regenerate when filter or tables change, not on every content change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTables, dbType]);

  function handleParse() {
    const parsed = parseDdl(ddlContent);
    onParsed?.(parsed);
  }

  function handleGenerate() {
    setDdlContent(schemaToDdl(filteredTables, dbType));
  }

  // Filter helpers
  const filterSourceTables = allTables ?? tables;
  const includedCount = includedTableIds ? includedTableIds.length : filterSourceTables.length;
  const totalCount = filterSourceTables.length;

  function handleToggleTable(tableId: string) {
    if (!onIncludedTableIdsChange) return;
    if (!includedTableIds) {
      // Was "all" → switch to all except this one
      const ids = filterSourceTables.filter((t) => t.id !== tableId).map((t) => t.id);
      onIncludedTableIdsChange(ids);
    } else if (includedTableIds.includes(tableId)) {
      const ids = includedTableIds.filter((id) => id !== tableId);
      onIncludedTableIdsChange(ids.length === 0 ? null : ids);
    } else {
      const ids = [...includedTableIds, tableId];
      // If all selected, go back to null
      onIncludedTableIdsChange(ids.length === filterSourceTables.length ? null : ids);
    }
  }

  function handleSelectAll() {
    onIncludedTableIdsChange?.(null);
  }

  function handleSelectNone() {
    onIncludedTableIdsChange?.([]);
  }

  function isTableIncluded(tableId: string) {
    if (!includedTableIds) return true;
    return includedTableIds.includes(tableId);
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
          {/* Filter toggle */}
          {onIncludedTableIdsChange && (
            <Button
              variant={isFilterOpen ? 'secondary' : 'ghost'}
              size="xs"
              onClick={() => setIsFilterOpen((v) => !v)}
              title="Filter tables"
            >
              <Filter className="size-3.5" />
              {includedCount}/{totalCount}
            </Button>
          )}
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

      {/* Filter Panel */}
      {isFilterOpen && onIncludedTableIdsChange && (
        <div className="border-b border-border bg-muted/30 p-2">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-medium">Include Tables</span>
            <div className="ml-auto flex gap-1">
              <Button variant="ghost" size="xs" onClick={handleSelectAll}>
                All
              </Button>
              <Button variant="ghost" size="xs" onClick={handleSelectNone}>
                None
              </Button>
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {filterSourceTables.map((table) => (
              <label
                key={table.id}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted"
              >
                <input
                  type="checkbox"
                  className="size-3"
                  checked={isTableIncluded(table.id)}
                  onChange={() => handleToggleTable(table.id)}
                />
                <span className="truncate">{table.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

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
