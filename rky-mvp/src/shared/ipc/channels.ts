/**
 * IPC Channel definitions
 * Main-Renderer 간 통신 채널 정의
 */
export const CHANNELS = {
  // App
  GET_APP_VERSION: 'GET_APP_VERSION',
  // Add more channels as needed...
} as const;

export type TChannelKeys = keyof typeof CHANNELS;
