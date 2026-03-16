import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Lock, LockOpen } from 'lucide-react';
import type { ITable, IColumn, IDiagramFilter } from '~/shared/types/db';
import type { TSimulationNodeRole } from '../lib/schemaToNodes';
import type { TSimulationType } from '../lib/cascadeTraversal';
import type { TDiffAction } from '../lib/compareVersions';

export interface TableNodeData {
  table: ITable;
  label: string;
  filter: IDiagramFilter;
  isHighlighted: boolean;
  isSelected: boolean;
  onTableUpdate?: (table: ITable) => void;
  color?: string;
  isLocked?: boolean;
  onLockToggle?: (id: string) => void;
  simulationRole?: TSimulationNodeRole;
  simulationDepth?: number;
  simulationType?: TSimulationType | null;
  compareAction?: TDiffAction;
}

function SingleKeyIcon({ keyType }: { keyType: string }) {
  switch (keyType) {
    case 'PK':
      return <span className="shrink-0 text-amber-500" title="Primary Key">🔑</span>;
    case 'FK':
      return <span className="shrink-0 text-blue-500" title="Foreign Key">🔗</span>;
    case 'UK':
      return <span className="shrink-0 rounded bg-green-500/20 px-0.5 text-[8px] font-bold leading-none text-green-600 dark:text-green-400" title="Unique">U</span>;
    case 'IDX':
      return <span className="shrink-0 text-purple-500" title="Index">⚡</span>;
    default:
      return null;
  }
}

function ColumnBadges({ column }: { column: IColumn }) {
  const hasCheck = column.constraints.some((c) => c.type === 'CHECK');
  if (!hasCheck && !column.isGenerated) return null;
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {hasCheck && (
        <span className="rounded bg-orange-500/20 px-1 py-0.5 text-[8px] font-bold leading-none text-orange-600 dark:text-orange-400" title="Check Constraint">CK</span>
      )}
      {column.isGenerated && (
        <span className="rounded bg-cyan-500/20 px-1 py-0.5 text-[8px] font-bold leading-none text-cyan-600 dark:text-cyan-400" title={`Generated: ${column.generationExpression ?? ''}`}>GEN</span>
      )}
    </span>
  );
}

function KeyIcons({ keyTypes }: { keyTypes: string[] }) {
  return (
    <span className="inline-flex w-8 shrink-0 items-center">
      {keyTypes?.map((kt) => (
        <SingleKeyIcon key={kt} keyType={kt} />
      ))}
    </span>
  );
}

/** Shorten long data type strings like enum('a','b','c') → ENUM */
function shortenDataType(dataType: string): { short: string; full: string } {
  const lower = dataType.toLowerCase();
  if (lower.startsWith('enum(')) return { short: 'ENUM', full: dataType };
  if (lower.startsWith('set(')) return { short: 'SET', full: dataType };
  return { short: dataType, full: dataType };
}

function NullableIcon({ nullable }: { nullable: boolean }) {
  return nullable
    ? <span className="shrink-0 text-muted-foreground" title="Nullable">◇</span>
    : <span className="shrink-0 text-foreground" title="NOT NULL">◆</span>;
}

function getSimulationClasses(role: TSimulationNodeRole, simType: TSimulationType | null | undefined): string {
  switch (role) {
    case 'source':
      return simType === 'DELETE'
        ? 'border-red-500 ring-2 ring-red-500/40 cascade-pulse'
        : 'border-teal-500 ring-2 ring-teal-500/40 cascade-pulse';
    case 'cascade':
      return 'border-orange-500 ring-2 ring-orange-500/40 cascade-pulse';
    case 'setNull':
      return 'border-yellow-400 ring-2 ring-yellow-400/40';
    case 'blocked':
      return 'border-red-600 ring-2 ring-red-600/40 cascade-blocked-bg';
    case 'unaffected':
      return 'opacity-25';
    default:
      return '';
  }
}

function getSimulationCssVars(role: TSimulationNodeRole, simType: TSimulationType | null | undefined, depth: number): React.CSSProperties {
  const vars: React.CSSProperties = {};
  if (role === 'source' || role === 'cascade') {
    (vars as Record<string, string>)['--cascade-pulse-delay'] = `${depth * 150}ms`;
    if (role === 'source') {
      (vars as Record<string, string>)['--cascade-pulse-color'] = simType === 'DELETE'
        ? 'rgba(239, 68, 68, 0.4)' : 'rgba(20, 184, 166, 0.4)';
    } else {
      (vars as Record<string, string>)['--cascade-pulse-color'] = 'rgba(249, 115, 22, 0.4)';
    }
  }
  return vars;
}

function getCompareClasses(action: TDiffAction): string {
  switch (action) {
    case 'added':
      return 'border-2 border-green-500 ring-4 ring-green-500/30 shadow-[0_0_12px_rgba(34,197,94,0.4)]';
    case 'removed':
      return 'border-2 border-red-500 ring-4 ring-red-500/30 border-dashed opacity-60 shadow-[0_0_12px_rgba(239,68,68,0.4)]';
    case 'modified':
      return 'border-2 border-yellow-500 ring-4 ring-yellow-500/30 shadow-[0_0_12px_rgba(234,179,8,0.4)]';
    case 'unchanged':
      return 'opacity-20';
    default:
      return '';
  }
}

const COMPARE_HEADER_BG: Record<TDiffAction, string> = {
  added: 'bg-green-600',
  removed: 'bg-red-600',
  modified: 'bg-yellow-600',
  unchanged: '',
};

const COMPARE_BADGE: Record<TDiffAction, string> = {
  added: '+ ADDED',
  removed: '- REMOVED',
  modified: '~ MODIFIED',
  unchanged: '',
};

function TableNodeComponent({ data }: NodeProps) {
  const { table, filter, isHighlighted, isSelected, onTableUpdate, color, isLocked, onLockToggle, simulationRole, simulationDepth = 0, simulationType, compareAction } = data as unknown as TableNodeData;
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

  const simClasses = simulationRole ? getSimulationClasses(simulationRole, simulationType) : '';
  const simVars = simulationRole ? getSimulationCssVars(simulationRole, simulationType, simulationDepth) : {};

  const compareClasses = compareAction ? getCompareClasses(compareAction) : '';

  const borderClasses = compareAction
    ? compareClasses
    : simulationRole
      ? simClasses
      : isSelected
        ? 'border-primary ring-2 ring-primary/30'
        : isHighlighted
          ? 'ring-2 ring-yellow-400/50 border-yellow-400'
          : 'border-border';

  const isView = table.isView ?? false;
  const isMaterialized = table.isMaterialized ?? false;
  const isPartition = table.isPartition ?? false;

  return (
    <div
      className={`min-w-[200px] rounded-lg border bg-card shadow-sm transition-all duration-300 ${borderClasses} ${isView ? 'border-dashed' : ''} ${isPartition ? 'border-dashed' : ''}`}
      style={simVars}
    >
      {/* Target handle for incoming FK edges */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-1.5 !rounded-sm !border-none !bg-blue-500"
      />

      {/* Header */}
      <div
        className={`rounded-t-lg px-3 py-1.5 ${
          isView
            ? isMaterialized
              ? 'bg-teal-600 text-white'
              : 'bg-indigo-600 text-white'
            : isPartition
              ? 'bg-orange-600 text-white'
              : compareAction && compareAction !== 'unchanged' && COMPARE_HEADER_BG[compareAction]
                ? `${COMPARE_HEADER_BG[compareAction]} text-white`
                : color ? '' : 'bg-primary text-primary-foreground'
        }`}
        style={!isView && !isPartition && (!compareAction || compareAction === 'unchanged') ? (color ? { backgroundColor: color, color: '#fff' } : undefined) : undefined}
        onDoubleClick={handleHeaderDoubleClick}
      >
        <div className="flex items-center gap-1">
          <div className="flex-1 min-w-0">
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
              <p className="text-sm font-semibold truncate" title={table.name}>{table.name}</p>
            )}
          </div>
          {isView && (
            <span className="shrink-0 rounded bg-white/20 px-1 py-0.5 text-[8px] font-bold leading-none tracking-wider">
              {isMaterialized ? 'MVIEW' : 'VIEW'}
            </span>
          )}
          {isPartition && (
            <span className="shrink-0 rounded bg-white/20 px-1 py-0.5 text-[8px] font-bold leading-none tracking-wider">
              PARTITION
            </span>
          )}
          {compareAction && compareAction !== 'unchanged' && (
            <span className="shrink-0 rounded bg-white/20 px-1 py-0.5 text-[8px] font-bold leading-none tracking-wider">
              {COMPARE_BADGE[compareAction]}
            </span>
          )}
          {onLockToggle && (
            <button
              type="button"
              className="nodrag shrink-0 rounded p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                onLockToggle(table.id);
              }}
              title={isLocked ? 'Unlock position' : 'Lock position'}
            >
              {isLocked ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-red-500/80">
                  <Lock className="size-3 text-white" />
                </span>
              ) : (
                <LockOpen className="size-3 opacity-40" />
              )}
            </button>
          )}
        </div>
        {filter.showComments && (
          <p className="truncate text-xs opacity-75" title={table.comment || '(no comment)'}>
            {table.comment || '(no comment)'}
          </p>
        )}
        {isPartition && table.parentTableName && (
          <p className="truncate text-[10px] opacity-75">
            ↑ {table.parentTableName}
          </p>
        )}
      </div>

      {/* Columns */}
      {filter.showColumns && table.columns.length > 0 && (
        <div className="divide-y divide-border/50">
          {table.columns.map((column) => (
            <div
              key={column.id}
              className="group/row relative flex items-center gap-1 px-2 py-0.5 text-xs"
            >
              {filter.showKeyIcons && <KeyIcons keyTypes={column.keyTypes} />}
              {filter.showNullable && <NullableIcon nullable={column.nullable} />}
              <span className="flex-1 truncate font-medium" title={column.name}>{column.name}</span>
              {filter.showKeyIcons && <ColumnBadges column={column} />}
              {filter.showDataTypes && (() => {
                const { short, full } = shortenDataType(column.dataType);
                return (
                  <span className="shrink-0 text-muted-foreground" title={short !== full ? full : undefined}>{short}</span>
                );
              })()}
              {filter.showDefaults && column.defaultValue != null && (
                <span className="shrink-0 max-w-[80px] truncate text-[10px] text-emerald-600 dark:text-emerald-400" title={`DEFAULT ${column.defaultValue}`}>
                  ={column.defaultValue}
                </span>
              )}
              {filter.showComments && column.comment && (
                <span className="max-w-[60px] shrink-0 truncate text-[10px] text-muted-foreground" title={column.comment}>
                  {column.comment}
                </span>
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
              {/* Hover expansion card */}
              <div className="pointer-events-none invisible absolute left-0 top-0 z-50 min-w-full rounded border border-border bg-popover px-2 py-1 shadow-lg group-hover/row:visible">
                <div className="flex items-center gap-1 text-xs">
                  {filter.showKeyIcons && <KeyIcons keyTypes={column.keyTypes} />}
                  {filter.showNullable && <NullableIcon nullable={column.nullable} />}
                  <span className="whitespace-nowrap font-medium">{column.name}</span>
                  {filter.showDataTypes && (
                    <span className="whitespace-nowrap text-muted-foreground">{column.dataType}</span>
                  )}
                </div>
                {filter.showComments && column.comment && (
                  <p className="mt-0.5 max-w-[250px] whitespace-normal text-[10px] text-muted-foreground">{column.comment}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Constraints */}
      {filter.showConstraints && table.constraints.length > 0 && (
        <div className="border-t border-border/50 px-2 py-1 text-xs text-muted-foreground space-y-0.5">
          {table.constraints.map((c) => {
            const badge = c.type === 'PRIMARY KEY' ? 'PK'
              : c.type === 'FOREIGN KEY' ? 'FK'
              : c.type === 'UNIQUE' ? 'UQ'
              : c.type;
            const badgeColor = c.type === 'PRIMARY KEY' ? 'bg-amber-500/20 text-amber-700'
              : c.type === 'FOREIGN KEY' ? 'bg-blue-500/20 text-blue-700'
              : c.type === 'UNIQUE' ? 'bg-green-500/20 text-green-700'
              : 'bg-muted text-muted-foreground';
            return (
              <div key={c.name} className="flex items-center gap-1">
                <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold leading-none ${badgeColor}`}>
                  {badge}
                </span>
                <span className="truncate font-medium">{c.name}</span>
                <span className="shrink-0 text-muted-foreground">({c.columns.join(', ')})</span>
              </div>
            );
          })}
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
