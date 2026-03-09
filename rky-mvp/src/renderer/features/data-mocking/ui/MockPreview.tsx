import type { IMockResult } from '~/shared/types/db';

interface MockPreviewProps {
  result: IMockResult;
}

export function MockPreview({ result }: MockPreviewProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Generated at: {new Date(result.generatedAt).toLocaleString()}
      </p>
      {result.tables.map((table) => (
        <div key={table.tableName} className="space-y-1">
          <h4 className="text-sm font-semibold">
            {table.tableName} ({table.rows.length} rows)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {table.columns.map((col) => (
                    <th key={col} className="px-2 py-1 text-left font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.slice(0, 20).map((row, idx) => (
                  <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                    {table.columns.map((col) => (
                      <td key={col} className="px-2 py-1 text-muted-foreground">
                        {row[col] === null ? (
                          <span className="italic text-muted-foreground/50">NULL</span>
                        ) : (
                          String(row[col])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {table.rows.length > 20 && (
                  <tr>
                    <td
                      colSpan={table.columns.length}
                      className="px-2 py-1 text-center text-muted-foreground italic"
                    >
                      ...and {table.rows.length - 20} more rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
