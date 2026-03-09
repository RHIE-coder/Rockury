import { describe, it, expect, vi } from 'vitest';

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => 'mock-uuid'),
}));

import { DEFAULT_PROMPTS } from './defaultPrompts';
import type { TPromptCategory } from '~/shared/types';

const VALID_CATEGORIES: TPromptCategory[] = [
  'page-generation',
  'feature-generation',
  'entity-generation',
  'ipc-addition',
  'crud-fullset',
  'component-generation',
];

describe('DEFAULT_PROMPTS', () => {
  it('should contain exactly 6 prompts', () => {
    expect(DEFAULT_PROMPTS).toHaveLength(6);
  });

  it('should have all required fields on each prompt', () => {
    for (const prompt of DEFAULT_PROMPTS) {
      expect(prompt).toHaveProperty('id');
      expect(prompt).toHaveProperty('title');
      expect(prompt).toHaveProperty('category');
      expect(prompt).toHaveProperty('description');
      expect(prompt).toHaveProperty('template');
      expect(prompt).toHaveProperty('createdAt');
      expect(prompt).toHaveProperty('updatedAt');
    }
  });

  it('should have valid categories', () => {
    for (const prompt of DEFAULT_PROMPTS) {
      expect(VALID_CATEGORIES).toContain(prompt.category);
    }
  });

  it('should cover all 6 categories', () => {
    const categories = DEFAULT_PROMPTS.map((p) => p.category);
    for (const category of VALID_CATEGORIES) {
      expect(categories).toContain(category);
    }
  });

  it('should have non-empty templates', () => {
    for (const prompt of DEFAULT_PROMPTS) {
      expect(prompt.template.length).toBeGreaterThan(0);
    }
  });
});
