import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Copy, Check } from 'lucide-react';

interface CopyPromptButtonProps {
  text: string;
}

export function CopyPromptButton({ text }: CopyPromptButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="icon-sm" onClick={handleCopy}>
      {isCopied ? (
        <Check className="size-4 text-green-500" />
      ) : (
        <Copy className="size-4" />
      )}
    </Button>
  );
}
