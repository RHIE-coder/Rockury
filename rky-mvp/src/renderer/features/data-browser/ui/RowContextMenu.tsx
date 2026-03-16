import { useEffect, useRef } from 'react';
import { Copy, ClipboardCopy, Plus, Trash2, CopyPlus } from 'lucide-react';

interface RowContextMenuProps {
  position: { x: number; y: number };
  canEdit: boolean;
  onClose: () => void;
  onCopyCell: () => void;
  onCopyRowJson: () => void;
  onInsertAbove?: () => void;
  onInsertBelow?: () => void;
  onDuplicateRow?: () => void;
  onDeleteRow?: () => void;
}

export function RowContextMenu({
  position,
  canEdit,
  onClose,
  onCopyCell,
  onCopyRowJson,
  onInsertAbove,
  onInsertBelow,
  onDuplicateRow,
  onDeleteRow,
}: RowContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const items = [
    { icon: Copy, label: 'Copy Cell Value', onClick: onCopyCell, show: true },
    { icon: ClipboardCopy, label: 'Copy Row as JSON', onClick: onCopyRowJson, show: true },
    { type: 'separator' as const, show: canEdit },
    { icon: Plus, label: 'Insert Row Above', onClick: onInsertAbove, show: canEdit },
    { icon: Plus, label: 'Insert Row Below', onClick: onInsertBelow, show: canEdit },
    { icon: CopyPlus, label: 'Duplicate Row', onClick: onDuplicateRow, show: canEdit },
    { type: 'separator' as const, show: canEdit },
    { icon: Trash2, label: 'Delete Row', onClick: onDeleteRow, show: canEdit, danger: true },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-lg"
      style={{ left: position.x, top: position.y }}
    >
      {items.filter((i) => i.show).map((item, idx) => {
        if ('type' in item && item.type === 'separator') {
          return <div key={idx} className="my-1 h-px bg-border" />;
        }
        const Icon = 'icon' in item ? item.icon : null;
        return (
          <button
            key={idx}
            type="button"
            className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent ${
              'danger' in item && item.danger ? 'text-destructive' : ''
            }`}
            onClick={() => {
              'onClick' in item && item.onClick?.();
              onClose();
            }}
          >
            {Icon && <Icon className="size-3.5" />}
            {'label' in item && <span>{item.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
