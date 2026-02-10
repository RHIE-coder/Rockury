import { Select } from '@/shared/components/ui/select';
import type { IForeignKeyRef, ITable } from '~/shared/types/db';

interface ForeignKeyEditorProps {
  reference: IForeignKeyRef | null;
  allTables: ITable[];
  onChange: (ref: IForeignKeyRef) => void;
}

const FK_ACTIONS = ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'] as const;

export function ForeignKeyEditor({ reference, allTables, onChange }: ForeignKeyEditorProps) {
  const ref: IForeignKeyRef = reference ?? { table: '', column: '' };

  const targetTable = allTables.find((t) => t.name === ref.table);
  // Only show PK/UK columns as valid FK targets
  const targetColumns = targetTable
    ? targetTable.columns.filter((c) => c.keyType === 'PK' || c.keyType === 'UK')
    : [];

  function handleTableChange(tableName: string) {
    const table = allTables.find((t) => t.name === tableName);
    const firstPk = table?.columns.find((c) => c.keyType === 'PK');
    onChange({ ...ref, table: tableName, column: firstPk?.name ?? '' });
  }

  function handleColumnChange(column: string) {
    onChange({ ...ref, column });
  }

  function handleActionChange(field: 'onDelete' | 'onUpdate', value: string) {
    onChange({ ...ref, [field]: value || undefined });
  }

  return (
    <div className="space-y-1.5 rounded border border-blue-200 bg-blue-50/50 p-2 dark:border-blue-900 dark:bg-blue-950/30">
      <p className="text-[10px] font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">
        Foreign Key Reference
      </p>
      <Select
        className="h-7 w-full text-xs"
        value={ref.table}
        onChange={(e) => handleTableChange(e.target.value)}
      >
        <option value="">Select table...</option>
        {allTables.map((t) => (
          <option key={t.id} value={t.name}>{t.name}</option>
        ))}
      </Select>
      <Select
        className="h-7 w-full text-xs"
        value={ref.column}
        onChange={(e) => handleColumnChange(e.target.value)}
        disabled={!ref.table}
      >
        <option value="">Select column...</option>
        {targetColumns.map((c) => (
          <option key={c.id} value={c.name}>
            {c.name} ({c.keyType})
          </option>
        ))}
        {/* Also show all columns if no PK/UK found */}
        {targetColumns.length === 0 && targetTable && targetTable.columns.map((c) => (
          <option key={c.id} value={c.name}>{c.name}</option>
        ))}
      </Select>
      <div className="flex gap-1.5">
        <div className="flex-1">
          <label className="text-[9px] text-muted-foreground">ON DELETE</label>
          <Select
            className="h-6 w-full text-[10px]"
            value={ref.onDelete ?? ''}
            onChange={(e) => handleActionChange('onDelete', e.target.value)}
          >
            <option value="">Default</option>
            {FK_ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
        </div>
        <div className="flex-1">
          <label className="text-[9px] text-muted-foreground">ON UPDATE</label>
          <Select
            className="h-6 w-full text-[10px]"
            value={ref.onUpdate ?? ''}
            onChange={(e) => handleActionChange('onUpdate', e.target.value)}
          >
            <option value="">Default</option>
            {FK_ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
