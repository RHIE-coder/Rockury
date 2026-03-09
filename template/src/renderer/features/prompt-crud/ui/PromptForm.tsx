import { useState, useEffect } from 'react';
import type { IPrompt, TPromptCategory, ICreatePromptRequest } from '@/entities/prompt';
import { PROMPT_CATEGORY_LABELS } from '@/entities/prompt';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select } from '@/shared/components/ui/select';

interface PromptFormProps {
  initial?: IPrompt;
  onSubmit: (data: ICreatePromptRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PromptForm({ initial, onSubmit, onCancel, isLoading }: PromptFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState<TPromptCategory>(initial?.category ?? 'page-generation');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [template, setTemplate] = useState(initial?.template ?? '');

  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setCategory(initial.category);
      setDescription(initial.description);
      setTemplate(initial.template);
    }
  }, [initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, category, description, template });
  };

  const categories = Object.entries(PROMPT_CATEGORY_LABELS) as [TPromptCategory, string][];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="프롬프트 제목"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Category</label>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value as TPromptCategory)}
        >
          {categories.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Description</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="간단한 설명"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Template</label>
        <Textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder="프롬프트 템플릿 ({{variable}} 형태로 변수 사용)..."
          rows={12}
          className="font-mono text-sm"
          required
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {initial ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
