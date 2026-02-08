import { Pencil, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import type { IPackage } from '@/entities/package';

interface PackageCardProps {
  pkg: IPackage;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function PackageCard({ pkg, onEdit, onDelete }: PackageCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{pkg.name}</CardTitle>
        <CardDescription>{pkg.description || 'No description'}</CardDescription>
      </CardHeader>
      <CardFooter className="gap-2">
        <Button variant="ghost" size="icon-xs" onClick={() => onEdit(pkg.id)}>
          <Pencil className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={() => onDelete(pkg.id)}>
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {new Date(pkg.updatedAt).toLocaleDateString()}
        </span>
      </CardFooter>
    </Card>
  );
}
