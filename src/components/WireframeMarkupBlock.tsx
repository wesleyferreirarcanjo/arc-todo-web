import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from './ConfirmDialog';
import { ApiError } from '../lib/api/client';
import { deleteProjectDiagram } from '../lib/api/diagrams';
import { fetchProjectWireframe } from '../lib/api/wireframes';
import { createWireframeMarkupDiagram } from '../lib/wireframes/createMarkup';
import type { ProjectDiagramSummary } from '../types/diagram';

interface WireframeMarkupBlockProps {
  orgId: string;
  projectId: string;
  wireframeId: string;
  wireframeTitle: string;
  html?: string | null;
  diagrams: ProjectDiagramSummary[];
  disabled?: boolean;
  onDiagramsChange: () => void;
  markUpClassName?: string;
  showButton?: boolean;
  showList?: boolean;
}

export function WireframeMarkupBlock({
  orgId,
  projectId,
  wireframeId,
  wireframeTitle,
  html,
  diagrams,
  disabled = false,
  onDiagramsChange,
  markUpClassName = 'btn btn-secondary btn-sm',
  showButton = true,
  showList = true,
}: WireframeMarkupBlockProps) {
  const navigate = useNavigate();
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectDiagramSummary | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const editorPath = (diagramId: string) =>
    `/organizations/${orgId}/projects/${projectId}/diagrams/${diagramId}`;

  async function handleMarkUp() {
    setCapturing(true);
    setError(null);
    try {
      const sourceHtml =
        html ??
        (await fetchProjectWireframe(orgId, projectId, wireframeId)).html;
      const created = await createWireframeMarkupDiagram(orgId, projectId, {
        id: wireframeId,
        title: wireframeTitle,
        html: sourceHtml,
      });
      navigate(editorPath(created.id));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to create markup.';
      setError(message);
    } finally {
      setCapturing(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProjectDiagram(orgId, projectId, deleteTarget.id);
      setDeleteTarget(null);
      onDiagramsChange();
    } catch {
      setError('Failed to delete markup.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="wireframe-markup">
      {showButton && (
        <div className="wireframe-markup-toolbar">
          <button
            type="button"
            className={markUpClassName}
            disabled={disabled || capturing}
            onClick={() => void handleMarkUp()}
          >
            {capturing ? 'Capturing...' : 'Mark up'}
          </button>
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
      {showList && diagrams.length > 0 && (
        <ul className="wireframe-markup-list">
          {diagrams.map((diagram) => (
            <li key={diagram.id} className="wireframe-markup-item">
              <Link to={editorPath(diagram.id)} className="wireframe-markup-link">
                {diagram.thumbnail ? (
                  <img
                    src={diagram.thumbnail}
                    alt=""
                    className="wireframe-markup-thumb"
                  />
                ) : (
                  <span className="wireframe-markup-thumb-fallback" />
                )}
                <span className="wireframe-markup-title">{diagram.title}</span>
              </Link>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => setDeleteTarget(diagram)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete markup"
        description={`Delete "${deleteTarget?.title ?? 'this markup'}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
