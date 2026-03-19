import { useState, useCallback, useEffect } from 'react';
import { Variable } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface KeywordInputPanelProps {
  keywords: string[];
  /** Previously entered values — restored when re-running */
  initialValues?: Record<string, string>;
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function KeywordInputPanel({
  keywords,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Run',
}: KeywordInputPanelProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const kw of keywords) init[kw] = initialValues?.[kw] ?? '';
    return init;
  });

  // Reset if keywords change
  useEffect(() => {
    setValues((prev) => {
      const next: Record<string, string> = {};
      for (const kw of keywords) next[kw] = prev[kw] ?? initialValues?.[kw] ?? '';
      return next;
    });
  }, [keywords, initialValues]);

  const handleChange = useCallback((keyword: string, value: string) => {
    setValues((prev) => ({ ...prev, [keyword]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    onSubmit(values);
  }, [values, onSubmit]);

  const allFilled = keywords.every((kw) => values[kw]?.trim());

  return (
    <div className="border-b border-border bg-amber-500/5 px-3 py-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
        <Variable className="size-3.5" />
        <span>Keywords detected — fill in values to execute</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((kw) => (
          <div key={kw} className="flex items-center gap-1.5">
            <label className="text-[11px] font-mono text-muted-foreground">{`{{${kw}}}`}</label>
            <input
              type="text"
              value={values[kw] ?? ''}
              onChange={(e) => handleChange(kw, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && allFilled) handleSubmit(); }}
              placeholder={kw}
              className="w-32 rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button variant="default" size="xs" onClick={handleSubmit} disabled={!allFilled}>
          {submitLabel}
        </Button>
        <Button variant="ghost" size="xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
