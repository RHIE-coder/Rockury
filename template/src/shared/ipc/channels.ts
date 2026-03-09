/**
 * IPC Channel definitions
 * Main-Renderer 간 통신 채널 정의
 */
export const CHANNELS = {
  // App
  GET_APP_VERSION: 'GET_APP_VERSION',
  // System
  GET_SYSTEM_INFO: 'GET_SYSTEM_INFO',
  // Prompts
  GET_PROMPTS: 'GET_PROMPTS',
  CREATE_PROMPT: 'CREATE_PROMPT',
  UPDATE_PROMPT: 'UPDATE_PROMPT',
  DELETE_PROMPT: 'DELETE_PROMPT',
} as const;

export type TChannelKeys = keyof typeof CHANNELS;
