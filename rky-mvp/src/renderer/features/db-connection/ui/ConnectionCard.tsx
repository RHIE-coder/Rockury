import { Trash2, PlugZap, BellOff, Bell, GripVertical, Pencil } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ConnectionBadge } from '@/entities/connection';
import type { IConnection, TConnectionStatus } from '@/entities/connection';

interface ConnectionCardProps {
  connection: IConnection;
  status?: TConnectionStatus;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTestConnection?: (id: string) => void;
  onToggleIgnore?: (id: string, ignored: boolean) => void;
  dragAttributes?: React.HTMLAttributes<HTMLElement>;
  dragListeners?: Record<string, Function>;
  style?: React.CSSProperties;
}

export function ConnectionCard({
  connection,
  status = 'disconnected',
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onTestConnection,
  onToggleIgnore,
  dragAttributes,
  dragListeners,
  style,
}: ConnectionCardProps) {
  const isIgnored = connection.ignored;
  const isFileBased = connection.dbType === 'sqlite';

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-muted/50 cursor-pointer ${
        isSelected ? 'ring-2 ring-primary border-primary' : ''
      }`}
      style={style}
      onClick={() => onSelect?.(connection.id)}
    >
      {/* Drag handle */}
      <div
        className="flex-shrink-0 cursor-grab text-muted-foreground/40 hover:text-muted-foreground"
        {...dragAttributes}
        {...dragListeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="size-4" />
      </div>

      {/* Status dot */}
      <div className="flex-shrink-0">
        <ConnectionBadge status={status} />
      </div>

      {/* Name */}
      <span className="min-w-0 flex-shrink-0 truncate font-medium text-sm max-w-[140px]">
        {connection.name}
      </span>

      {/* DB type badge */}
      <Badge variant="outline" className="flex-shrink-0 text-xs">
        {connection.dbType}
      </Badge>

      {isIgnored && (
        <Badge variant="secondary" className="flex-shrink-0 text-xs text-orange-400">
          Auto-connect off
        </Badge>
      )}

      {connection.sslEnabled && !isFileBased && (
        <Badge variant="secondary" className="flex-shrink-0 text-xs">SSL</Badge>
      )}

      {/* Connection detail */}
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        {isFileBased
          ? connection.database
          : `${connection.host}:${connection.port} / ${connection.database} @ ${connection.username}`}
      </span>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(connection.id);
          }}
          title="Edit connection"
        >
          <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
        </Button>
        {onToggleIgnore && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation();
              onToggleIgnore(connection.id, !isIgnored);
            }}
            title={isIgnored ? 'Enable auto-connect' : 'Skip auto-connect'}
          >
            {isIgnored ? (
              <BellOff className="size-3.5 text-orange-400" />
            ) : (
              <Bell className="size-3.5 text-muted-foreground hover:text-foreground" />
            )}
          </Button>
        )}
        {onTestConnection && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation();
              onTestConnection(connection.id);
            }}
            title="Test connection"
          >
            <PlugZap className="size-3.5 text-muted-foreground hover:text-yellow-500" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(connection.id);
          }}
        >
          <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
    </div>
  );
}
