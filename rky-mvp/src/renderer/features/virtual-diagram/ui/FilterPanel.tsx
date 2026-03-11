import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { IDiagramFilter, TFilterPreset } from '~/shared/types/db';
import { FILTER_PRESETS } from '../model/diagramStore';

interface FilterPanelProps {
  filter: IDiagramFilter;
  onFilterChange: (partial: Partial<IDiagramFilter>) => void;
  onPresetChange: (preset: TFilterPreset) => void;
  onClose: () => void;
}

const FILTER_OPTIONS: { key: keyof Omit<IDiagramFilter, 'preset' | 'edgeOnDelete' | 'edgeOnUpdate'>; label: string }[] = [
  { key: 'showColumns', label: 'Columns' },
  { key: 'showDataTypes', label: 'Data Types' },
  { key: 'showKeyIcons', label: 'Key Icons' },
  { key: 'showNullable', label: 'Nullable' },
  { key: 'showDefaults', label: 'Default Values' },
  { key: 'showComments', label: 'Comments' },
  { key: 'showConstraints', label: 'Constraints' },
  { key: 'showEdgePolicies', label: 'Edge Policies (D/U)' },
  { key: 'showViews', label: 'Views' },
];

const EDGE_ACTIONS = ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'] as const;

const PRESETS: { key: TFilterPreset; label: string }[] = [
  { key: 'compact', label: 'Compact' },
  { key: 'full', label: 'Full' },
];

export function FilterPanel({ filter, onFilterChange, onPresetChange, onClose }: FilterPanelProps) {
  return (
    <div className="w-52 rounded-lg border border-border bg-popover shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <SlidersHorizontal className="size-3.5" />
          Filter
        </div>
        <Button variant="ghost" size="xs" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Presets */}
      <div className="border-b border-border p-2">
        <p className="mb-1.5 text-[10px] font-medium uppercase text-muted-foreground">Presets</p>
        <div className="flex gap-1">
          {PRESETS.map((preset) => (
            <Button
              key={preset.key}
              variant={filter.preset === preset.key ? 'secondary' : 'outline'}
              size="xs"
              onClick={() => onPresetChange(preset.key)}
              className="flex-1"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Individual toggles */}
      <div className="border-b border-border p-2">
        <p className="mb-1.5 text-[10px] font-medium uppercase text-muted-foreground">Display</p>
        <div className="space-y-1">
          {FILTER_OPTIONS.map((option) => (
            <label
              key={option.key}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-0.5 text-xs hover:bg-accent"
            >
              <input
                type="checkbox"
                checked={filter[option.key]}
                onChange={(e) => onFilterChange({ [option.key]: e.target.checked })}
                className="size-3.5 rounded border-border"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {/* Edge constraint filters */}
      <div className="p-2">
        <p className="mb-1.5 text-[10px] font-medium uppercase text-muted-foreground">Edge Constraints</p>
        <div className="space-y-2">
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground">ON DELETE</p>
            <div className="space-y-1">
              {EDGE_ACTIONS.map((action) => (
                <label
                  key={`del-${action}`}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-0.5 text-xs hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={filter.edgeOnDelete?.[action] ?? true}
                    onChange={(e) =>
                      onFilterChange({
                        edgeOnDelete: { ...filter.edgeOnDelete, [action]: e.target.checked },
                      })
                    }
                    className="size-3.5 rounded border-border"
                  />
                  {action}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground">ON UPDATE</p>
            <div className="space-y-1">
              {EDGE_ACTIONS.map((action) => (
                <label
                  key={`upd-${action}`}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-0.5 text-xs hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={filter.edgeOnUpdate?.[action] ?? true}
                    onChange={(e) =>
                      onFilterChange({
                        edgeOnUpdate: { ...filter.edgeOnUpdate, [action]: e.target.checked },
                      })
                    }
                    className="size-3.5 rounded border-border"
                  />
                  {action}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
