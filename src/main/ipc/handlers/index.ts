import { registerSystemInfoHandlers } from './systemInfoHandlers';
import { registerPackageHandlers } from './packageHandlers';
import { registerConnectionHandlers } from './connectionHandlers';
import { registerSchemaHandlers } from './schemaHandlers';
import { registerQueryHandlers } from './queryHandlers';
import { registerDocumentHandlers } from './documentHandlers';
import { registerValidationHandlers } from './validationHandlers';
import { registerMockingHandlers } from './mockingHandlers';
import { registerMigrationHandlers } from './migrationHandlers';
import { registerViewSnapshotHandlers } from './viewSnapshotHandlers';
import { registerMigrationPackHandlers } from './migrationPackHandlers';
import { registerDriftDetectionHandlers } from './driftDetectionHandlers';
import { registerSeedHandlers } from './seedHandlers';

export function registerAllHandlers() {
  registerSystemInfoHandlers();
  registerPackageHandlers();
  registerConnectionHandlers();
  registerSchemaHandlers();
  registerMigrationHandlers();
  registerQueryHandlers();
  registerDocumentHandlers();
  registerValidationHandlers();
  registerMockingHandlers();
  registerViewSnapshotHandlers();
  registerMigrationPackHandlers();
  registerDriftDetectionHandlers();
  registerSeedHandlers();
}
