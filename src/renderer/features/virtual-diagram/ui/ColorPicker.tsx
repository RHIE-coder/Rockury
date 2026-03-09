import { X } from 'lucide-react';

interface ColorPickerProps {
  value?: string;
  onChange: (color: string | null) => void;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#ef4444', // red
  '#f97316', // orange
  '#a855f7', // purple
  '#14b8a6', // teal
  '#ec4899', // pink
  '#6b7280', // gray
  '#eab308', // yellow
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#f43f5e', // rose
];

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`size-5 rounded-full border-2 transition-transform hover:scale-110 ${
            value === color ? 'border-foreground scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex size-5 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
          title="Reset color"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
