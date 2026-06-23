import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { FileInput } from './FileInput';
import {
  deleteKnowledgeAttachment,
  downloadKnowledgeAttachment,
  fetchKnowledgeAttachments,
  resyncKnowledgeAttachment,
  uploadKnowledgeAttachment,
} from '../lib/api/knowledge';
import type {
  KnowledgeAttachment,
  KnowledgeScopeContext,
  ListAttachmentQuery,
} from '../types/knowledge';
import {
  attachmentDeleteCopy,
  attachmentResyncCopy,
} from '../lib/knowledge/destructiveCopy';
import {
  indexStatusLabel,
  isActiveIndexStatus,
} from '../lib/knowledge/indexStatus';

interface KnowledgeAttachmentsProps {
  knowledgeId: string;
  scope: KnowledgeScopeContext;
}

interface PendingUpload {
  filename: string;
  status: 'uploading' | 'failed';
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
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [filters, setFilters] = useState<ListAttachmentQuery>({
    fileName: '',
    mimeType: '',
    tag: '',
  });
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<KnowledgeAttachment | null>(
    null,
  );
  const [pendingResync, setPendingResync] = useState<KnowledgeAttachment | null>(
    null,
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadAttachments = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) {
        setLoading(true);
      }
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
        if (!silent) {
          setError('Failed to load attachments.');
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [filters.fileName, filters.mimeType, filters.tag, knowledgeId, scope],
  );

  useEffect(() => {
    void loadAttachments();
  }, [loadAttachments]);

  const shouldPoll = attachments.some((attachment) =>
    isActiveIndexStatus(attachment.indexStatus),
  );

  useEffect(() => {
    if (!shouldPoll) return;
    const id = setInterval(() => {
      void loadAttachments({ silent: true });
    }, 4000);
    return () => clearInterval(id);
  }, [shouldPoll, loadAttachments]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem('files') as HTMLInputElement;
    const files = fileInput.files ? Array.from(fileInput.files) : [];

    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    setPendingUploads(files.map((file) => ({ filename: file.name, status: 'uploading' })));

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
        setPendingUploads((prev) =>
          prev.filter((item) => item.filename !== file.name),
        );
      }

      setAttachments((prev) => [...uploaded, ...prev]);
      setDescription('');
      setTags('');
      form.reset();
      setFileInputKey((current) => current + 1);
    } catch {
      setError('Failed to upload one or more files.');
      setPendingUploads((prev) =>
        prev.map((item) => ({ ...item, status: 'failed' })),
      );
    } finally {
      setUploading(false);
      setPendingUploads([]);
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

  async function handleDeleteConfirmed() {
    if (!pendingDelete) return;
    const attachmentId = pendingDelete.id;
    setActiveActionId(attachmentId);
    setError(null);
    setActionMessage(null);
    try {
      await deleteKnowledgeAttachment(scope, knowledgeId, attachmentId);
      setAttachments((prev) =>
        prev.filter((attachment) => attachment.id !== attachmentId),
      );
      setPendingDelete(null);
    } catch {
      setError('Failed to delete attachment.');
    } finally {
      setActiveActionId(null);
    }
  }

  async function handleResyncConfirmed() {
    if (!pendingResync) return;
    const attachmentId = pendingResync.id;
    setActiveActionId(attachmentId);
    setError(null);
    setActionMessage(null);
    try {
      const updated = await resyncKnowledgeAttachment(
        scope,
        knowledgeId,
        attachmentId,
      );
      setAttachments((prev) =>
        prev.map((attachment) =>
          attachment.id === attachmentId ? updated : attachment,
        ),
      );
      setActionMessage(`Resync queued for ${pendingResync.originalFilename}.`);
      setPendingResync(null);
    } catch {
      setError('Failed to resync attachment.');
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
          <FileInput key={fileInputKey} name="files" multiple />
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
      {actionMessage && <p className="status-message">{actionMessage}</p>}

      {pendingUploads.length > 0 && (
        <ul className="knowledge-attachment-list">
          {pendingUploads.map((item) => (
            <li
              key={item.filename}
              className="knowledge-attachment-item is-uploading"
            >
              <div className="knowledge-attachment-meta">
                <strong>{item.filename}</strong>
                <span
                  className={`knowledge-index-status is-${item.status === 'uploading' ? 'processing' : 'failed'}`}
                >
                  {item.status === 'uploading' ? 'Uploading' : 'Upload failed'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && attachments.length === 0 && pendingUploads.length === 0 && (
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
                <span className="knowledge-file-stats">
                  {attachment.chunkCount} chunk
                  {attachment.chunkCount === 1 ? '' : 's'} · {attachment.tokenCount}{' '}
                  token{attachment.tokenCount === 1 ? '' : 's'}
                </span>
                <span
                  className={`knowledge-index-status is-${attachment.indexStatus}`}
                >
                  {indexStatusLabel(
                    attachment.indexStatus,
                    attachment.indexPipelineStep,
                  )}
                </span>
                {attachment.description && (
                  <span>{attachment.description}</span>
                )}
                {attachment.tags.length > 0 && (
                  <span className="knowledge-attachment-tags">
                    {attachment.tags.join(', ')}
                  </span>
                )}
                {attachment.lastIndexError && (
                  <span className="alert alert-error">{attachment.lastIndexError}</span>
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
                  className="btn btn-secondary"
                  disabled={activeActionId === attachment.id}
                  onClick={() => setPendingResync(attachment)}
                >
                  Resync
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={activeActionId === attachment.id}
                  onClick={() => setPendingDelete(attachment)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {pendingDelete ? (
        <ConfirmDialog
          open
          {...attachmentDeleteCopy(
            pendingDelete.originalFilename,
            pendingDelete.chunkCount,
          )}
          cancelLabel="Keep file"
          variant="danger"
          loading={activeActionId === pendingDelete.id}
          onConfirm={() => void handleDeleteConfirmed()}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
      {pendingResync ? (
        <ConfirmDialog
          open
          {...attachmentResyncCopy(pendingResync.originalFilename)}
          cancelLabel="Cancel"
          loading={activeActionId === pendingResync.id}
          onConfirm={() => void handleResyncConfirmed()}
          onCancel={() => setPendingResync(null)}
        />
      ) : null}
    </section>
  );
}
