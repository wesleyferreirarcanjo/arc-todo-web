import { FormEvent, useState } from 'react';
import { FileInput } from './FileInput';
import type { CreateKnowledgeInput } from '../types/knowledge';

interface KnowledgeFormProps {
  onSubmit: (input: CreateKnowledgeInput, files?: File[]) => Promise<void>;
  submitLabel?: string;
}

export function KnowledgeForm({
  onSubmit,
  submitLabel = 'Add knowledge',
}: KnowledgeFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await onSubmit(
        {
          title: title.trim(),
          content: content.trim(),
        },
        files.length > 0 ? files : undefined,
      );
      setTitle('');
      setContent('');
      setFiles([]);
      setFileInputKey((current) => current + 1);
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

      <label>
        Attachments
        <FileInput
          key={fileInputKey}
          multiple
          onChange={(event) =>
            setFiles(
              event.target.files ? Array.from(event.target.files) : [],
            )
          }
        />
      </label>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
