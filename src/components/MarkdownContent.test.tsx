import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownContent } from './MarkdownContent';

const SAMPLE = `# Heading

Paragraph with **bold** and a list:

- one
- two

\`inline\` and:

\`\`\`
code block
\`\`\`
`;

describe('MarkdownContent', () => {
  it('renders full Markdown as structured elements, not raw source', () => {
    render(<MarkdownContent variant="full" content={SAMPLE} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Heading' })).toBeInTheDocument();
    expect(screen.getByText('bold').tagName).toBe('STRONG');
    expect(screen.getByText('one').closest('li')).toBeTruthy();
    expect(screen.queryByText(/# Heading/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\*\*bold\*\*/)).not.toBeInTheDocument();
  });

  it('does not execute raw HTML', () => {
    const { container } = render(
      <MarkdownContent
        variant="full"
        content={'Hello <script>window.__xss=1</script><img onerror="alert(1)" src=x>'}
      />,
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toMatch(/Hello/);
  });

  it('applies preview clamp class', () => {
    const { container } = render(
      <MarkdownContent variant="preview" content="**preview** text" />,
    );

    expect(container.firstElementChild).toHaveClass('markdown-content', 'is-preview');
    expect(screen.getByText('preview').tagName).toBe('STRONG');
  });
});
