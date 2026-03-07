// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DdlEditorView } from './DdlEditorView';

vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value }: { value: string }) => <div data-testid="codemirror">{value}</div>,
}));

vi.mock('@codemirror/lang-sql', () => ({
  sql: () => [],
}));

vi.mock('@codemirror/search', () => ({
  search: () => [],
  openSearchPanel: vi.fn(),
}));

vi.mock('@codemirror/view', () => ({
  EditorView: {
    scrollIntoView: vi.fn(),
  },
}));

describe('DdlEditorView layout guards', () => {
  it('applies min-width and overflow guards to prevent flex width push', () => {
    const { container } = render(<DdlEditorView readOnly tables={[]} />);

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('min-w-0');
    expect(root.className).toContain('w-full');
    expect(root.className).toContain('overflow-hidden');
    expect(root.className).toContain('ddl-editor-shell');

    const editorShell = container.querySelector('.min-h-0');
    expect(editorShell).toBeTruthy();
    expect((editorShell as HTMLElement).className).toContain('min-w-0');
    expect((editorShell as HTMLElement).className).toContain('w-full');
    expect((editorShell as HTMLElement).className).toContain('overflow-hidden');
  });
});
