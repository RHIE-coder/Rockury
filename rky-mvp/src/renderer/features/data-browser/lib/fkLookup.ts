import type { ITable } from '~/shared/types/db';

type TRow = Record<string, unknown>;

function splitColumns(columnList: string): string[] {
  return columnList
    .split(',')
    .map((column) => column.trim())
    .filter(Boolean);
}

export interface IFkLookupConfig {
  refTable: string;
  sourceColumns: string[];
  refColumns: string[];
  activeSourceColumn: string;
  activeRefColumn: string;
}

export function resolveFkLookupConfig(table: ITable, columnName: string): IFkLookupConfig | null {
  const matchingConstraint = table.constraints.find(
    (constraint) =>
      constraint.type === 'FK'
      && constraint.columns.includes(columnName)
      && constraint.reference?.table
      && constraint.reference.column,
  );

  if (matchingConstraint?.reference) {
    const sourceColumns = matchingConstraint.columns;
    const refColumns = splitColumns(matchingConstraint.reference.column);
    const activeIndex = Math.max(0, sourceColumns.indexOf(columnName));

    return {
      refTable: matchingConstraint.reference.table,
      sourceColumns,
      refColumns,
      activeSourceColumn: columnName,
      activeRefColumn: refColumns[activeIndex] ?? refColumns[0] ?? '',
    };
  }

  const column = table.columns.find((entry) => entry.name === columnName);
  if (!column?.reference) return null;

  return {
    refTable: column.reference.table,
    sourceColumns: [columnName],
    refColumns: [column.reference.column],
    activeSourceColumn: columnName,
    activeRefColumn: column.reference.column,
  };
}

export function buildFkSelectionValues(config: IFkLookupConfig, row: TRow): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  config.sourceColumns.forEach((sourceColumn, index) => {
    const refColumn = config.refColumns[index] ?? config.refColumns[0];
    values[sourceColumn] = row[refColumn];
  });

  return values;
}
