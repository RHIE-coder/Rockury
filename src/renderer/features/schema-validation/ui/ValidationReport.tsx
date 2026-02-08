import { Badge } from '@/shared/components/ui/badge';
import type { IValidationReport, IValidationItem, TValidationSeverity } from '~/shared/types/db';

const SEVERITY_CONFIG: Record<TValidationSeverity, { variant: 'destructive' | 'secondary' | 'outline'; label: string }> = {
  error: { variant: 'destructive', label: 'Error' },
  warning: { variant: 'secondary', label: 'Warning' },
  info: { variant: 'outline', label: 'Info' },
};

function ValidationItemRow({ item }: { item: IValidationItem }) {
  const config = SEVERITY_CONFIG[item.severity];
  return (
    <div className="flex items-start gap-2 rounded border border-border p-2">
      <Badge variant={config.variant} className="mt-0.5 shrink-0 text-xs">
        {config.label}
      </Badge>
      <div className="flex-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.tableName}</span>
          {item.columnName && (
            <span className="text-muted-foreground">.{item.columnName}</span>
          )}
          <span className="text-xs text-muted-foreground">[{item.category}]</span>
        </div>
        <p className="text-muted-foreground">{item.message}</p>
        {item.suggestion && (
          <p className="mt-0.5 text-xs text-muted-foreground italic">{item.suggestion}</p>
        )}
      </div>
    </div>
  );
}

interface ValidationReportProps {
  report: IValidationReport;
}

export function ValidationReport({ report }: ValidationReportProps) {
  const groupedBySeverity = {
    error: report.items.filter((i) => i.severity === 'error'),
    warning: report.items.filter((i) => i.severity === 'warning'),
    info: report.items.filter((i) => i.severity === 'info'),
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
        <span className="text-sm font-medium">Summary:</span>
        <Badge variant="destructive">{report.summary.errors} errors</Badge>
        <Badge variant="secondary">{report.summary.warnings} warnings</Badge>
        <Badge variant="outline">{report.summary.infos} info</Badge>
        <span className="ml-auto text-xs text-muted-foreground">
          {new Date(report.validatedAt).toLocaleString()}
        </span>
      </div>

      {/* Items grouped by severity */}
      {(['error', 'warning', 'info'] as const).map((severity) => {
        const items = groupedBySeverity[severity];
        if (items.length === 0) return null;
        return (
          <div key={severity} className="space-y-1.5">
            <h4 className="text-xs font-semibold capitalize">{severity}s ({items.length})</h4>
            {items.map((item, idx) => (
              <ValidationItemRow key={idx} item={item} />
            ))}
          </div>
        );
      })}

      {report.items.length === 0 && (
        <p className="text-sm text-muted-foreground">No validation issues found.</p>
      )}
    </div>
  );
}
