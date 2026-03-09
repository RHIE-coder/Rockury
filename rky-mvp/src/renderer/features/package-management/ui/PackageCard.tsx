import { Pencil, Trash2, Package } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { IPackage } from '@/entities/package';

interface PackageCardProps {
  pkg: IPackage;
  isActive: boolean;
  onSelect: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function PackageCard({ pkg, isActive, onSelect, onEdit, onDelete }: PackageCardProps) {
  return (
    <div
      className={`group flex cursor-pointer items-center gap-3 border-b border-border/50 px-3 py-2.5 transition-colors hover:bg-accent ${
        isActive ? 'bg-accent' : ''
      }`}
      onClick={onSelect}
    >
      <Package className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{pkg.name}</div>
        <div className="truncate text-[10px] text-muted-foreground">
          {pkg.description || 'No description'}
        </div>
      </div>
      <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="size-5"
          onClick={(e) => { e.stopPropagation(); onEdit(pkg.id); }}
        >
          <Pencil className="size-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-5"
          onClick={(e) => { e.stopPropagation(); onDelete(pkg.id); }}
        >
          <Trash2 className="size-3 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
