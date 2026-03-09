import { Trash2, PlugZap, BellOff, Bell, Server, User, Database } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ConnectionBadge } from '@/entities/connection';
import type { IConnection, TConnectionStatus } from '@/entities/connection';

interface ConnectionCardProps {
  connection: IConnection;
  status?: TConnectionStatus;
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
  onEdit,
  onDelete,
  onTestConnection,
  onToggleIgnore,
  dragAttributes,
  dragListeners,
  style,
}: ConnectionCardProps) {
  const isIgnored = connection.ignored;

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      style={style}
      onClick={() => onEdit(connection.id)}
      {...dragAttributes}
      {...dragListeners}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ConnectionBadge status={status} />
            <CardTitle className="text-base">{connection.name}</CardTitle>
          </div>
          <div className="flex items-center gap-0.5">
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
        <CardDescription className="flex items-center gap-2 pl-5">
          <Badge variant="outline" className="text-xs">
            {connection.dbType}
          </Badge>
          {connection.sslEnabled && (
            <Badge variant="secondary" className="text-xs">SSL</Badge>
          )}
          {isIgnored && (
            <Badge variant="secondary" className="text-xs text-orange-400">Auto-connect off</Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-11 text-sm text-muted-foreground">
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1">
          <Server className="size-3 text-muted-foreground/70" />
          <span>{connection.host}:{connection.port}</span>
          <Database className="size-3 text-muted-foreground/70" />
          <span>{connection.database}</span>
          <User className="size-3 text-muted-foreground/70" />
          <span>{connection.username}</span>
        </div>
      </CardContent>
    </Card>
  );
}
