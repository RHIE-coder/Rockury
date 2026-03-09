import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

interface VersionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialName?: string;
  onSubmit: (name: string) => void;
}

export function VersionFormModal({
  open,
  onOpenChange,
  mode,
  initialName = '',
  onSubmit,
}: VersionFormModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit(name.trim());
    onOpenChange(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm">
            {mode === 'create' ? 'New Version' : 'Rename Version'}
          </DialogTitle>
        </DialogHeader>
        <div onKeyDown={handleKeyDown}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. v2.0 - Add user tables"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!name.trim()}>
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
