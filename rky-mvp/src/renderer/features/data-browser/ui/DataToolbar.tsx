import { RefreshCw, Plus, Trash2, Check, Undo2, Pencil } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface DataToolbarProps {
  tableName: string;
  isLoading: boolean;
  onRefresh: () => void;
  hasPk: boolean;
  // Edit mode
  editMode?: boolean;
  onToggleEditMode?: () => void;
  canEdit?: boolean;
  hasChanges?: boolean;
  changeCount?: number;
  onAddRow?: () => void;
  onDeleteSelectedRow?: () => void;
  onApply?: () => void;
  onDiscard?: () => void;
  exportSlot?: React.ReactNode;
  timezoneSlot?: React.ReactNode;
  columnsSlot?: React.ReactNode;
}

export function DataToolbar({
  tableName,
  isLoading,
  onRefresh,
  hasPk,
  editMode = false,
  onToggleEditMode,
  canEdit = false,
  hasChanges = false,
  changeCount = 0,
  onAddRow,
  onDeleteSelectedRow,
  onApply,
  onDiscard,
  exportSlot,
  timezoneSlot,
  columnsSlot,
}: DataToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
      <span className="text-xs font-semibold truncate max-w-[200px]">{tableName}</span>

      {!hasPk && (
        <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-500">
          Read-only (no PK)
        </span>
      )}

      <Button
        variant="ghost"
        size="xs"
        onClick={onRefresh}
        disabled={isLoading}
        title="Refresh"
      >
        <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
      </Button>

      {canEdit && (
        <>
          <div className="h-4 w-px bg-border" />
          <Button
            variant={editMode ? 'secondary' : 'ghost'}
            size="xs"
            onClick={onToggleEditMode}
            title={editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
          >
            <Pencil className={`size-3.5 ${editMode ? 'text-primary' : ''}`} />
            <span className={editMode ? 'text-primary' : ''}>Edit</span>
          </Button>
        </>
      )}

      {canEdit && editMode && (
        <>
          <div className="h-4 w-px bg-border" />
          <Button variant="ghost" size="xs" onClick={onAddRow} title="Add Row">
            <Plus className="size-3.5" />
          </Button>
          <Button variant="ghost" size="xs" onClick={onDeleteSelectedRow} title="Delete Row" disabled={!hasChanges}>
            <Trash2 className="size-3.5" />
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button
            variant={hasChanges ? 'default' : 'ghost'}
            size="xs"
            onClick={onApply}
            disabled={!hasChanges || isLoading}
            title="Apply Changes"
          >
            <Check className="size-3.5" />
            {hasChanges && <span>{changeCount}</span>}
          </Button>
          <Button variant="ghost" size="xs" onClick={onDiscard} disabled={!hasChanges} title="Discard">
            <Undo2 className="size-3.5" />
          </Button>
        </>
      )}

      <div className="flex-1" />

      {timezoneSlot}
      {exportSlot}
      {columnsSlot}
    </div>
  );
}
