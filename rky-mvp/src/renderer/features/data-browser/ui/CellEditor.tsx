import { useState, useRef, useEffect, useCallback } from 'react';
import { generateUuid } from '../lib/uuid';

interface CellEditorProps {
  value: unknown;
  onSave: (value: unknown) => void;
  onCancel: () => void;
  extraAction?: React.ReactNode;
}

export function CellEditor({ value, onSave, onCancel, extraAction }: CellEditorProps) {
  const [text, setText] = useState(value === null ? '' : String(value));
  const [isNull, setIsNull] = useState(value === null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onSave(isNull ? null : text);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isNull, text, onSave]);

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
    <div ref={containerRef} className="absolute left-0 top-0 z-20 flex w-max min-w-full flex-col gap-1 rounded border border-primary bg-background p-1 shadow-lg">
      <input
        ref={inputRef}
        type="text"
        value={isNull ? '' : text}
        onChange={(e) => { setText(e.target.value); setIsNull(false); }}
        onKeyDown={handleKeyDown}
        disabled={isNull}
        className={`min-w-[200px] w-full rounded border border-border bg-background px-1.5 py-1 text-xs font-mono outline-none focus:border-primary ${
          isNull ? 'italic text-muted-foreground' : ''
        }`}
        placeholder={isNull ? 'NULL' : ''}
      />
      <div className="flex items-center gap-1">
        {extraAction}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { setText(generateUuid()); setIsNull(false); }}
          className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground/50 hover:text-muted-foreground"
          title="Generate UUID"
        >
          UUID
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { setIsNull((v) => !v); if (!isNull) setText(''); }}
          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${
            isNull ? 'bg-muted-foreground/20 text-muted-foreground' : 'bg-muted text-muted-foreground/50'
          }`}
          title="Toggle NULL"
        >
          NULL
        </button>
      </div>
    </div>
  );
}
