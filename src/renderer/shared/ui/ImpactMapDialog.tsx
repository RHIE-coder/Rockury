import { useCallback } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Database,
  Package,
  GitBranch,
  Camera,
  FileCode,
  ShieldCheck,
  Wand2,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';

type ImpactType = 'connection' | 'package' | 'diagram' | 'snapshot' | 'seed' | 'validation' | 'mocking';
type ImpactSeverity = 'info' | 'warning' | 'breaking';

export interface ImpactItem {
  id: string;
  name: string;
  type: ImpactType;
  severity: ImpactSeverity;
  description: string;
  children?: ImpactItem[];
}

interface ImpactMapDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  impacts: ImpactItem[];
  confirmLabel?: string;
  confirmDestructive?: boolean;
}

const TYPE_ICONS: Record<ImpactType, React.ElementType> = {
  connection: Database,
  package: Package,
  diagram: GitBranch,
  snapshot: Camera,
  seed: FileCode,
  validation: ShieldCheck,
  mocking: Wand2,
};

const SEVERITY_STYLES: Record<ImpactSeverity, { dot: string; text: string; icon: React.ElementType | null }> = {
  info: { dot: 'bg-muted-foreground', text: 'text-muted-foreground', icon: Info },
  warning: { dot: 'bg-yellow-500', text: 'text-yellow-500', icon: AlertTriangle },
  breaking: { dot: 'bg-red-500', text: 'text-red-500', icon: AlertTriangle },
};

function ImpactNode({ item, depth = 0 }: { item: ImpactItem; depth?: number }) {
  const Icon = TYPE_ICONS[item.type];
  const severity = SEVERITY_STYLES[item.severity];

  return (
    <div>
      <div
        className="flex items-start gap-2 rounded px-2 py-1.5 hover:bg-accent"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <div className={`mt-0.5 flex size-4 shrink-0 items-center justify-center ${severity.text}`}>
          <Icon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{item.name}</span>
            <div className={`size-1.5 shrink-0 rounded-full ${severity.dot}`} />
          </div>
          <p className="text-xs text-muted-foreground">{item.description}</p>
        </div>
        {item.children && item.children.length > 0 && (
          <ArrowRight className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
        )}
      </div>
      {item.children?.map((child) => (
        <ImpactNode key={child.id} item={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function ImpactMapDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  impacts,
  confirmLabel = 'Confirm',
  confirmDestructive = false,
}: ImpactMapDialogProps) {
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) onClose();
    },
    [onClose],
  );

  const hasBreaking = impacts.some(
    (i) => i.severity === 'breaking' || i.children?.some((c) => c.severity === 'breaking'),
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            {hasBreaking && <AlertTriangle className="size-4 text-red-500" />}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="max-h-64 overflow-y-auto rounded-md border border-border">
          {impacts.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              No impacts detected.
            </div>
          ) : (
            <div className="py-1">
              {impacts.map((item) => (
                <ImpactNode key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={confirmDestructive ? 'destructive' : 'default'}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
