import { useState } from 'react';
import { Shuffle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { MockingConfig, MockPreview, MockExport } from '@/features/data-mocking';
import { mockingApi } from '@/features/data-mocking/api/mockingApi';
import type { IMockResult } from '~/shared/types/db';

export function DbMockingPage() {
  const [mockResult, setMockResult] = useState<IMockResult | null>(null);

  const generateMock = useMutation({
    mutationFn: (args: { tableIds: string[]; diagramId: string; rowCount: number }) =>
      mockingApi.generate(args),
    onSuccess: (result) => {
      if (result.success) {
        setMockResult(result.data);
      }
    },
  });

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Shuffle className="size-5" />
        <h1 className="text-xl font-semibold">Mocking</h1>
      </div>
      <p className="text-muted-foreground">
        Mock 데이터를 생성하고 내보냅니다.
      </p>

      <MockingConfig
        onGenerate={(args) => generateMock.mutate(args)}
        isGenerating={generateMock.isPending}
      />

      {generateMock.isError && (
        <p className="text-sm text-destructive">Failed to generate mock data.</p>
      )}

      {mockResult && (
        <div className="space-y-3">
          <MockExport mockResult={mockResult} />
          <MockPreview result={mockResult} />
        </div>
      )}
    </div>
  );
}
