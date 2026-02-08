import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import type { IColumn, TKeyType } from '@/entities/table';

interface ColumnEditorProps {
  column: IColumn;
  onChange: (updated: IColumn) => void;
  onRemove: () => void;
}

export function ColumnEditor({ column, onChange, onRemove }: ColumnEditorProps) {
  function updateField<K extends keyof IColumn>(key: K, value: IColumn[K]) {
    onChange({ ...column, [key]: value });
  }

  return (
    <div className="flex items-center gap-1.5 rounded border border-border p-1.5">
      <Input
        className="h-7 w-28 text-xs"
        placeholder="Column name"
        value={column.name}
        onChange={(e) => updateField('name', e.target.value)}
      />
      <Input
        className="h-7 w-24 text-xs"
        placeholder="Data type"
        value={column.dataType}
        onChange={(e) => updateField('dataType', e.target.value)}
      />
      <Select
        className="h-7 w-20 text-xs"
        value={column.keyType ?? ''}
        onChange={(e) => updateField('keyType', (e.target.value || null) as TKeyType | null)}
      >
        <option value="">None</option>
        <option value="PK">PK</option>
        <option value="FK">FK</option>
        <option value="UK">UK</option>
        <option value="IDX">IDX</option>
      </Select>
      <Input
        className="h-7 w-20 text-xs"
        placeholder="Default"
        value={column.defaultValue ?? ''}
        onChange={(e) => updateField('defaultValue', e.target.value || null)}
      />
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={column.nullable}
          onChange={(e) => updateField('nullable', e.target.checked)}
          className="size-3"
        />
        Null
      </label>
      <Input
        className="h-7 w-24 text-xs"
        placeholder="Comment"
        value={column.comment}
        onChange={(e) => updateField('comment', e.target.value)}
      />
      <button
        type="button"
        onClick={onRemove}
        className="ml-auto text-xs text-destructive hover:underline"
      >
        X
      </button>
    </div>
  );
}
