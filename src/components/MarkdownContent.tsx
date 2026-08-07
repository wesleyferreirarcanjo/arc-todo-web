import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  variant: 'preview' | 'full';
  className?: string;
}

export function MarkdownContent({
  content,
  variant,
  className,
}: MarkdownContentProps) {
  const classes = [
    'markdown-content',
    variant === 'preview' ? 'is-preview' : 'is-full',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
