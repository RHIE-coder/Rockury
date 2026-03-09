import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import type { IConstraint, IColumn, ITable, TConstraintType } from '~/shared/types/db';
import { ForeignKeyEditor } from './ForeignKeyEditor';
import { CompositeKeyBuilder } from './CompositeKeyBuilder';

interface AddConstraintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: IColumn[];
  allTables: ITable[];
  tableName: string;
  onSave: (constraint: IConstraint) => void;
  editingConstraint?: IConstraint | null;
}

const CONSTRAINT_TYPES: TConstraintType[] = ['PK', 'FK', 'UK', 'IDX', 'CHECK'];

function generateName(type: TConstraintType, tableName: string): string {
  const prefix = type.toLowerCase();
  return `${prefix}_${tableName}_${Date.now()}`;
}

export function AddConstraintModal({
  open,
  onOpenChange,
  columns,
  allTables,
  tableName,
  onSave,
  editingConstraint,
}: AddConstraintModalProps) {
  const [type, setType] = useState<TConstraintType>('UK');
  const [name, setName] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [reference, setReference] = useState({ table: '', column: '' });
  const [checkExpression, setCheckExpression] = useState('');

  // Reset form when modal opens or editingConstraint changes
  useEffect(() => {
    if (!open) return;
    if (editingConstraint) {
      setType(editingConstraint.type);
      setName(editingConstraint.name);
      setSelectedColumns([...editingConstraint.columns]);
      setReference(editingConstraint.reference ?? { table: '', column: '' });
      setCheckExpression(editingConstraint.checkExpression ?? '');
    } else {
      const initialType: TConstraintType = 'UK';
      setType(initialType);
      setName(generateName(initialType, tableName));
      setSelectedColumns([]);
      setReference({ table: '', column: '' });
      setCheckExpression('');
    }
  }, [open, editingConstraint, tableName]);

  function handleTypeChange(newType: TConstraintType) {
    setType(newType);
    // Auto-regenerate name when type changes (only for new constraints)
    if (!editingConstraint) {
      setName(generateName(newType, tableName));
    }
  }

  const canSave = useMemo(() => {
    if (!name.trim()) return false;
    if (type === 'CHECK') return checkExpression.trim().length > 0;
    if (selectedColumns.length === 0) return false;
    if (type === 'FK' && !reference.table) return false;
    return true;
  }, [name, type, selectedColumns, reference, checkExpression]);

  function handleSave() {
    if (!canSave) return;
    const constraint: IConstraint = {
      type,
      name: name.trim(),
      columns: type === 'CHECK' ? [] : selectedColumns,
    };
    if (type === 'FK') {
      constraint.reference = { ...reference };
    }
    if (type === 'CHECK') {
      constraint.checkExpression = checkExpression;
    }
    onSave(constraint);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {editingConstraint ? 'Edit Constraint' : 'Add Constraint'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {editingConstraint
              ? 'Modify the constraint settings below.'
              : 'Configure the new constraint before adding it.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Type + Name */}
          <div className="flex gap-2">
            <div className="w-24 shrink-0 space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Type
              </label>
              <Select
                className="h-8 text-xs"
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as TConstraintType)}
              >
                {CONSTRAINT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Name
              </label>
              <Input
                className="h-8 text-xs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Constraint name"
              />
            </div>
          </div>

          {/* Column Selection (not for CHECK) */}
          {type !== 'CHECK' && (
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Columns
              </label>
              <div className="max-h-48 overflow-y-auto rounded border border-border p-2">
                <CompositeKeyBuilder
                  columns={columns}
                  selectedColumns={selectedColumns}
                  onChange={setSelectedColumns}
                />
              </div>
            </div>
          )}

          {/* FK Reference */}
          {type === 'FK' && (
            <ForeignKeyEditor
              reference={reference}
              allTables={allTables}
              onChange={setReference}
            />
          )}

          {/* CHECK Expression */}
          {type === 'CHECK' && (
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Check Expression
              </label>
              <Input
                className="h-8 text-xs"
                placeholder="e.g. age > 0"
                value={checkExpression}
                onChange={(e) => setCheckExpression(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={!canSave} onClick={handleSave}>
            {editingConstraint ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
