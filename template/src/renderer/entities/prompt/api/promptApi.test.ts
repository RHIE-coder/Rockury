import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockApi = {
  GET_PROMPTS: vi.fn(),
  CREATE_PROMPT: vi.fn(),
  UPDATE_PROMPT: vi.fn(),
  DELETE_PROMPT: vi.fn(),
};

vi.mock('@/shared/api', () => ({
  getElectronApi: () => mockApi,
}));

import { promptApi } from './promptApi';

describe('promptApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET_PROMPTS for getAll', async () => {
    mockApi.GET_PROMPTS.mockResolvedValue({ success: true, data: [] });

    await promptApi.getAll();
    expect(mockApi.GET_PROMPTS).toHaveBeenCalled();
  });

  it('should call CREATE_PROMPT with data', async () => {
    const data = { title: 'New', category: 'page-generation' as const, description: 'Desc', template: 'T' };
    mockApi.CREATE_PROMPT.mockResolvedValue({ success: true, data: {} });

    await promptApi.create(data);
    expect(mockApi.CREATE_PROMPT).toHaveBeenCalledWith(data);
  });

  it('should call UPDATE_PROMPT with data', async () => {
    const data = { id: '1', title: 'Updated' };
    mockApi.UPDATE_PROMPT.mockResolvedValue({ success: true, data: {} });

    await promptApi.update(data);
    expect(mockApi.UPDATE_PROMPT).toHaveBeenCalledWith(data);
  });

  it('should call DELETE_PROMPT with id wrapped in object', async () => {
    mockApi.DELETE_PROMPT.mockResolvedValue({ success: true });

    await promptApi.delete('test-id');
    expect(mockApi.DELETE_PROMPT).toHaveBeenCalledWith({ id: 'test-id' });
  });
});
