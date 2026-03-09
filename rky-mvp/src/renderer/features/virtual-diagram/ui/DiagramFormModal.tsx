import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';

interface DiagramFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialValues?: { name: string; description: string };
  onSubmit: (values: { name: string; description: string }) => void;
}

export function DiagramFormModal({
  open,
  onOpenChange,
  mode,
  initialValues,
  onSubmit,
}: DiagramFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialValues?.name ?? '');
      setDescription(initialValues?.description ?? '');
    }
  }, [open, initialValues]);

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim() });
    onOpenChange(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && e.metaKey) handleSubmit();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm">
            {mode === 'create' ? 'New Diagram' : 'Edit Diagram'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3" onKeyDown={handleKeyDown}>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Name</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Diagram name"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Description</span>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this diagram..."
              rows={3}
            />
          </div>
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
