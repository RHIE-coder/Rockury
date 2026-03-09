import type { IPrompt } from '../model';
import { PROMPT_CATEGORY_LABELS } from '../model';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';

interface PromptCardProps {
  prompt: IPrompt;
  onClick?: (prompt: IPrompt) => void;
  actions?: React.ReactNode;
}

export function PromptCard({ prompt, onClick, actions }: PromptCardProps) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => onClick?.(prompt)}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{prompt.title}</CardTitle>
          <Badge variant="secondary">
            {PROMPT_CATEGORY_LABELS[prompt.category]}
          </Badge>
        </div>
        <CardDescription>{prompt.description}</CardDescription>
      </CardHeader>
      {actions && (
        <CardContent>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
