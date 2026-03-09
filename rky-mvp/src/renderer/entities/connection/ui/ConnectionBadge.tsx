import type { TConnectionStatus } from '../model/types';

const STATUS_CONFIG: Record<TConnectionStatus, { color: string; label: string }> = {
  connected: { color: 'bg-green-500', label: 'Connected' },
  disconnected: { color: 'bg-gray-400', label: 'Disconnected' },
  error: { color: 'bg-red-500', label: 'Error' },
  testing: { color: 'bg-yellow-500', label: 'Testing' },
};

interface ConnectionBadgeProps {
  status: TConnectionStatus;
  showLabel?: boolean;
}

export function ConnectionBadge({ status, showLabel = false }: ConnectionBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block size-2 rounded-full ${config.color}`}
        aria-label={config.label}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">{config.label}</span>
      )}
    </span>
  );
}
