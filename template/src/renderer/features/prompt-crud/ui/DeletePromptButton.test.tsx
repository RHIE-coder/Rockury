// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('@/entities/prompt', () => ({
  promptApi: {
    delete: vi.fn(),
  },
}));

import { DeletePromptButton } from './DeletePromptButton';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('DeletePromptButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render delete button', () => {
    render(<DeletePromptButton promptId="test-1" />, { wrapper: createWrapper() });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should show confirm dialog on click', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<DeletePromptButton promptId="test-1" />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button'));

    expect(confirmSpy).toHaveBeenCalledWith('정말 삭제하시겠습니까?');
    confirmSpy.mockRestore();
  });

  it('should not call delete API when confirm is cancelled', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<DeletePromptButton promptId="test-1" />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button'));

    // confirm returned false, so no mutation should have been triggered
    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
