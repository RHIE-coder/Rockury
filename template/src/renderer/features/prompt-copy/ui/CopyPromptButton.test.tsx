// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CopyPromptButton } from './CopyPromptButton';

describe('CopyPromptButton', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('should render copy button', () => {
    render(<CopyPromptButton text="Hello" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should copy text to clipboard on click', async () => {
    render(<CopyPromptButton text="Template content" />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Template content');
    });
  });
});
