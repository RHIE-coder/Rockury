import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockHandle = vi.fn();
vi.mock('electron', () => ({
  ipcMain: { handle: (...args: unknown[]) => mockHandle(...args) },
}));

vi.mock('#/services', () => ({
  promptService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { registerPromptHandlers } from './promptHandlers';
import { promptService } from '#/services';
import { CHANNELS } from '~/shared/ipc/channels';

describe('promptHandlers', () => {
  let handlers: Record<string, (...args: unknown[]) => Promise<unknown>>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHandle.mockClear();
    registerPromptHandlers();

    handlers = {};
    for (const call of mockHandle.mock.calls) {
      handlers[call[0] as string] = call[1] as (...args: unknown[]) => Promise<unknown>;
    }
  });

  describe('GET_PROMPTS', () => {
    it('should return prompts on success', async () => {
      const mockData = [{ id: '1', title: 'Test' }];
      vi.mocked(promptService.getAll).mockReturnValue(mockData as never);

      const result = await handlers[CHANNELS.GET_PROMPTS]();
      expect(result).toEqual({ success: true, data: mockData });
    });

    it('should return empty array on error', async () => {
      vi.mocked(promptService.getAll).mockImplementation(() => { throw new Error('fail'); });

      const result = await handlers[CHANNELS.GET_PROMPTS]();
      expect(result).toEqual({ success: false, data: [] });
    });
  });

  describe('CREATE_PROMPT', () => {
    it('should create prompt on success', async () => {
      const mockData = { id: '1', title: 'New' };
      vi.mocked(promptService.create).mockReturnValue(mockData as never);

      const result = await handlers[CHANNELS.CREATE_PROMPT]({}, { title: 'New' });
      expect(result).toEqual({ success: true, data: mockData });
    });

    it('should return null on error', async () => {
      vi.mocked(promptService.create).mockImplementation(() => { throw new Error('fail'); });

      const result = await handlers[CHANNELS.CREATE_PROMPT]({}, { title: 'New' });
      expect(result).toEqual({ success: false, data: null });
    });
  });

  describe('UPDATE_PROMPT', () => {
    it('should update prompt on success', async () => {
      const mockData = { id: '1', title: 'Updated' };
      vi.mocked(promptService.update).mockReturnValue(mockData as never);

      const result = await handlers[CHANNELS.UPDATE_PROMPT]({}, { id: '1', title: 'Updated' });
      expect(result).toEqual({ success: true, data: mockData });
    });

    it('should return null on error', async () => {
      vi.mocked(promptService.update).mockImplementation(() => { throw new Error('fail'); });

      const result = await handlers[CHANNELS.UPDATE_PROMPT]({}, { id: '1' });
      expect(result).toEqual({ success: false, data: null });
    });
  });

  describe('DELETE_PROMPT', () => {
    it('should return success when deleted', async () => {
      vi.mocked(promptService.delete).mockReturnValue(true);

      const result = await handlers[CHANNELS.DELETE_PROMPT]({}, { id: '1' });
      expect(result).toEqual({ success: true });
    });

    it('should return false on error', async () => {
      vi.mocked(promptService.delete).mockImplementation(() => { throw new Error('fail'); });

      const result = await handlers[CHANNELS.DELETE_PROMPT]({}, { id: '1' });
      expect(result).toEqual({ success: false });
    });
  });
});
