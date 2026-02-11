import { useState } from 'react';
import { Image, FileCode2, FileSpreadsheet, FileJson, X, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { ITable } from '~/shared/types/db';

interface ExportMenuProps {
  tables: ITable[];
  onClose: () => void;
}

export function ExportMenu({ tables, onClose }: ExportMenuProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  // Yield to let React paint the loading state before CPU-heavy export work
  function waitForPaint(): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }

  async function handleExportPng() {
    const el = document.querySelector('.react-flow__viewport') as HTMLElement | null;
    if (!el) return;

    setExporting('png');
    await waitForPaint();
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(el, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: 'transparent',
      });
      const link = document.createElement('a');
      link.download = 'diagram.png';
      link.href = dataUrl;
      link.click();
      onClose();
    } catch {
      // Export failed
    } finally {
      setExporting(null);
    }
  }

  async function handleExportSvg() {
    const el = document.querySelector('.react-flow__viewport') as HTMLElement | null;
    if (!el) return;

    setExporting('svg');
    await waitForPaint();
    try {
      const { toSvg } = await import('html-to-image');
      const dataUrl = await toSvg(el, {
        backgroundColor: 'transparent',
      });
      const link = document.createElement('a');
      link.download = 'diagram.svg';
      link.href = dataUrl;
      link.click();
      onClose();
    } catch {
      // Export failed
    } finally {
      setExporting(null);
    }
  }

  function handleExportCsv() {
    if (tables.length === 0) return;

    const rows: string[] = [
      'Table,TableComment,Column,OrdinalPosition,DataType,Key,Nullable,Default,Comment,ReferenceTable,ReferenceColumn,Constraints',
    ];
    for (const table of tables) {
      for (const col of table.columns) {
        rows.push(
          [
            csvEscape(table.name),
            csvEscape(table.comment),
            csvEscape(col.name),
            String(col.ordinalPosition),
            csvEscape(col.dataType),
            csvEscape(col.keyTypes?.join(',') ?? ''),
            col.nullable ? 'YES' : 'NO',
            csvEscape(col.defaultValue ?? ''),
            csvEscape(col.comment),
            csvEscape(col.reference?.table ?? ''),
            csvEscape(col.reference?.column ?? ''),
            csvEscape((col.constraints ?? []).join('; ')),
          ].join(','),
        );
      }
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.download = 'schema.csv';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    onClose();
  }

  function handleExportJson() {
    if (tables.length === 0) return;

    const json = JSON.stringify(tables, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = 'schema.json';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    onClose();
  }

  return (
    <div className="w-44 rounded-lg border border-border bg-background p-1 shadow-lg">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-semibold">Export</span>
        <Button variant="ghost" size="xs" onClick={onClose}>
          <X className="size-3" />
        </Button>
      </div>
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={handleExportPng}
          disabled={!!exporting}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent disabled:opacity-50"
        >
          {exporting === 'png' ? <Loader2 className="size-3.5 animate-spin" /> : <Image className="size-3.5" />}
          {exporting === 'png' ? 'Exporting PNG...' : 'PNG Image'}
        </button>
        <button
          type="button"
          onClick={handleExportSvg}
          disabled={!!exporting}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent disabled:opacity-50"
        >
          {exporting === 'svg' ? <Loader2 className="size-3.5 animate-spin" /> : <FileCode2 className="size-3.5" />}
          {exporting === 'svg' ? 'Exporting SVG...' : 'SVG'}
        </button>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={!!exporting}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent disabled:opacity-50"
        >
          <FileSpreadsheet className="size-3.5" />
          CSV (Schema)
        </button>
        <button
          type="button"
          onClick={handleExportJson}
          disabled={!!exporting}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent disabled:opacity-50"
        >
          <FileJson className="size-3.5" />
          JSON (Schema)
        </button>
      </div>
    </div>
  );
}

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
