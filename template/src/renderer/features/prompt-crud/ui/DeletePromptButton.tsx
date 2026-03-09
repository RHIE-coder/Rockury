import { Button } from '@/shared/components/ui/button';
import { useDeletePrompt } from '../api';
import { Trash2 } from 'lucide-react';

interface DeletePromptButtonProps {
  promptId: string;
}

export function DeletePromptButton({ promptId }: DeletePromptButtonProps) {
  const { mutate, isPending } = useDeletePrompt();

  const handleDelete = () => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      mutate(promptId);
    }
  };

  return (
    <Button variant="ghost" size="icon-sm" onClick={handleDelete} disabled={isPending}>
      <Trash2 className="size-4 text-destructive" />
    </Button>
  );
}
