import { useState } from 'react';
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import type { IConstraint, IColumn, ITable, TConstraintType } from '~/shared/types/db';
import { ForeignKeyEditor } from './ForeignKeyEditor';
import { CompositeKeyBuilder } from './CompositeKeyBuilder';

interface ConstraintEditorProps {
  constraint: IConstraint;
  columns: IColumn[];
  allTables: ITable[];
  onChange: (updated: IConstraint) => void;
  onRemove: () => void;
}

const CONSTRAINT_TYPES: TConstraintType[] = ['PK', 'FK', 'UK', 'IDX', 'CHECK'];

function generateName(type: TConstraintType, tableName: string, cols: string[]): string {
  const prefix = type.toLowerCase();
  const colPart = cols.slice(0, 2).join('_') || 'unnamed';
  return `${prefix}_${tableName}_${colPart}`;
}

export function ConstraintEditor({
  constraint,
  columns,
  allTables,
  onChange,
  onRemove,
}: ConstraintEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  function handleTypeChange(type: string) {
    const t = type as TConstraintType;
    const updated: IConstraint = {
      ...constraint,
      type: t,
      reference: t === 'FK' ? constraint.reference ?? { table: '', column: '' } : undefined,
      checkExpression: t === 'CHECK' ? constraint.checkExpression ?? '' : undefined,
    };
    if (t !== 'FK') delete updated.reference;
    if (t !== 'CHECK') delete updated.checkExpression;
    onChange(updated);
  }

  function handleNameChange(name: string) {
    onChange({ ...constraint, name });
  }

  function handleColumnsChange(cols: string[]) {
    onChange({ ...constraint, columns: cols });
  }

  return (
    <div className="rounded border border-border p-2 text-xs">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-muted-foreground"
        >
          {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </button>
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
          {constraint.type}
        </span>
        <span className="flex-1 truncate font-medium">{constraint.name}</span>
        <span className="text-muted-foreground">{constraint.columns.join(', ')}</span>
        <Button variant="ghost" size="xs" onClick={onRemove}>
          <Trash2 className="size-3 text-destructive" />
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-2 space-y-2 pl-4">
          {/* Type */}
          <div className="flex gap-1.5">
            <Select
              className="h-6 w-24 text-[10px]"
              value={constraint.type}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              {CONSTRAINT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
            <Input
              className="h-6 flex-1 text-[10px]"
              placeholder="Constraint name"
              value={constraint.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>

          {/* Column selection */}
          {constraint.type !== 'CHECK' && (
            <CompositeKeyBuilder
              columns={columns}
              selectedColumns={constraint.columns}
              onChange={handleColumnsChange}
            />
          )}

          {/* FK Reference */}
          {constraint.type === 'FK' && (
            <ForeignKeyEditor
              reference={constraint.reference ?? null}
              allTables={allTables}
              onChange={(ref) => onChange({ ...constraint, reference: ref })}
            />
          )}

          {/* CHECK expression */}
          {constraint.type === 'CHECK' && (
            <div className="space-y-1">
              <label className="text-[9px] text-muted-foreground">CHECK Expression</label>
              <Input
                className="h-6 text-[10px]"
                placeholder="e.g. age > 0"
                value={constraint.checkExpression ?? ''}
                onChange={(e) => onChange({ ...constraint, checkExpression: e.target.value })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
