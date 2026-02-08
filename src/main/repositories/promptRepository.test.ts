import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IPrompt } from '~/shared/types';

vi.mock('#/infrastructure', () => ({
  fileSystem: {
    getDataPath: vi.fn(() => '/mock/prompts.json'),
    readJsonFile: vi.fn(),
    writeJsonFile: vi.fn(),
  },
}));

import { promptRepository } from './promptRepository';
import { fileSystem } from '#/infrastructure';

const mockPrompt: IPrompt = {
  id: 'test-id-1',
  title: 'Test Prompt',
  category: 'page-generation',
  description: 'A test prompt',
  template: 'Template content',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('promptRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all prompts from file', () => {
      vi.mocked(fileSystem.readJsonFile).mockReturnValue([mockPrompt]);

      const result = promptRepository.findAll();

      expect(result).toEqual([mockPrompt]);
      expect(fileSystem.readJsonFile).toHaveBeenCalledWith('/mock/prompts.json', []);
    });
  });

  describe('findById', () => {
    it('should return prompt when found', () => {
      vi.mocked(fileSystem.readJsonFile).mockReturnValue([mockPrompt]);

      const result = promptRepository.findById('test-id-1');
      expect(result).toEqual(mockPrompt);
    });

    it('should return undefined when not found', () => {
      vi.mocked(fileSystem.readJsonFile).mockReturnValue([mockPrompt]);

      const result = promptRepository.findById('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should append prompt and write to file', () => {
      vi.mocked(fileSystem.readJsonFile).mockReturnValue([]);

      const result = promptRepository.create(mockPrompt);

      expect(result).toEqual(mockPrompt);
      expect(fileSystem.writeJsonFile).toHaveBeenCalledWith(
        '/mock/prompts.json',
        [mockPrompt],
      );
    });
  });

  describe('update', () => {
    it('should update prompt when found', () => {
      vi.mocked(fileSystem.readJsonFile).mockReturnValue([{ ...mockPrompt }]);
      const dateSpy = vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-02-01T00:00:00.000Z');

      const result = promptRepository.update('test-id-1', { title: 'Updated' });

      expect(result?.title).toBe('Updated');
      expect(result?.updatedAt).toBe('2026-02-01T00:00:00.000Z');
      expect(fileSystem.writeJsonFile).toHaveBeenCalled();

      dateSpy.mockRestore();
    });

    it('should return undefined when not found', () => {
      vi.mocked(fileSystem.readJsonFile).mockReturnValue([mockPrompt]);

      const result = promptRepository.update('non-existent', { title: 'Updated' });
      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should return true and remove prompt when found', () => {
      vi.mocked(fileSystem.readJsonFile).mockReturnValue([mockPrompt]);

      const result = promptRepository.delete('test-id-1');

      expect(result).toBe(true);
      expect(fileSystem.writeJsonFile).toHaveBeenCalledWith('/mock/prompts.json', []);
    });

    it('should return false when not found', () => {
      vi.mocked(fileSystem.readJsonFile).mockReturnValue([mockPrompt]);

      const result = promptRepository.delete('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('isEmpty', () => {
    it('should return true when no prompts', () => {
      vi.mocked(fileSystem.readJsonFile).mockReturnValue([]);
      expect(promptRepository.isEmpty()).toBe(true);
    });

    it('should return false when prompts exist', () => {
      vi.mocked(fileSystem.readJsonFile).mockReturnValue([mockPrompt]);
      expect(promptRepository.isEmpty()).toBe(false);
    });
  });

  describe('seed', () => {
    it('should write defaults to file', () => {
      const defaults = [mockPrompt];
      promptRepository.seed(defaults);

      expect(fileSystem.writeJsonFile).toHaveBeenCalledWith(
        '/mock/prompts.json',
        defaults,
      );
    });
  });
});
