import type { IPrompt } from '~/shared/types';
import { fileSystem } from '#/infrastructure';

const DATA_FILE = 'prompts.json';

function getFilePath(): string {
  return fileSystem.getDataPath(DATA_FILE);
}

export const promptRepository = {
  findAll(): IPrompt[] {
    return fileSystem.readJsonFile<IPrompt[]>(getFilePath(), []);
  },

  findById(id: string): IPrompt | undefined {
    return this.findAll().find((p) => p.id === id);
  },

  create(prompt: IPrompt): IPrompt {
    const prompts = this.findAll();
    prompts.push(prompt);
    fileSystem.writeJsonFile(getFilePath(), prompts);
    return prompt;
  },

  update(id: string, data: Partial<IPrompt>): IPrompt | undefined {
    const prompts = this.findAll();
    const index = prompts.findIndex((p) => p.id === id);
    if (index === -1) return undefined;

    prompts[index] = { ...prompts[index], ...data, updatedAt: new Date().toISOString() };
    fileSystem.writeJsonFile(getFilePath(), prompts);
    return prompts[index];
  },

  delete(id: string): boolean {
    const prompts = this.findAll();
    const filtered = prompts.filter((p) => p.id !== id);
    if (filtered.length === prompts.length) return false;
    fileSystem.writeJsonFile(getFilePath(), filtered);
    return true;
  },

  isEmpty(): boolean {
    return this.findAll().length === 0;
  },

  seed(defaults: IPrompt[]): void {
    fileSystem.writeJsonFile(getFilePath(), defaults);
  },
};
