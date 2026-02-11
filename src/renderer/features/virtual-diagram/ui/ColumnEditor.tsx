import { useState } from 'react';
import { Input } from '@/shared/components/ui/input';
import type { IColumn, ITable, TKeyType } from '~/shared/types/db';
import { ForeignKeyEditor } from './ForeignKeyEditor';

interface ColumnEditorProps {
  column: IColumn;
  allTables?: ITable[];
  onChange: (updated: IColumn) => void;
  onRemove: () => void;
  readOnly?: boolean;
}

const KEY_TYPES: TKeyType[] = ['PK', 'FK', 'UK', 'IDX'];

export function ColumnEditor({ column, allTables, onChange, onRemove, readOnly }: ColumnEditorProps) {
  const [isDeletingCol, setIsDeletingCol] = useState(false);

  // Defensive: legacy data may have keyType (singular) instead of keyTypes
  const keyTypes = Array.isArray(column.keyTypes) ? column.keyTypes : [];

  function updateField<K extends keyof IColumn>(key: K, value: IColumn[K]) {
    onChange({ ...column, [key]: value });
  }

  function handleKeyToggle(key: TKeyType, checked: boolean) {
    let newKeys = checked
      ? [...keyTypes, key]
      : keyTypes.filter((k) => k !== key);

    // Deduplicate
    newKeys = [...new Set(newKeys)];

    const updated: IColumn = { ...column, keyTypes: newKeys };

    // PK checked → nullable false
    if (key === 'PK' && checked) {
      updated.nullable = false;
    }

    // FK unchecked → clear reference
    if (key === 'FK' && !checked && column.reference) {
      updated.reference = null;
    }
    // FK checked → init reference
    if (key === 'FK' && checked && !column.reference) {
      updated.reference = { table: '', column: '' };
    }

    // Auto increment only valid with PK
    if (!newKeys.includes('PK')) {
      updated.isAutoIncrement = false;
    }

    onChange(updated);
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

      {/* Row 2: Key checkboxes */}
      <div className="flex items-center gap-2">
        {KEY_TYPES.map((k) => (
          <label key={k} className="flex items-center gap-0.5 text-xs">
            <input
              type="checkbox"
              checked={keyTypes.includes(k)}
              onChange={(e) => handleKeyToggle(k, e.target.checked)}
              className="size-3"
              disabled={readOnly}
            />
            {k}
          </label>
        ))}
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

      {/* FK Reference Editor */}
      {keyTypes.includes('FK') && allTables && (
        <ForeignKeyEditor
          reference={column.reference}
          allTables={allTables}
          onChange={(ref) => updateField('reference', ref)}
        />
      )}
    </div>
  );
}
