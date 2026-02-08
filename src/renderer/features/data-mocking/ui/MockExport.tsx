import { Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { IMockResult } from '~/shared/types/db';
import { useMutation } from '@tanstack/react-query';
import { mockingApi } from '../api/mockingApi';

interface MockExportProps {
  mockResult: IMockResult;
}

const EXPORT_FORMATS: { format: 'sql' | 'csv' | 'json'; label: string }[] = [
  { format: 'sql', label: 'SQL' },
  { format: 'csv', label: 'CSV' },
  { format: 'json', label: 'JSON' },
];

export function MockExport({ mockResult }: MockExportProps) {
  const exportMutation = useMutation({
    mutationFn: (format: 'sql' | 'csv' | 'json') =>
      mockingApi.export({ mockResult, format }),
    onSuccess: (result) => {
      if (result.success) {
        // Copy content to clipboard as a simple export action
        navigator.clipboard.writeText(result.data.content);
      }
    },
  });

  return (
    <div className="flex items-center gap-1">
      <Download className="size-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">Export:</span>
      {EXPORT_FORMATS.map(({ format, label }) => (
        <Button
          key={format}
          variant="outline"
          size="xs"
          onClick={() => exportMutation.mutate(format)}
          disabled={exportMutation.isPending}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
