import { Link2 } from 'lucide-react';
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
    ? targetTable.columns.filter((c) => c.keyTypes?.includes('PK') || c.keyTypes?.includes('UK'))
    : [];

  function handleTableChange(tableName: string) {
    const table = allTables.find((t) => t.name === tableName);
    const firstPk = table?.columns.find((c) => c.keyTypes?.includes('PK'));
    onChange({ ...ref, table: tableName, column: firstPk?.name ?? '' });
  }

  function handleColumnChange(column: string) {
    onChange({ ...ref, column });
  }

  function handleActionChange(field: 'onDelete' | 'onUpdate', value: string) {
    onChange({ ...ref, [field]: value || undefined });
  }

  return (
    <div className="space-y-2 rounded-md border-2 border-blue-400 bg-blue-50 p-2.5 dark:border-blue-500 dark:bg-blue-500/15">
      <div className="flex items-center gap-1.5">
        <Link2 className="size-3.5 text-blue-600 dark:text-blue-300" />
        <p className="text-[11px] font-semibold text-foreground">
          FK Reference
        </p>
      </div>
      <div className="space-y-1.5">
        <div>
          <label className="mb-0.5 block text-[10px] font-semibold text-foreground">Table</label>
          <Select
            className="h-7 w-full border-blue-300 text-xs dark:border-blue-600"
            value={ref.table}
            onChange={(e) => handleTableChange(e.target.value)}
          >
            <option value="">Select table...</option>
            {allTables.map((t) => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-semibold text-foreground">Column</label>
          <Select
            className="h-7 w-full border-blue-300 text-xs dark:border-blue-600"
            value={ref.column}
            onChange={(e) => handleColumnChange(e.target.value)}
            disabled={!ref.table}
          >
            <option value="">Select column...</option>
            {targetColumns.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name} ({c.keyTypes?.join(',') || '-'})
              </option>
            ))}
            {/* Also show all columns if no PK/UK found */}
            {targetColumns.length === 0 && targetTable && targetTable.columns.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex gap-1.5">
        <div className="flex-1">
          <label className="mb-0.5 block text-[10px] font-semibold text-foreground">ON DELETE</label>
          <Select
            className="h-6 w-full border-blue-300 text-[10px] dark:border-blue-600"
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
          <label className="mb-0.5 block text-[10px] font-semibold text-foreground">ON UPDATE</label>
          <Select
            className="h-6 w-full border-blue-300 text-[10px] dark:border-blue-600"
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
