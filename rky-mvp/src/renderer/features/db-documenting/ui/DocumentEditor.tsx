import { Textarea } from '@/shared/components/ui/textarea';
import { Input } from '@/shared/components/ui/input';

interface DocumentEditorProps {
  name: string;
  content: string;
  onNameChange: (name: string) => void;
  onContentChange: (content: string) => void;
}

export function DocumentEditor({
  name,
  content,
  onNameChange,
  onContentChange,
}: DocumentEditorProps) {
  return (
    <div className="flex h-full flex-col space-y-2 p-3">
      <Input
        placeholder="Document name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        className="text-sm"
      />
      <Textarea
        className="flex-1 min-h-0 resize-none font-mono text-sm"
        placeholder="Write markdown content..."
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
      />
    </div>
  );
}
