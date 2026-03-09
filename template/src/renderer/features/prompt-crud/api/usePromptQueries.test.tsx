// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('@/entities/prompt', () => ({
  promptApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { usePrompts, useCreatePrompt, useUpdatePrompt, useDeletePrompt } from './usePromptQueries';
import { promptApi } from '@/entities/prompt';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('usePromptQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('usePrompts', () => {
    it('should fetch prompts successfully', async () => {
      const mockData = [{ id: '1', title: 'Test' }];
      vi.mocked(promptApi.getAll).mockResolvedValue({ success: true, data: mockData } as never);

      const { result } = renderHook(() => usePrompts(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
    });

    it('should throw on failed response', async () => {
      vi.mocked(promptApi.getAll).mockResolvedValue({ success: false, data: [] } as never);

      const { result } = renderHook(() => usePrompts(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useCreatePrompt', () => {
    it('should create prompt successfully', async () => {
      const newPrompt = { id: '2', title: 'New' };
      vi.mocked(promptApi.create).mockResolvedValue({ success: true, data: newPrompt } as never);

      const { result } = renderHook(() => useCreatePrompt(), { wrapper: createWrapper() });

      result.current.mutate({
        title: 'New',
        category: 'page-generation',
        description: 'Desc',
        template: 'T',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(newPrompt);
    });
  });

  describe('useUpdatePrompt', () => {
    it('should update prompt successfully', async () => {
      const updated = { id: '1', title: 'Updated' };
      vi.mocked(promptApi.update).mockResolvedValue({ success: true, data: updated } as never);

      const { result } = renderHook(() => useUpdatePrompt(), { wrapper: createWrapper() });

      result.current.mutate({ id: '1', title: 'Updated' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useDeletePrompt', () => {
    it('should delete prompt successfully', async () => {
      vi.mocked(promptApi.delete).mockResolvedValue({ success: true } as never);

      const { result } = renderHook(() => useDeletePrompt(), { wrapper: createWrapper() });

      result.current.mutate('1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
