import { CHANNELS } from './channels';
import type {
  IPrompt,
  ICreatePromptRequest,
  IUpdatePromptRequest,
  ISystemInfo,
} from '~/shared/types';

export interface IEvents {
  // App
  [CHANNELS.GET_APP_VERSION]: {
    args: void;
    response: { success: boolean; version: string };
  };
  // System
  [CHANNELS.GET_SYSTEM_INFO]: {
    args: void;
    response: { success: boolean; data: ISystemInfo };
  };
  // Prompts
  [CHANNELS.GET_PROMPTS]: {
    args: void;
    response: { success: boolean; data: IPrompt[] };
  };
  [CHANNELS.CREATE_PROMPT]: {
    args: ICreatePromptRequest;
    response: { success: boolean; data: IPrompt };
  };
  [CHANNELS.UPDATE_PROMPT]: {
    args: IUpdatePromptRequest;
    response: { success: boolean; data: IPrompt };
  };
  [CHANNELS.DELETE_PROMPT]: {
    args: { id: string };
    response: { success: boolean };
  };
}