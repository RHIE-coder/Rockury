import { useState, useMemo, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import type { ITimezoneOption } from '../lib/timezone';

interface TimezoneSelectorProps {
  options: ITimezoneOption[];
  value: string;
  onChange: (tz: string) => void;
}

export function TimezoneSelector({ options, value, onChange }: TimezoneSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, search]);

  const selectedLabel = useMemo(() => {
    const opt = options.find((o) => o.value === value);
    return opt ? opt.value.split('/').pop()?.replace(/_/g, ' ') ?? value : value;
  }, [options, value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent"
      >
        <Globe className="size-3" />
        <span>{selectedLabel}</span>
        <ChevronDown className="size-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 flex w-72 flex-col rounded-md border border-border bg-popover shadow-lg">
          <div className="border-b border-border px-2 py-1.5">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search timezone..."
              className="w-full bg-transparent text-xs outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-2 py-3 text-center text-[10px] text-muted-foreground">No results</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full px-2 py-1.5 text-left text-[11px] hover:bg-accent ${
                    opt.value === value ? 'bg-accent/50 font-medium' : ''
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
