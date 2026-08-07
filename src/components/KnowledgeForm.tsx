import { FormEvent, useEffect, useState } from 'react';
import { FileInput } from './FileInput';
import { Select } from './Select';
import { fetchProjectTasks } from '../lib/api/todos';
import type { CreateKnowledgeInput } from '../types/knowledge';
import type { Task } from '../types/todo';

interface KnowledgeFormProps {
  onSubmit: (input: CreateKnowledgeInput, files?: File[]) => Promise<void>;
  submitLabel?: string;
  /** When set, show optional "link to task" selector for project knowledge. */
  taskLink?: {
    organizationId: string;
    projectId: string;
  } | null;
}

export function KnowledgeForm({
  onSubmit,
  submitLabel = 'Add knowledge',
  taskLink = null,
}: KnowledgeFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [taskId, setTaskId] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskLink?.organizationId || !taskLink.projectId) {
      setTasks([]);
      setTaskId('');
      return;
    }
    let cancelled = false;
    void fetchProjectTasks(taskLink.organizationId, taskLink.projectId)
      .then((items) => {
        if (!cancelled) setTasks(items);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [taskLink?.organizationId, taskLink?.projectId]);

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
          ...(taskLink ? { taskId: taskId || null } : {}),
        },
        files.length > 0 ? files : undefined,
      );
      setTitle('');
      setContent('');
      setTaskId('');
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

      {taskLink ? (
        <label className="board-filter-field">
          Vincular a tarefa (opcional)
          <Select
            value={taskId}
            onChange={setTaskId}
            options={[
              { value: '', label: 'Nenhuma (projeto inteiro)' },
              ...tasks.map((task) => ({
                value: task.id,
                label: task.displayId
                  ? `${task.displayId} — ${task.title}`
                  : task.title,
              })),
            ]}
          />
        </label>
      ) : null}

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
