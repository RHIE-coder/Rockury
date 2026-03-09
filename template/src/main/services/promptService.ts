import { randomUUID } from 'node:crypto';
import type { IPrompt, ICreatePromptRequest, IUpdatePromptRequest } from '~/shared/types';
import { promptRepository } from '#/repositories';
import { DEFAULT_PROMPTS } from './data/defaultPrompts';

export const promptService = {
  initialize(): void {
    if (promptRepository.isEmpty()) {
      promptRepository.seed(DEFAULT_PROMPTS);
    }
  },

  getAll(): IPrompt[] {
    return promptRepository.findAll();
  },

  create(request: ICreatePromptRequest): IPrompt {
    const now = new Date().toISOString();
    const prompt: IPrompt = {
      id: randomUUID(),
      ...request,
      createdAt: now,
      updatedAt: now,
    };
    return promptRepository.create(prompt);
  },

  update(request: IUpdatePromptRequest): IPrompt | undefined {
    const { id, ...data } = request;
    return promptRepository.update(id, data);
  },

  delete(id: string): boolean {
    return promptRepository.delete(id);
  },
};
