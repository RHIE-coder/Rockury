import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ITable, IColumn, IDiagramFilter } from '~/shared/types/db';

export interface TableNodeData {
  table: ITable;
  label: string;
  filter: IDiagramFilter;
  isHighlighted: boolean;
  isSelected: boolean;
  onTableUpdate?: (table: ITable) => void;
}

function KeyIcon({ keyType }: { keyType: IColumn['keyType'] }) {
  switch (keyType) {
    case 'PK':
      return <span className="shrink-0 text-amber-500" title="Primary Key">🔑</span>;
    case 'FK':
      return <span className="shrink-0 text-blue-500" title="Foreign Key">🔗</span>;
    case 'UK':
      return <span className="shrink-0 text-green-500" title="Unique">🌐</span>;
    case 'IDX':
      return <span className="shrink-0 text-purple-500" title="Index">📇</span>;
    default:
      return <span className="inline-block w-4 shrink-0" />;
  }
}

function NullableIcon({ nullable }: { nullable: boolean }) {
  return nullable
    ? <span className="shrink-0 text-muted-foreground" title="Nullable">◇</span>
    : <span className="shrink-0 text-foreground" title="NOT NULL">◆</span>;
}

function TableNodeComponent({ data }: NodeProps) {
  const { table, filter, isHighlighted, isSelected, onTableUpdate } = data as unknown as TableNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(table.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleHeaderDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onTableUpdate) return;
    setEditName(table.name);
    setIsEditing(true);
  }, [onTableUpdate, table.name]);

  const handleNameSubmit = useCallback(() => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== table.name && onTableUpdate) {
      onTableUpdate({ ...table, name: trimmed });
    }
    setIsEditing(false);
  }, [editName, table, onTableUpdate]);

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleNameSubmit();
    if (e.key === 'Escape') setIsEditing(false);
  }, [handleNameSubmit]);

  const borderClasses = isSelected
    ? 'border-primary ring-2 ring-primary/30'
    : isHighlighted
      ? 'ring-2 ring-yellow-400/50 border-yellow-400'
      : 'border-border';

  return (
    <div className={`min-w-[200px] rounded-lg border bg-card shadow-sm ${borderClasses}`}>
      {/* Target handle for incoming FK edges */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-1.5 !rounded-sm !border-none !bg-blue-500"
      />

      {/* Header */}
      <div
        className="rounded-t-lg bg-primary px-3 py-1.5 text-primary-foreground"
        onDoubleClick={handleHeaderDoubleClick}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            className="nodrag w-full rounded bg-primary-foreground/20 px-1 text-sm font-semibold text-primary-foreground outline-none"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleNameKeyDown}
          />
        ) : (
          <p className="text-sm font-semibold">{table.name}</p>
        )}
        {filter.showComments && table.comment && (
          <p className="truncate text-xs opacity-75">{table.comment}</p>
        )}
      </div>

      {/* Columns */}
      {filter.showColumns && table.columns.length > 0 && (
        <div className="divide-y divide-border/50">
          {table.columns.map((column) => (
            <div
              key={column.id}
              className="relative flex items-center gap-1 px-2 py-0.5 text-xs"
            >
              {filter.showKeyIcons && <KeyIcon keyType={column.keyType} />}
              {filter.showNullable && <NullableIcon nullable={column.nullable} />}
              <span className="flex-1 truncate font-medium">{column.name}</span>
              {filter.showDataTypes && (
                <span className="shrink-0 text-muted-foreground">{column.dataType}</span>
              )}
              {/* FK source handle per column */}
              {column.reference && (
                <Handle
                  type="source"
                  position={Position.Right}
                  id={column.id}
                  className="!h-2 !w-2 !rounded-full !border-none !bg-blue-500"
                  style={{ top: 'auto', right: -4 }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Constraints */}
      {filter.showConstraints && table.constraints.length > 0 && (
        <div className="border-t border-border/50 px-2 py-1 text-xs text-muted-foreground">
          {table.constraints.map((c) => (
            <div key={c.name}>
              <span className="font-medium">{c.type}</span>: {c.columns.join(', ')}
            </div>
          ))}
        </div>
      )}

      {/* Fallback source handle when no FK columns (for general edge connections) */}
      {!table.columns.some((c) => c.reference) && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-3 !w-1.5 !rounded-sm !border-none !bg-blue-500"
        />
      )}
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
