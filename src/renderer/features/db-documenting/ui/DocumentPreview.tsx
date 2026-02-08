import { useMemo } from 'react';

interface DocumentPreviewProps {
  content: string;
}

/**
 * Simple markdown-to-HTML renderer.
 * Handles headings, paragraphs, bold, italic, inline code, code blocks, lists, and horizontal rules.
 */
function markdownToHtml(md: string): string {
  let html = md
    // Code blocks (must come before other inline transforms)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Headings
    .replace(/^#{6}\s+(.*)$/gm, '<h6>$1</h6>')
    .replace(/^#{5}\s+(.*)$/gm, '<h5>$1</h5>')
    .replace(/^#{4}\s+(.*)$/gm, '<h4>$1</h4>')
    .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
    // Horizontal rule
    .replace(/^---+$/gm, '<hr />')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Unordered lists
    .replace(/^[-*]\s+(.*)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
    // Paragraphs (lines not already wrapped in HTML tags)
    .replace(/^(?!<[a-z])(.*\S.*)$/gm, '<p>$1</p>');

  return html;
}

export function DocumentPreview({ content }: DocumentPreviewProps) {
  const html = useMemo(() => markdownToHtml(content), [content]);

  return (
    <div className="h-full overflow-auto p-4">
      {content.trim() ? (
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Preview will appear here...</p>
      )}
    </div>
  );
}
