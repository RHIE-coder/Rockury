import { CHANNELS } from './channels';
import type { ISystemInfo } from '~/shared/types';
import type {
  IPackage, IPackageResource, TResourceType,
  IConnection, IConnectionFormData, IConnectionTestResult,
  IDiagram, IDiagramLayout, IDiagramVersion, IDiagramFilter, TDiagramType,
  ITable, TDbType, IDiffResult, IMigration, TMigrationDirection, IViewSnapshot,
  IQuery, IQueryResult, IQueryHistory,
  IDocument, TExportFormat,
  IValidationReport,
  IMockResult,
} from '~/shared/types/db';

export interface IEvents {
  // App
  [CHANNELS.GET_APP_VERSION]: {
    args: void;
    response: { success: boolean; version: string };
  };
  [CHANNELS.GET_SYSTEM_INFO]: {
    args: void;
    response: { success: boolean; data: ISystemInfo };
  };

  // Package
  [CHANNELS.PACKAGE_LIST]: {
    args: void;
    response: { success: boolean; data: IPackage[] };
  };
  [CHANNELS.PACKAGE_GET]: {
    args: { id: string };
    response: { success: boolean; data: IPackage };
  };
  [CHANNELS.PACKAGE_CREATE]: {
    args: { name: string; description: string };
    response: { success: boolean; data: IPackage };
  };
  [CHANNELS.PACKAGE_UPDATE]: {
    args: { id: string; name: string; description: string };
    response: { success: boolean; data: IPackage };
  };
  [CHANNELS.PACKAGE_DELETE]: {
    args: { id: string };
    response: { success: boolean };
  };
  [CHANNELS.PACKAGE_LINK_RESOURCE]: {
    args: { packageId: string; resourceType: TResourceType; resourceId: string };
    response: { success: boolean; data: IPackageResource };
  };
  [CHANNELS.PACKAGE_UNLINK_RESOURCE]: {
    args: { packageId: string; resourceType: TResourceType; resourceId: string };
    response: { success: boolean };
  };
  [CHANNELS.PACKAGE_GET_RESOURCES]: {
    args: { packageId: string };
    response: { success: boolean; data: IPackageResource[] };
  };

  // Connection
  [CHANNELS.CONNECTION_LIST]: {
    args: void;
    response: { success: boolean; data: IConnection[] };
  };
  [CHANNELS.CONNECTION_GET]: {
    args: { id: string };
    response: { success: boolean; data: IConnection };
  };
  [CHANNELS.CONNECTION_CREATE]: {
    args: IConnectionFormData;
    response: { success: boolean; data: IConnection };
  };
  [CHANNELS.CONNECTION_UPDATE]: {
    args: { id: string } & Partial<IConnectionFormData>;
    response: { success: boolean; data: IConnection };
  };
  [CHANNELS.CONNECTION_DELETE]: {
    args: { id: string };
    response: { success: boolean };
  };
  [CHANNELS.CONNECTION_TEST]: {
    args: IConnectionFormData;
    response: { success: boolean; data: IConnectionTestResult };
  };

  // Diagram
  [CHANNELS.DIAGRAM_LIST]: {
    args: { type?: TDiagramType };
    response: { success: boolean; data: IDiagram[] };
  };
  [CHANNELS.DIAGRAM_GET]: {
    args: { id: string };
    response: { success: boolean; data: IDiagram };
  };
  [CHANNELS.DIAGRAM_CREATE]: {
    args: { name: string; type: TDiagramType; version?: string; tables?: ITable[] };
    response: { success: boolean; data: IDiagram };
  };
  [CHANNELS.DIAGRAM_UPDATE]: {
    args: { id: string; name?: string; version?: string; tables?: ITable[] };
    response: { success: boolean; data: IDiagram };
  };
  [CHANNELS.DIAGRAM_UPDATE_META]: {
    args: { id: string; name?: string; version?: string };
    response: { success: boolean; data: IDiagram };
  };
  [CHANNELS.DIAGRAM_DELETE]: {
    args: { id: string };
    response: { success: boolean };
  };
  [CHANNELS.DIAGRAM_GET_LAYOUT]: {
    args: { diagramId: string };
    response: { success: boolean; data: IDiagramLayout };
  };
  [CHANNELS.DIAGRAM_SAVE_LAYOUT]: {
    args: IDiagramLayout;
    response: { success: boolean };
  };

  // Diagram Versions
  [CHANNELS.DIAGRAM_VERSION_LIST]: {
    args: { diagramId: string };
    response: { success: boolean; data: IDiagramVersion[] };
  };
  [CHANNELS.DIAGRAM_VERSION_CREATE]: {
    args: { diagramId: string; ddlContent: string };
    response: { success: boolean; data: IDiagramVersion };
  };
  [CHANNELS.DIAGRAM_VERSION_RESTORE]: {
    args: { versionId: string };
    response: { success: boolean; data: IDiagram };
  };

  // Migration
  [CHANNELS.MIGRATION_LIST]: {
    args: { diagramId: string; connectionId?: string };
    response: { success: boolean; data: IMigration[] };
  };
  [CHANNELS.MIGRATION_CREATE]: {
    args: {
      diagramId: string;
      connectionId: string;
      direction: TMigrationDirection;
      diffSnapshot: IDiffResult;
      migrationDdl: string;
    };
    response: { success: boolean; data: IMigration };
  };
  [CHANNELS.MIGRATION_APPLY]: {
    args: { migrationId: string };
    response: { success: boolean; data: IMigration };
  };
  [CHANNELS.MIGRATION_DELETE]: {
    args: { migrationId: string };
    response: { success: boolean };
  };

  // View Snapshot
  [CHANNELS.VIEW_SNAPSHOT_LIST]: {
    args: { diagramId: string };
    response: { success: boolean; data: IViewSnapshot[] };
  };
  [CHANNELS.VIEW_SNAPSHOT_CREATE]: {
    args: { diagramId: string; name: string; filter: IDiagramFilter; layout: IDiagramLayout };
    response: { success: boolean; data: IViewSnapshot };
  };
  [CHANNELS.VIEW_SNAPSHOT_RESTORE]: {
    args: { snapshotId: string };
    response: { success: boolean; data: IViewSnapshot };
  };
  [CHANNELS.VIEW_SNAPSHOT_DELETE]: {
    args: { snapshotId: string };
    response: { success: boolean };
  };

  // Schema (Real)
  [CHANNELS.SCHEMA_FETCH_REAL]: {
    args: { connectionId: string };
    response: { success: boolean; data: ITable[] };
  };

  // Diff
  [CHANNELS.SCHEMA_DIFF]: {
    args: { virtualDiagramId: string; connectionId: string };
    response: { success: boolean; data: IDiffResult };
  };
  [CHANNELS.SCHEMA_APPLY_REAL_TO_VIRTUAL]: {
    args: { virtualDiagramId: string; connectionId: string };
    response: { success: boolean; data: IDiagram };
  };

  // DDL
  [CHANNELS.DDL_PARSE]: {
    args: { ddl: string; dbType: TDbType };
    response: { success: boolean; data: ITable[] };
  };
  [CHANNELS.DDL_GENERATE]: {
    args: { tables: ITable[]; dbType: TDbType };
    response: { success: boolean; data: { ddl: string } };
  };

  // Query
  [CHANNELS.QUERY_EXECUTE]: {
    args: { connectionId: string; sql: string };
    response: { success: boolean; data: IQueryResult };
  };
  [CHANNELS.QUERY_LIST]: {
    args: void;
    response: { success: boolean; data: IQuery[] };
  };
  [CHANNELS.QUERY_SAVE]: {
    args: { name: string; description: string; sqlContent: string; tags: string[] };
    response: { success: boolean; data: IQuery };
  };
  [CHANNELS.QUERY_UPDATE]: {
    args: { id: string; name?: string; description?: string; sqlContent?: string; tags?: string[] };
    response: { success: boolean; data: IQuery };
  };
  [CHANNELS.QUERY_DELETE]: {
    args: { id: string };
    response: { success: boolean };
  };
  [CHANNELS.QUERY_HISTORY_LIST]: {
    args: { limit?: number };
    response: { success: boolean; data: IQueryHistory[] };
  };

  // Document
  [CHANNELS.DOCUMENT_LIST]: {
    args: void;
    response: { success: boolean; data: IDocument[] };
  };
  [CHANNELS.DOCUMENT_GET]: {
    args: { id: string };
    response: { success: boolean; data: IDocument };
  };
  [CHANNELS.DOCUMENT_CREATE]: {
    args: { name: string; content: string };
    response: { success: boolean; data: IDocument };
  };
  [CHANNELS.DOCUMENT_UPDATE]: {
    args: { id: string; name?: string; content?: string };
    response: { success: boolean; data: IDocument };
  };
  [CHANNELS.DOCUMENT_DELETE]: {
    args: { id: string };
    response: { success: boolean };
  };
  [CHANNELS.DOCUMENT_AUTO_GENERATE]: {
    args: { diagramId: string };
    response: { success: boolean; data: IDocument };
  };
  [CHANNELS.DOCUMENT_EXPORT]: {
    args: { documentId: string; format: TExportFormat; outputPath?: string };
    response: { success: boolean; data: { filePath: string } };
  };

  // Validation
  [CHANNELS.VALIDATION_RUN]: {
    args: { virtualDiagramId: string; connectionId: string };
    response: { success: boolean; data: IValidationReport };
  };

  // Mocking
  [CHANNELS.MOCK_GENERATE]: {
    args: { tableIds: string[]; diagramId: string; rowCount: number };
    response: { success: boolean; data: IMockResult };
  };
  [CHANNELS.MOCK_EXPORT]: {
    args: { mockResult: IMockResult; format: 'sql' | 'csv' | 'json' };
    response: { success: boolean; data: { content: string } };
  };
}
