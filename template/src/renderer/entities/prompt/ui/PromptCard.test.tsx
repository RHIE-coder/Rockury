// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptCard } from './PromptCard';
import type { IPrompt } from '../model';

const mockPrompt: IPrompt = {
  id: 'test-1',
  title: 'Test Prompt',
  category: 'page-generation',
  description: 'A test description',
  template: 'Template content',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('PromptCard', () => {
  it('should render prompt title and description', () => {
    render(<PromptCard prompt={mockPrompt} />);

    expect(screen.getByText('Test Prompt')).toBeInTheDocument();
    expect(screen.getByText('A test description')).toBeInTheDocument();
  });

  it('should render category badge', () => {
    render(<PromptCard prompt={mockPrompt} />);
    expect(screen.getByText('Page 생성')).toBeInTheDocument();
  });

  it('should call onClick when card is clicked', () => {
    const handleClick = vi.fn();
    render(<PromptCard prompt={mockPrompt} onClick={handleClick} />);

    fireEvent.click(screen.getByText('Test Prompt'));
    expect(handleClick).toHaveBeenCalledWith(mockPrompt);
  });

  it('should render actions when provided', () => {
    render(
      <PromptCard prompt={mockPrompt} actions={<button>Action</button>} />,
    );
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('should not render actions section when not provided', () => {
    const { container } = render(<PromptCard prompt={mockPrompt} />);
    expect(container.querySelector('[data-slot="card-content"]')).not.toBeInTheDocument();
  });
});
