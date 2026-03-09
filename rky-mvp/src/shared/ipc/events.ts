import { CHANNELS } from './channels';
import type { ISystemInfo } from '~/shared/types';
import type {
  IPackage, IPackageResource, TResourceType,
  IConnection, IConnectionFormData, IConnectionTestResult,
  IDiagram, IDiagramLayout, IDiagramVersion, IDiagramFilter, TDiagramType,
  ITable, TDbType, TSchemaObjectType, IDiffResult, IMigration, TMigrationDirection, IViewSnapshot,
  IQuery, IQueryResult, IQueryHistory,
  IDocument, TExportFormat,
  IValidationReport,
  IValidationSuite, IValidationRunResult,
  IMockResult,
  ISchemaChangelog,
  ISchemaSnapshot, ISchemaObjects, IValidationResult,
  IMigrationPack, IMigrationLog,
  ISeedFile,
  IDriftCheckResult,
  TQuerySafetyLevel,
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
  [CHANNELS.CONNECTION_GET_PASSWORD]: {
    args: { id: string };
    response: { success: boolean; data: string };
  };
  [CHANNELS.CONNECTION_REORDER]: {
    args: { orderedIds: string[] };
    response: { success: boolean };
  };
  [CHANNELS.CONNECTION_TEST_BY_ID]: {
    args: { id: string };
    response: { success: boolean; data: IConnectionTestResult };
  };
  [CHANNELS.CONNECTION_SET_IGNORED]: {
    args: { id: string; ignored: boolean };
    response: { success: boolean; data: IConnection };
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
    args: { name: string; type: TDiagramType; version?: string; description?: string; tables?: ITable[] };
    response: { success: boolean; data: IDiagram };
  };
  [CHANNELS.DIAGRAM_UPDATE]: {
    args: { id: string; name?: string; version?: string; tables?: ITable[]; description?: string };
    response: { success: boolean; data: IDiagram };
  };
  [CHANNELS.DIAGRAM_UPDATE_META]: {
    args: { id: string; name?: string; version?: string; description?: string };
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
  [CHANNELS.DIAGRAM_CLONE]: {
    args: { id: string; newName?: string };
    response: { success: boolean; data: IDiagram };
  };

  // Diagram Versions
  [CHANNELS.DIAGRAM_VERSION_LIST]: {
    args: { diagramId: string };
    response: { success: boolean; data: IDiagramVersion[] };
  };
  [CHANNELS.DIAGRAM_VERSION_CREATE]: {
    args: { diagramId: string; name: string; ddlContent: string; schemaSnapshot?: unknown };
    response: { success: boolean; data: IDiagramVersion };
  };
  [CHANNELS.DIAGRAM_VERSION_UPDATE]: {
    args: { id: string; name?: string; ddlContent?: string; schemaSnapshot?: unknown; isLocked?: boolean };
    response: { success: boolean; data: IDiagramVersion };
  };
  [CHANNELS.DIAGRAM_VERSION_DELETE]: {
    args: { id: string };
    response: { success: boolean };
  };
  [CHANNELS.DIAGRAM_VERSION_RESTORE]: {
    args: { versionId: string };
    response: { success: boolean; data: IDiagram };
  };
  [CHANNELS.DIAGRAM_VERSIONS_REORDER]: {
    args: { diagramId: string; orderedVersionIds: string[] };
    response: { success: boolean };
  };
  [CHANNELS.DIAGRAM_VERSION_MOVE]: {
    args: { versionId: string; targetDiagramId: string };
    response: { success: boolean; data: { moved: IDiagramVersion; wasLastVersion: boolean; newBlankVersion?: IDiagramVersion } };
  };
  [CHANNELS.DIAGRAM_VERSION_COPY]: {
    args: { versionId: string; targetDiagramId: string };
    response: { success: boolean; data: IDiagramVersion };
  };

  [CHANNELS.DIAGRAMS_REORDER]: {
    args: { orderedDiagramIds: string[] };
    response: { success: boolean };
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
      rollbackDdl?: string;
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
  [CHANNELS.MIGRATION_ROLLBACK]: {
    args: { migrationId: string };
    response: { success: boolean; data: IMigration };
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

  // Diagram Hidden
  [CHANNELS.DIAGRAM_SET_HIDDEN]: {
    args: { id: string; hidden: boolean };
    response: { success: boolean };
  };

  // Schema (Real)
  [CHANNELS.SCHEMA_FETCH_REAL]: {
    args: { connectionId: string };
    response: { success: boolean; data: IDiagram | null };
  };
  [CHANNELS.SCHEMA_SYNC_REAL]: {
    args: { connectionId: string };
    response: { success: boolean; data: { diagram: IDiagram; changelog?: ISchemaChangelog } };
  };

  // Schema Objects Introspection
  [CHANNELS.SCHEMA_OBJECTS_FETCH]: {
    args: { connectionId: string; objectTypes?: TSchemaObjectType[] };
    response: { success: boolean; data: Partial<ISchemaObjects> };
  };
  [CHANNELS.SCHEMA_OBJECT_DDL]: {
    args: { connectionId: string; objectType: TSchemaObjectType; objectName: string };
    response: { success: boolean; data: { ddl: string } };
  };

  // Query Safety
  [CHANNELS.QUERY_CLASSIFY_SAFETY]: {
    args: { sql: string };
    response: { success: boolean; data: { level: TQuerySafetyLevel; reason: string } };
  };

  // Changelog
  [CHANNELS.CHANGELOG_LIST]: {
    args: { connectionId: string };
    response: { success: boolean; data: ISchemaChangelog[] };
  };
  [CHANNELS.CHANGELOG_DELETE]: {
    args: { id: string };
    response: { success: boolean };
  };

  // Diff
  [CHANNELS.SCHEMA_DIFF]: {
    args: { virtualDiagramId: string; connectionId: string };
    response: { success: boolean; data: IDiffResult };
  };
  [CHANNELS.SCHEMA_DIFF_VIRTUAL]: {
    args: { sourceDiagramId: string; targetDiagramId: string };
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

  // Validation Suite
  [CHANNELS.VALIDATION_SUITE_LIST]: {
    args: void;
    response: { success: boolean; data: IValidationSuite[] };
  };
  [CHANNELS.VALIDATION_SUITE_GET]: {
    args: { id: string };
    response: { success: boolean; data: IValidationSuite };
  };
  [CHANNELS.VALIDATION_SUITE_CREATE]: {
    args: { name: string; description: string };
    response: { success: boolean; data: IValidationSuite };
  };
  [CHANNELS.VALIDATION_SUITE_UPDATE]: {
    args: { id: string; name?: string; description?: string; rules?: IValidationSuite['rules'] };
    response: { success: boolean; data: IValidationSuite };
  };
  [CHANNELS.VALIDATION_SUITE_DELETE]: {
    args: { id: string };
    response: { success: boolean };
  };
  [CHANNELS.VALIDATION_SUITE_RUN]: {
    args: { suiteId: string; connectionId: string };
    response: { success: boolean; data: IValidationRunResult };
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

  // Schema Snapshot
  [CHANNELS.SCHEMA_SNAPSHOT_LIST]: {
    args: { connectionId: string };
    response: { success: boolean; data: ISchemaSnapshot[] };
  };
  [CHANNELS.SCHEMA_SNAPSHOT_CREATE]: {
    args: { connectionId: string; name?: string };
    response: { success: boolean; data: ISchemaSnapshot };
  };
  [CHANNELS.SCHEMA_SNAPSHOT_GET]: {
    args: { id: string };
    response: { success: boolean; data: ISchemaSnapshot };
  };
  [CHANNELS.SCHEMA_SNAPSHOT_DELETE]: {
    args: { id: string };
    response: { success: boolean };
  };
  [CHANNELS.SCHEMA_SNAPSHOT_RENAME]: {
    args: { id: string; name: string };
    response: { success: boolean; data: ISchemaSnapshot };
  };
  [CHANNELS.SCHEMA_SNAPSHOT_VALIDATE]: {
    args: { snapshotId: string };
    response: { success: boolean; data: IValidationResult };
  };

  // Migration Pack
  [CHANNELS.MIGRATION_PACK_LIST]: {
    args: { diagramId: string };
    response: { success: boolean; data: IMigrationPack[] };
  };
  [CHANNELS.MIGRATION_PACK_CREATE]: {
    args: {
      connectionId: string;
      diagramId: string;
      sourceVersionId: string | null;
      targetVersionId: string;
    };
    response: { success: boolean; data: IMigrationPack };
  };
  [CHANNELS.MIGRATION_PACK_GET]: {
    args: { id: string };
    response: { success: boolean; data: IMigrationPack };
  };
  [CHANNELS.MIGRATION_PACK_UPDATE_DML]: {
    args: { id: string; seedDml: string };
    response: { success: boolean; data: IMigrationPack };
  };
  [CHANNELS.MIGRATION_PACK_EXECUTE]: {
    args: { id: string };
    response: { success: boolean; data: IMigrationPack };
  };
  [CHANNELS.MIGRATION_PACK_ROLLBACK]: {
    args: { id: string };
    response: { success: boolean; data: IMigrationPack };
  };
  [CHANNELS.MIGRATION_PACK_DELETE]: {
    args: { id: string };
    response: { success: boolean };
  };

  // Drift Detection
  [CHANNELS.DRIFT_LIGHTWEIGHT_CHECK]: {
    args: { connectionId: string };
    response: { success: boolean; data: IDriftCheckResult };
  };
  [CHANNELS.DRIFT_FULL_CHECK]: {
    args: { connectionId: string };
    response: { success: boolean; data: IDriftCheckResult };
  };

  // Seed
  [CHANNELS.SEED_LIST]: {
    args: void;
    response: { success: boolean; data: ISeedFile[] };
  };
  [CHANNELS.SEED_CREATE]: {
    args: { name: string; description: string; dmlContent: string; targetTables: string[] };
    response: { success: boolean; data: ISeedFile };
  };
  [CHANNELS.SEED_UPDATE]: {
    args: { id: string; name?: string; description?: string; dmlContent?: string; targetTables?: string[] };
    response: { success: boolean; data: ISeedFile };
  };
  [CHANNELS.SEED_DELETE]: {
    args: { id: string };
    response: { success: boolean };
  };
  [CHANNELS.SEED_CAPTURE]: {
    args: { connectionId: string; tableName: string; whereClause?: string; limit?: number };
    response: { success: boolean; data: { dml: string; rowCount: number } };
  };
  [CHANNELS.SEED_CAPTURE_WITH_FK]: {
    args: {
      connectionId: string;
      tableName: string;
      whereClause?: string;
      limit?: number;
      saveMode: 'append' | 'overwrite' | 'new';
      targetSeedId?: string;
      newSeedName?: string;
    };
    response: { success: boolean; data: { dml: string; rowCount: number; fkOrderedTables: string[]; seedId: string } };
  };
  [CHANNELS.SEED_APPLY]: {
    args: { seedId: string; connectionId: string };
    response: { success: boolean; data: { appliedRows: number } };
  };

  // Forward (Concurrent Control)
  [CHANNELS.FORWARD_PRE_CHECK]: {
    args: { connectionId: string; diagramId: string; targetVersionId: string };
    response: {
      success: boolean;
      data: {
        preSnapshotId: string;
        checksum: string;
        diff: IDiffResult;
        migrationStatements: string[];
      };
    };
  };
  [CHANNELS.FORWARD_EXECUTE_STEP]: {
    args: {
      connectionId: string;
      migrationPackId: string;
      statementIndex: number;
      expectedChecksum: string;
    };
    response: {
      success: boolean;
      data: {
        log: IMigrationLog;
        currentChecksum: string;
        checksumMatch: boolean;
      };
    };
  };
  [CHANNELS.FORWARD_ROLLBACK]: {
    args: { migrationPackId: string };
    response: { success: boolean; data: IMigrationPack };
  };

  // Mocking Apply
  [CHANNELS.MOCK_APPLY]: {
    args: { connectionId: string; mockResult: IMockResult };
    response: { success: boolean; data: { appliedRows: number } };
  };

  // Composite
  [CHANNELS.SCHEMA_VALIDATE_AGAINST_VERSION]: {
    args: { connectionId: string; versionId: string };
    response: { success: boolean; data: IValidationResult };
  };
}
