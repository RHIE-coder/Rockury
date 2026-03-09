import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';

interface DescriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  onSave: (description: string) => void;
}

export function DescriptionModal({
  open,
  onOpenChange,
  description,
  onSave,
}: DescriptionModalProps) {
  const [localDescription, setLocalDescription] = useState(description);

  useEffect(() => {
    if (open) setLocalDescription(description);
  }, [open, description]);

  function handleSave() {
    onSave(localDescription);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm">Diagram Description</DialogTitle>
          <DialogDescription className="text-xs">
            Add a description for this diagram.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={localDescription}
          onChange={(e) => setLocalDescription(e.target.value)}
          placeholder="Describe this diagram..."
          rows={5}
        />
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
