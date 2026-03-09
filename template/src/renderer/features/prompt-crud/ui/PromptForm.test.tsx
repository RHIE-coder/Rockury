// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptForm } from './PromptForm';
import type { IPrompt } from '@/entities/prompt';

const mockPrompt: IPrompt = {
  id: 'test-1',
  title: 'Test',
  category: 'page-generation',
  description: 'Desc',
  template: 'Template',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('PromptForm', () => {
  it('should render empty form for create mode', () => {
    render(<PromptForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByPlaceholderText('프롬프트 제목')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('should render pre-filled form for edit mode', () => {
    render(<PromptForm initial={mockPrompt} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByPlaceholderText('프롬프트 제목')).toHaveValue('Test');
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
  });

  it('should call onSubmit with form data', () => {
    const handleSubmit = vi.fn();
    render(<PromptForm onSubmit={handleSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('프롬프트 제목'), { target: { value: 'New Title' } });
    fireEvent.change(screen.getByPlaceholderText('간단한 설명'), { target: { value: 'New Desc' } });
    fireEvent.change(screen.getByPlaceholderText(/프롬프트 템플릿/), { target: { value: 'New Template' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Create' }).closest('form')!);

    expect(handleSubmit).toHaveBeenCalledWith({
      title: 'New Title',
      category: 'page-generation',
      description: 'New Desc',
      template: 'New Template',
    });
  });

  it('should call onCancel when cancel button clicked', () => {
    const handleCancel = vi.fn();
    render(<PromptForm onSubmit={vi.fn()} onCancel={handleCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(handleCancel).toHaveBeenCalled();
  });

  it('should disable submit button when loading', () => {
    render(<PromptForm onSubmit={vi.fn()} onCancel={vi.fn()} isLoading />);
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });
});
