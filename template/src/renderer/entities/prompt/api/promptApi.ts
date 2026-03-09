import { getElectronApi } from '@/shared/api';
import type { ICreatePromptRequest, IUpdatePromptRequest } from '../model';

export const promptApi = {
  getAll: () => getElectronApi().GET_PROMPTS(),
  create: (data: ICreatePromptRequest) => getElectronApi().CREATE_PROMPT(data),
  update: (data: IUpdatePromptRequest) => getElectronApi().UPDATE_PROMPT(data),
  delete: (id: string) => getElectronApi().DELETE_PROMPT({ id }),
};
