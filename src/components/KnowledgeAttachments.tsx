import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  deleteKnowledgeAttachment,
  downloadKnowledgeAttachment,
  fetchKnowledgeAttachments,
  uploadKnowledgeAttachment,
} from '../lib/api/knowledge';
import type {
  KnowledgeAttachment,
  KnowledgeScopeContext,
  ListAttachmentQuery,
} from '../types/knowledge';

interface KnowledgeAttachmentsProps {
  knowledgeId: string;
  scope: KnowledgeScopeContext;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function KnowledgeAttachments({
  knowledgeId,
  scope,
}: KnowledgeAttachmentsProps) {
  const [attachments, setAttachments] = useState<KnowledgeAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [filters, setFilters] = useState<ListAttachmentQuery>({
    fileName: '',
    mimeType: '',
    tag: '',
  });
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const loadAttachments = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query: ListAttachmentQuery = {};
    if (filters.fileName?.trim()) query.fileName = filters.fileName.trim();
    if (filters.mimeType?.trim()) query.mimeType = filters.mimeType.trim();
    if (filters.tag?.trim()) query.tag = filters.tag.trim();

    try {
      const data = await fetchKnowledgeAttachments(
        scope,
        knowledgeId,
        Object.keys(query).length > 0 ? query : undefined,
      );
      setAttachments(data);
    } catch {
      setError('Failed to load attachments.');
    } finally {
      setLoading(false);
    }
  }, [filters.fileName, filters.mimeType, filters.tag, knowledgeId, scope]);

  useEffect(() => {
    void loadAttachments();
  }, [loadAttachments]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem('files') as HTMLInputElement;
    const files = fileInput.files ? Array.from(fileInput.files) : [];

    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const uploaded: KnowledgeAttachment[] = [];
      for (const file of files) {
        const attachment = await uploadKnowledgeAttachment(
          scope,
          knowledgeId,
          file,
          {
            description: description.trim() || undefined,
            tags: tags.trim() || undefined,
          },
        );
        uploaded.push(attachment);
      }

      setAttachments((prev) => [...uploaded, ...prev]);
      setDescription('');
      setTags('');
      form.reset();
    } catch {
      setError('Failed to upload one or more files.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(attachmentId: string) {
    setActiveActionId(attachmentId);
    setError(null);
    try {
      await downloadKnowledgeAttachment(scope, knowledgeId, attachmentId);
    } catch {
      setError('Failed to download attachment.');
    } finally {
      setActiveActionId(null);
    }
  }

  async function handleDelete(attachmentId: string) {
    setActiveActionId(attachmentId);
    setError(null);
    try {
      await deleteKnowledgeAttachment(scope, knowledgeId, attachmentId);
      setAttachments((prev) =>
        prev.filter((attachment) => attachment.id !== attachmentId),
      );
    } catch {
      setError('Failed to delete attachment.');
    } finally {
      setActiveActionId(null);
    }
  }

  return (
    <section className="knowledge-attachments">
      <h4>Attachments</h4>

      <form className="knowledge-attachment-upload" onSubmit={handleUpload}>
        <label>
          Files
          <input type="file" name="files" multiple />
        </label>
        <label>
          Description
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional description for uploaded files"
          />
        </label>
        <label>
          Tags
          <input
            type="text"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="Comma-separated tags"
          />
        </label>
        <button type="submit" className="btn btn-secondary" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload files'}
        </button>
      </form>

      <div className="knowledge-attachment-filters">
        <input
          type="text"
          value={filters.fileName}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, fileName: event.target.value }))
          }
          placeholder="Filter by filename"
        />
        <input
          type="text"
          value={filters.mimeType}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, mimeType: event.target.value }))
          }
          placeholder="Filter by MIME type"
        />
        <input
          type="text"
          value={filters.tag}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, tag: event.target.value }))
          }
          placeholder="Filter by tag"
        />
      </div>

      {loading && <p className="status-message">Loading attachments...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && attachments.length === 0 && (
        <p className="status-message">No attachments yet.</p>
      )}

      {attachments.length > 0 && (
        <ul className="knowledge-attachment-list">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="knowledge-attachment-item">
              <div className="knowledge-attachment-meta">
                <strong>{attachment.originalFilename}</strong>
                <span>
                  {attachment.mimeType} · {formatFileSize(attachment.sizeBytes)}
                </span>
                {attachment.description && (
                  <span>{attachment.description}</span>
                )}
                {attachment.tags.length > 0 && (
                  <span className="knowledge-attachment-tags">
                    {attachment.tags.join(', ')}
                  </span>
                )}
                <span className="knowledge-meta">
                  Uploaded {new Date(attachment.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="knowledge-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={activeActionId === attachment.id}
                  onClick={() => void handleDownload(attachment.id)}
                >
                  {activeActionId === attachment.id ? 'Working...' : 'Download'}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={activeActionId === attachment.id}
                  onClick={() => void handleDelete(attachment.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
