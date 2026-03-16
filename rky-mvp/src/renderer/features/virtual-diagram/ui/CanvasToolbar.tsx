import { Plus, Workflow, Search, SlidersHorizontal, Download, Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface CanvasToolbarProps {
  onAddTable?: () => void;
  onAutoLayout?: () => void;
  onToggleSearch?: () => void;
  isSearchOpen?: boolean;
  onToggleFilter?: () => void;
  isFilterOpen?: boolean;
  onToggleExport?: () => void;
  isExportOpen?: boolean;
  disabled?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function CanvasToolbar({
  onAddTable,
  onAutoLayout,
  onToggleSearch,
  isSearchOpen = false,
  onToggleFilter,
  isFilterOpen = false,
  onToggleExport,
  isExportOpen = false,
  disabled = false,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: CanvasToolbarProps) {
  return (
    <div className="absolute right-2 top-2 z-40 flex items-center gap-1 rounded-lg border border-border bg-background/90 px-2 py-1 shadow-sm backdrop-blur-sm">
      {onUndo && (
        <Button variant="ghost" size="xs" onClick={onUndo} disabled={!canUndo} title="Undo (Cmd+Z)">
          <Undo2 className="size-3.5" />
        </Button>
      )}
      {onRedo && (
        <Button variant="ghost" size="xs" onClick={onRedo} disabled={!canRedo} title="Redo (Cmd+Shift+Z)">
          <Redo2 className="size-3.5" />
        </Button>
      )}
      {(onUndo || onRedo) && onAddTable && (
        <div className="mx-0.5 h-4 w-px bg-border" />
      )}
      {onAddTable && (
        <Button variant="ghost" size="xs" onClick={onAddTable} disabled={disabled} title="Add table">
          <Plus className="size-3.5" />
          Table
        </Button>
      )}
      {onAutoLayout && (
        <Button variant="ghost" size="xs" onClick={onAutoLayout} title="Auto Layout (dagre)">
          <Workflow className="size-3.5" />
        </Button>
      )}
      {onToggleSearch && (
        <Button
          variant={isSearchOpen ? 'secondary' : 'ghost'}
          size="xs"
          onClick={onToggleSearch}
          title="Search (Cmd+F)"
        >
          <Search className="size-3.5" />
        </Button>
      )}
      {onToggleFilter && (
        <Button
          variant={isFilterOpen ? 'secondary' : 'ghost'}
          size="xs"
          onClick={onToggleFilter}
          title="Filter"
        >
          <SlidersHorizontal className="size-3.5" />
        </Button>
      )}
      {onToggleExport && (
        <Button
          variant={isExportOpen ? 'secondary' : 'ghost'}
          size="xs"
          onClick={onToggleExport}
          title="Export"
        >
          <Download className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
