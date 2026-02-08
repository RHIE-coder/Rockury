import { Pencil, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ConnectionBadge } from '@/entities/connection';
import type { IConnection, TConnectionStatus } from '@/entities/connection';

interface ConnectionCardProps {
  connection: IConnection;
  status?: TConnectionStatus;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ConnectionCard({
  connection,
  status = 'disconnected',
  onEdit,
  onDelete,
}: ConnectionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{connection.name}</CardTitle>
          <ConnectionBadge status={status} />
        </div>
        <CardDescription className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {connection.dbType}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <p>{connection.host}:{connection.port}</p>
        <p>DB: {connection.database} / User: {connection.username}</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="ghost" size="icon-xs" onClick={() => onEdit(connection.id)}>
          <Pencil className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={() => onDelete(connection.id)}>
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
        {connection.sslEnabled && (
          <Badge variant="secondary" className="ml-auto text-xs">SSL</Badge>
        )}
      </CardFooter>
    </Card>
  );
}
