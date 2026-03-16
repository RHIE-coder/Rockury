import { useState, useRef, useEffect, useCallback } from 'react';

interface CellEditorProps {
  value: unknown;
  onSave: (value: unknown) => void;
  onCancel: () => void;
}

export function CellEditor({ value, onSave, onCancel }: CellEditorProps) {
  const [text, setText] = useState(value === null ? '' : String(value));
  const [isNull, setIsNull] = useState(value === null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = useCallback(() => {
    onSave(isNull ? null : text);
  }, [isNull, text, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') { handleSave(); }
      if (e.key === 'Escape') { onCancel(); }
    },
    [handleSave, onCancel],
  );

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        type="text"
        value={isNull ? '' : text}
        onChange={(e) => { setText(e.target.value); setIsNull(false); }}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        disabled={isNull}
        className={`w-full rounded border border-primary bg-background px-1 py-0.5 text-xs font-mono outline-none ${
          isNull ? 'italic text-muted-foreground' : ''
        }`}
        placeholder={isNull ? 'NULL' : ''}
      />
      <button
        type="button"
        onClick={() => { setIsNull((v) => !v); if (!isNull) setText(''); }}
        className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold ${
          isNull ? 'bg-muted-foreground/20 text-muted-foreground' : 'bg-muted text-muted-foreground/50'
        }`}
        title="Toggle NULL"
      >
        NULL
      </button>
    </div>
  );
}
