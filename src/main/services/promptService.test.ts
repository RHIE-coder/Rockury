import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IPrompt } from '~/shared/types';

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => 'mock-uuid'),
}));

vi.mock('#/repositories', () => ({
  promptRepository: {
    isEmpty: vi.fn(),
    seed: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn((p: IPrompt) => p),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('./data/defaultPrompts', () => ({
  DEFAULT_PROMPTS: [{ id: 'default-1', title: 'Default' }],
}));

import { promptService } from './promptService';
import { promptRepository } from '#/repositories';

const mockPrompt: IPrompt = {
  id: 'existing-id',
  title: 'Existing',
  category: 'page-generation',
  description: 'Test',
  template: 'Template',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('promptService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-02-07T00:00:00.000Z');
  });

  describe('initialize', () => {
    it('should seed defaults when repository is empty', () => {
      vi.mocked(promptRepository.isEmpty).mockReturnValue(true);

      promptService.initialize();

      expect(promptRepository.seed).toHaveBeenCalledWith([{ id: 'default-1', title: 'Default' }]);
    });

    it('should skip seeding when repository is not empty', () => {
      vi.mocked(promptRepository.isEmpty).mockReturnValue(false);

      promptService.initialize();

      expect(promptRepository.seed).not.toHaveBeenCalled();
    });
  });

  describe('getAll', () => {
    it('should delegate to repository findAll', () => {
      vi.mocked(promptRepository.findAll).mockReturnValue([mockPrompt]);

      const result = promptService.getAll();

      expect(result).toEqual([mockPrompt]);
      expect(promptRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create prompt with UUID and timestamps', () => {
      const request = {
        title: 'New Prompt',
        category: 'page-generation' as const,
        description: 'New desc',
        template: 'New template',
      };

      const result = promptService.create(request);

      expect(result.id).toBe('mock-uuid');
      expect(result.title).toBe('New Prompt');
      expect(result.createdAt).toBe('2026-02-07T00:00:00.000Z');
      expect(result.updatedAt).toBe('2026-02-07T00:00:00.000Z');
      expect(promptRepository.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should delegate to repository update', () => {
      vi.mocked(promptRepository.update).mockReturnValue({ ...mockPrompt, title: 'Updated' });

      const result = promptService.update({ id: 'existing-id', title: 'Updated' });

      expect(result?.title).toBe('Updated');
      expect(promptRepository.update).toHaveBeenCalledWith('existing-id', { title: 'Updated' });
    });
  });

  describe('delete', () => {
    it('should delegate to repository delete', () => {
      vi.mocked(promptRepository.delete).mockReturnValue(true);

      const result = promptService.delete('existing-id');

      expect(result).toBe(true);
      expect(promptRepository.delete).toHaveBeenCalledWith('existing-id');
    });
  });
});
