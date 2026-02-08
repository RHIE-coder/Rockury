import { registerSystemInfoHandlers } from './systemInfoHandlers';
import { registerPackageHandlers } from './packageHandlers';
import { registerConnectionHandlers } from './connectionHandlers';
import { registerSchemaHandlers } from './schemaHandlers';
import { registerQueryHandlers } from './queryHandlers';
import { registerDocumentHandlers } from './documentHandlers';
import { registerValidationHandlers } from './validationHandlers';
import { registerMockingHandlers } from './mockingHandlers';

export function registerAllHandlers() {
  registerSystemInfoHandlers();
  registerPackageHandlers();
  registerConnectionHandlers();
  registerSchemaHandlers();
  registerQueryHandlers();
  registerDocumentHandlers();
  registerValidationHandlers();
  registerMockingHandlers();
}
