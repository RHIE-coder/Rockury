import { X, Plus, Minus, Pencil, Equal } from 'lucide-react';
import type { ICompareResult } from '../lib/compareVersions';

interface CompareInfoPanelProps {
  compareResult: ICompareResult;
  targetVersionName: string;
  onClose: () => void;
}

export function CompareInfoPanel({ compareResult, targetVersionName, onClose }: CompareInfoPanelProps) {
  let added = 0;
  let removed = 0;
  let modified = 0;
  let unchanged = 0;

  for (const action of compareResult.actionMap.values()) {
    switch (action) {
      case 'added': added++; break;
      case 'modified': modified++; break;
      case 'unchanged': unchanged++; break;
    }
  }
  removed = compareResult.removedTables.length;

  return (
    <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-border bg-background/95 px-4 py-2.5 shadow-lg backdrop-blur">
      <div className="flex items-center gap-4">
        <span className="text-xs font-medium text-muted-foreground">
          vs <span className="text-foreground">{targetVersionName}</span>
        </span>

        <div className="h-4 w-px bg-border" />

        {added > 0 && (
          <div className="flex items-center gap-1">
            <Plus className="size-3 text-green-500" />
            <span className="text-xs font-semibold text-green-600 dark:text-green-400">{added} added</span>
          </div>
        )}
        {removed > 0 && (
          <div className="flex items-center gap-1">
            <Minus className="size-3 text-red-500" />
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">{removed} removed</span>
          </div>
        )}
        {modified > 0 && (
          <div className="flex items-center gap-1">
            <Pencil className="size-3 text-yellow-500" />
            <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">{modified} modified</span>
          </div>
        )}
        {unchanged > 0 && (
          <div className="flex items-center gap-1">
            <Equal className="size-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{unchanged} unchanged</span>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Exit compare"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
