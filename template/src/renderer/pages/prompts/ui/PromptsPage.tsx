import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { IPrompt, TPromptCategory } from '@/entities/prompt';
import { PROMPT_CATEGORY_LABELS, PromptCard } from '@/entities/prompt';
import {
  usePrompts,
  useCreatePrompt,
  useUpdatePrompt,
  PromptForm,
  DeletePromptButton,
} from '@/features/prompt-crud';
import { CopyPromptButton } from '@/features/prompt-copy';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/card';
import { Plus, ArrowLeft } from 'lucide-react';

type ViewMode = 'list' | 'create' | 'edit' | 'detail';

export function PromptsPage() {
  const { data: prompts = [], isLoading } = usePrompts();
  const createMutation = useCreatePrompt();
  const updateMutation = useUpdatePrompt();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPrompt, setSelectedPrompt] = useState<IPrompt | null>(null);
  const [filterCategory, setFilterCategory] = useState<TPromptCategory | 'all'>('all');

  const filteredPrompts =
    filterCategory === 'all'
      ? prompts
      : prompts.filter((p) => p.category === filterCategory);

  const handleCreate = (data: Parameters<typeof createMutation.mutate>[0]) => {
    createMutation.mutate(data, {
      onSuccess: () => setViewMode('list'),
    });
  };

  const handleUpdate = (data: Parameters<typeof createMutation.mutate>[0]) => {
    if (!selectedPrompt) return;
    updateMutation.mutate(
      { id: selectedPrompt.id, ...data },
      {
        onSuccess: () => {
          setViewMode('list');
          setSelectedPrompt(null);
        },
      },
    );
  };

  const handleCardClick = (prompt: IPrompt) => {
    setSelectedPrompt(prompt);
    setViewMode('detail');
  };

  const goBack = () => {
    setViewMode('list');
    setSelectedPrompt(null);
  };

  // Detail view
  if (viewMode === 'detail' && selectedPrompt) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{selectedPrompt.title}</CardTitle>
              <div className="flex gap-2">
                <Badge variant="secondary">
                  {PROMPT_CATEGORY_LABELS[selectedPrompt.category]}
                </Badge>
                <CopyPromptButton text={selectedPrompt.template} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('edit')}
                >
                  Edit
                </Button>
                <DeletePromptButton promptId={selectedPrompt.id} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedPrompt.description}
            </p>
            <pre className="rounded-md bg-muted p-4 text-sm font-mono whitespace-pre-wrap overflow-x-auto">
              {selectedPrompt.template}
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Create / Edit form
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <h2 className="text-2xl font-bold mt-4 mb-6">
          {viewMode === 'create' ? 'Create New Prompt' : 'Edit Prompt'}
        </h2>
        <PromptForm
          initial={viewMode === 'edit' ? selectedPrompt ?? undefined : undefined}
          onSubmit={viewMode === 'create' ? handleCreate : handleUpdate}
          onCancel={goBack}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    );
  }

  // List view
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Prompt Manager</h1>
          <p className="text-sm text-muted-foreground">
            AI 코드 생성을 위한 프롬프트 템플릿
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="size-4" /> Home
          </Button>
          <Button size="sm" onClick={() => setViewMode('create')}>
            <Plus className="size-4" /> New Prompt
          </Button>
        </div>
      </div>

      {/* Category filter */}
      <div className="mb-4">
        <Select
          value={filterCategory}
          onChange={(e) =>
            setFilterCategory(e.target.value as TPromptCategory | 'all')
          }
          className="w-48"
        >
          <option value="all">All Categories</option>
          {(
            Object.entries(PROMPT_CATEGORY_LABELS) as [TPromptCategory, string][]
          ).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {/* Prompt list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading prompts...</p>
      ) : filteredPrompts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No prompts found.</p>
      ) : (
        <div className="grid gap-4">
          {filteredPrompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onClick={handleCardClick}
              actions={
                <>
                  <CopyPromptButton text={prompt.template} />
                  <DeletePromptButton promptId={prompt.id} />
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
