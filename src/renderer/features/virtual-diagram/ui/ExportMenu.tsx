import { useState } from 'react';
import { Image, FileCode2, FileSpreadsheet, FileJson, X, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { ITable } from '~/shared/types/db';

interface ExportMenuProps {
  tables: ITable[];
  onClose: () => void;
}

const EXPORT_PADDING = 40;

/**
 * Parse all React Flow node elements to compute the full diagram bounding box
 * in flow-space coordinates (independent of current pan/zoom).
 */
function getFlowNodeBounds(): { x: number; y: number; width: number; height: number } | null {
  const nodeElements = document.querySelectorAll('.react-flow__node');
  if (nodeElements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodeElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const match = htmlEl.style.transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
    if (!match) return;

    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    const w = htmlEl.offsetWidth;
    const h = htmlEl.offsetHeight;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  });

  if (!isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Yield to the browser so the loading state is painted before CPU-heavy work. */
function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 50));
  });
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export function ExportMenu({ tables, onClose }: ExportMenuProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  async function handleExportPng() {
    const el = document.querySelector('.react-flow__viewport') as HTMLElement | null;
    if (!el) return;

    const bounds = getFlowNodeBounds();
    if (!bounds) return;

    setExporting('png');
    await waitForPaint();

    const imageWidth = bounds.width + EXPORT_PADDING * 2;
    const imageHeight = bounds.height + EXPORT_PADDING * 2;

    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(el, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: 'transparent',
        width: imageWidth,
        height: imageHeight,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${-bounds.x + EXPORT_PADDING}px, ${-bounds.y + EXPORT_PADDING}px) scale(1)`,
        },
      });
      downloadDataUrl(dataUrl, 'diagram.png');
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

    const bounds = getFlowNodeBounds();
    if (!bounds) return;

    setExporting('svg');
    await waitForPaint();

    const imageWidth = bounds.width + EXPORT_PADDING * 2;
    const imageHeight = bounds.height + EXPORT_PADDING * 2;

    try {
      const { toSvg } = await import('html-to-image');
      const dataUrl = await toSvg(el, {
        backgroundColor: 'transparent',
        width: imageWidth,
        height: imageHeight,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${-bounds.x + EXPORT_PADDING}px, ${-bounds.y + EXPORT_PADDING}px) scale(1)`,
        },
      });
      downloadDataUrl(dataUrl, 'diagram.svg');
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
          {exporting === 'png' ? 'Exporting...' : 'PNG Image'}
        </button>
        <button
          type="button"
          onClick={handleExportSvg}
          disabled={!!exporting}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent disabled:opacity-50"
        >
          {exporting === 'svg' ? <Loader2 className="size-3.5 animate-spin" /> : <FileCode2 className="size-3.5" />}
          {exporting === 'svg' ? 'Exporting...' : 'SVG'}
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
