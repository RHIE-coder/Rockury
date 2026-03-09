import { Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { TExportFormat } from '@/entities/document';
import { useExportDocument } from '../model/useDocuments';

interface ExportMenuProps {
  documentId: string;
}

const EXPORT_FORMATS: { format: TExportFormat; label: string }[] = [
  { format: 'markdown', label: 'Markdown' },
  { format: 'pdf', label: 'PDF' },
  { format: 'png', label: 'Image (PNG)' },
];

export function ExportMenu({ documentId }: ExportMenuProps) {
  const exportDoc = useExportDocument();

  function handleExport(format: TExportFormat) {
    exportDoc.mutate({ documentId, format });
  }

  return (
    <div className="flex items-center gap-1">
      <Download className="size-4 text-muted-foreground" />
      {EXPORT_FORMATS.map(({ format, label }) => (
        <Button
          key={format}
          variant="outline"
          size="xs"
          onClick={() => handleExport(format)}
          disabled={exportDoc.isPending}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
