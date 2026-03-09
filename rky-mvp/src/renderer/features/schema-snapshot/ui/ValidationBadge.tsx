import { CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

interface ValidationBadgeProps {
  isValid?: boolean;
  validatedAt?: string;
}

export function ValidationBadge({ isValid, validatedAt }: ValidationBadgeProps) {
  if (isValid === undefined || !validatedAt) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <HelpCircle className="size-3" />
        Not validated
      </span>
    );
  }

  const ago = getTimeAgo(validatedAt);

  if (isValid) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
        <CheckCircle2 className="size-3" />
        Valid {ago}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-[10px] text-yellow-600 dark:text-yellow-400">
      <AlertTriangle className="size-3" />
      Changed {ago}
    </span>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
