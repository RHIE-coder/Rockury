import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { IConnection, TConnectionStatus } from '@/entities/connection';
import { ConnectionCard } from './ConnectionCard';

interface SortableConnectionCardProps {
  connection: IConnection;
  status?: TConnectionStatus;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTestConnection?: (id: string) => void;
  onToggleIgnore?: (id: string, ignored: boolean) => void;
}

export function SortableConnectionCard({
  connection,
  status,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onTestConnection,
  onToggleIgnore,
}: SortableConnectionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: connection.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ConnectionCard
        connection={connection}
        status={status}
        isSelected={isSelected}
        onSelect={onSelect}
        onEdit={onEdit}
        onDelete={onDelete}
        onTestConnection={onTestConnection}
        onToggleIgnore={onToggleIgnore}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  );
}
