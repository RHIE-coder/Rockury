import { Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/components/ui/popover';

interface ExportMenuProps {
  onExport: (format: 'csv' | 'json' | 'sql') => void;
}

export function ExportMenu({ onExport }: ExportMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="xs" title="Export">
          <Download className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-36 p-1">
        {(['csv', 'json', 'sql'] as const).map((fmt) => (
          <button
            key={fmt}
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
            onClick={() => onExport(fmt)}
          >
            {fmt === 'csv' && 'CSV (.csv)'}
            {fmt === 'json' && 'JSON (.json)'}
            {fmt === 'sql' && 'SQL INSERT (.sql)'}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
