import { Zap } from 'lucide-react';

interface ExplainSummaryBannerProps {
  summary: string;
}

export function ExplainSummaryBanner({ summary }: ExplainSummaryBannerProps) {
  if (!summary) return null;

  return (
    <div className="flex items-center gap-1.5 border-b border-border bg-muted/30 px-3 py-1">
      <Zap className="size-3 shrink-0 text-amber-500" />
      <span className="truncate text-xs text-muted-foreground">{summary}</span>
    </div>
  );
}
