import { registerSystemInfoHandlers } from './systemInfoHandlers';
import { registerPromptHandlers } from './promptHandlers';

export function registerAllHandlers() {
  registerSystemInfoHandlers();
  registerPromptHandlers();
}
