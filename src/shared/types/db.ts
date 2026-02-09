// ─── DB Type ───
export type TDbType = 'mysql' | 'mariadb' | 'postgresql';

// ─── Key / Constraint Types ───
export type TKeyType = 'PK' | 'FK' | 'UK' | 'IDX';
export type TConstraintType = 'PK' | 'FK' | 'UK' | 'IDX' | 'CHECK' | 'NOT_NULL';

// ─── Package ───
export interface IPackage {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type TResourceType = 'connection' | 'diagram' | 'query' | 'document';

export interface IPackageResource {
  id: string;
  packageId: string;
  resourceType: TResourceType;
  resourceId: string;
  isShared: boolean;
}

// ─── Connection ───
export interface IConnection {
  id: string;
  name: string;
  dbType: TDbType;
  host: string;
  port: number;
  database: string;
  username: string;
  sslEnabled: boolean;
  sslConfig?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IConnectionFormData {
  name: string;
  dbType: TDbType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslEnabled: boolean;
  sslConfig?: Record<string, unknown>;
}

export type TConnectionStatus = 'connected' | 'disconnected' | 'error' | 'testing';

export interface IConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  serverVersion?: string;
}

// ─── Column ───
export interface IColumn {
  id: string;
  name: string;
  dataType: string;
  keyType: TKeyType | null;
  defaultValue: string | null;
  nullable: boolean;
  comment: string;
  reference: IForeignKeyRef | null;
  constraints: IConstraint[];
  ordinalPosition: number;
}

export interface IForeignKeyRef {
  table: string;
  column: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface IConstraint {
  type: TConstraintType;
  name: string;
  columns: string[];
  reference?: IForeignKeyRef;
  checkExpression?: string;
}

// ─── Table ───
export interface ITable {
  id: string;
  name: string;
  comment: string;
  columns: IColumn[];
  constraints: IConstraint[];
  engine?: string;
  charset?: string;
}

// ─── Diagram ───
export type TDiagramType = 'virtual' | 'real';

export interface IDiagram {
  id: string;
  name: string;
  version: string;
  type: TDiagramType;
  tables: ITable[];
  createdAt: string;
  updatedAt: string;
}

export interface IDiagramLayout {
  diagramId: string;
  positions: Record<string, { x: number; y: number }>;
  zoom: number;
  viewport: { x: number; y: number };
}

export interface IDiagramVersion {
  id: string;
  diagramId: string;
  versionNumber: number;
  ddlContent: string;
  schemaSnapshot: IDiagram;
  createdAt: string;
}

// ─── Diagram Filter ───
export type TFilterPreset = 'compact' | 'full' | 'custom';

export interface IDiagramFilter {
  showColumns: boolean;
  showDataTypes: boolean;
  showKeyIcons: boolean;
  showNullable: boolean;
  showComments: boolean;
  showConstraints: boolean;
  preset: TFilterPreset;
}

// ─── Search Result ───
export interface ISearchResult {
  type: 'table' | 'column' | 'constraint';
  tableId: string;
  tableName: string;
  columnId?: string;
  columnName?: string;
  constraintName?: string;
  matchedText: string;
}

// ─── Migration ───
export type TMigrationDirection = 'virtual_to_real' | 'real_to_virtual';
export type TMigrationStatus = 'pending' | 'applied' | 'failed';

export interface IMigration {
  id: string;
  diagramId: string;
  connectionId: string;
  versionNumber: number;
  direction: TMigrationDirection;
  diffSnapshot: IDiffResult;
  migrationDdl: string;
  status: TMigrationStatus;
  appliedAt: string | null;
  createdAt: string;
}

// ─── View Snapshot ───
export interface IViewSnapshot {
  id: string;
  diagramId: string;
  name: string;
  filter: IDiagramFilter;
  layout: IDiagramLayout;
  createdAt: string;
}

// ─── Diff ───
export type TDiffAction = 'added' | 'removed' | 'modified';

export interface ITableDiff {
  tableName: string;
  action: TDiffAction;
  columnDiffs: IColumnDiff[];
  constraintDiffs: IConstraintDiff[];
}

export interface IColumnDiff {
  columnName: string;
  action: TDiffAction;
  virtualValue?: Partial<IColumn>;
  realValue?: Partial<IColumn>;
  changes?: string[];
}

export interface IConstraintDiff {
  constraintName: string;
  action: TDiffAction;
  virtualValue?: IConstraint;
  realValue?: IConstraint;
}

export interface IDiffResult {
  virtualDiagramId: string;
  realDiagramId: string;
  tableDiffs: ITableDiff[];
  hasDifferences: boolean;
  migrationDdl: string;
  comparedAt: string;
}

// ─── Query ───
export interface IQuery {
  id: string;
  name: string;
  description: string;
  sqlContent: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type TQueryStatus = 'success' | 'error';

export interface IQueryHistory {
  id: string;
  queryId: string | null;
  sqlContent: string;
  executionTimeMs: number;
  rowCount: number;
  status: TQueryStatus;
  errorMessage: string | null;
  executedAt: string;
}

export interface IQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  affectedRows?: number;
}

// ─── Document ───
export interface IDocument {
  id: string;
  name: string;
  content: string;
  autoGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TExportFormat = 'markdown' | 'pdf' | 'png' | 'svg';

// ─── Validation ───
export type TValidationSeverity = 'error' | 'warning' | 'info';

export interface IValidationItem {
  severity: TValidationSeverity;
  category: string;
  tableName: string;
  columnName?: string;
  message: string;
  suggestion?: string;
}

export interface IValidationReport {
  items: IValidationItem[];
  summary: { errors: number; warnings: number; infos: number };
  validatedAt: string;
}

// ─── Mocking ───
export interface IMockTableData {
  tableName: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface IMockResult {
  tables: IMockTableData[];
  generatedAt: string;
}
