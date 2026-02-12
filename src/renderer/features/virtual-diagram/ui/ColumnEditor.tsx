import { useState } from 'react';
import { Input } from '@/shared/components/ui/input';
import type { IColumn, ITable, TKeyType } from '~/shared/types/db';

interface ColumnEditorProps {
  column: IColumn;
  allTables?: ITable[];
  onChange: (updated: IColumn) => void;
  onRemove: () => void;
  readOnly?: boolean;
}

const BADGE_COLORS: Record<TKeyType, string> = {
  PK: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  FK: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  UK: 'bg-green-500/20 text-green-700 dark:text-green-400',
  IDX: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
};

export function ColumnEditor({ column, allTables, onChange, onRemove, readOnly }: ColumnEditorProps) {
  const [isDeletingCol, setIsDeletingCol] = useState(false);

  // Defensive: legacy data may have keyType (singular) instead of keyTypes
  const keyTypes = Array.isArray(column.keyTypes) ? column.keyTypes : [];

  function updateField<K extends keyof IColumn>(key: K, value: IColumn[K]) {
    onChange({ ...column, [key]: value });
  }

  return (
    <div className="space-y-1.5 rounded border border-border p-1.5">
      {/* Row 1: Name + DataType + Delete */}
      <div className="flex items-center gap-1.5">
        <Input
          className="h-7 min-w-0 flex-1 text-xs"
          placeholder="Column name"
          value={column.name}
          onChange={(e) => updateField('name', e.target.value)}
          readOnly={readOnly}
        />
        <Input
          className="h-7 w-24 shrink-0 text-xs"
          placeholder="Data type"
          value={column.dataType}
          onChange={(e) => updateField('dataType', e.target.value)}
          readOnly={readOnly}
        />
        {!readOnly && (
          isDeletingCol ? (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={onRemove}
                className="text-[10px] font-medium text-destructive hover:underline"
              >
                Delete?
              </button>
              <button
                type="button"
                onClick={() => setIsDeletingCol(false)}
                className="text-[10px] text-muted-foreground hover:underline"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsDeletingCol(true)}
              className="shrink-0 text-xs text-destructive hover:underline"
            >
              X
            </button>
          )
        )}
      </div>

      {/* Row 2: Key badges (read-only, derived from constraints) */}
      <div className="flex items-center gap-1">
        {keyTypes.length > 0 ? (
          keyTypes.map((k) => (
            <span
              key={k}
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold leading-none ${BADGE_COLORS[k]}`}
            >
              {k}
            </span>
          ))
        ) : (
          <span className="text-[10px] text-muted-foreground">No keys</span>
        )}
      </div>

      {/* Row 3: Default + Null + AutoIncrement */}
      <div className="flex items-center gap-1.5">
        <Input
          className="h-7 min-w-0 flex-1 text-xs"
          placeholder="Default"
          value={column.defaultValue ?? ''}
          onChange={(e) => updateField('defaultValue', e.target.value || null)}
          readOnly={readOnly}
        />
        <label className="flex shrink-0 items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={column.nullable}
            onChange={(e) => updateField('nullable', e.target.checked)}
            className="size-3"
            disabled={readOnly || keyTypes.includes('PK')}
          />
          Null
        </label>
        {keyTypes.includes('PK') && (
          <label className="flex shrink-0 items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={column.isAutoIncrement ?? false}
              onChange={(e) => updateField('isAutoIncrement', e.target.checked)}
              className="size-3"
              disabled={readOnly}
            />
            AI
          </label>
        )}
      </div>

      {/* Row 4: Comment (textarea for multiline) */}
      <textarea
        className="w-full resize-none rounded-md border border-input bg-transparent px-2 py-1 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        placeholder="Comment"
        rows={2}
        value={column.comment}
        onChange={(e) => updateField('comment', e.target.value)}
        readOnly={readOnly}
      />

      {/* FK Reference (read-only display when FK key exists) */}
      {keyTypes.includes('FK') && column.reference && (
        <div className="rounded-md border-2 border-blue-400 bg-blue-50 p-2 dark:border-blue-500 dark:bg-blue-500/15">
          <p className="text-[10px] font-semibold text-foreground">
            FK &rarr; {column.reference.table}.{column.reference.column}
          </p>
          {(column.reference.onDelete || column.reference.onUpdate) && (
            <p className="mt-0.5 text-[9px] text-muted-foreground">
              {column.reference.onDelete && `ON DELETE ${column.reference.onDelete}`}
              {column.reference.onDelete && column.reference.onUpdate && ' | '}
              {column.reference.onUpdate && `ON UPDATE ${column.reference.onUpdate}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
