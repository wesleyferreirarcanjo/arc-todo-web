import { FormEvent, useState } from 'react';
import type { CreateKnowledgeInput } from '../types/knowledge';

interface KnowledgeFormProps {
  onSubmit: (input: CreateKnowledgeInput) => Promise<void>;
  submitLabel?: string;
}

export function KnowledgeForm({
  onSubmit,
  submitLabel = 'Add knowledge',
}: KnowledgeFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
      });
      setTitle('');
      setContent('');
    } catch {
      setError('Failed to create knowledge entry.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="entity-form knowledge-form" onSubmit={handleSubmit}>
      <h2>New knowledge</h2>
      {error && <div className="alert alert-error">{error}</div>}

      <label>
        Title
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What should we remember?"
          required
        />
      </label>

      <label>
        Content
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write the knowledge details"
          rows={5}
          required
        />
      </label>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
