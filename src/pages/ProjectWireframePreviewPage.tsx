import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { WireframeMarkupBlock } from '../components/WireframeMarkupBlock';
import { ApiError } from '../lib/api/client';
import { fetchProjectDiagrams } from '../lib/api/diagrams';
import {
  deleteProjectWireframe,
  fetchProjectWireframe,
  updateProjectWireframe,
} from '../lib/api/wireframes';
import type { ProjectDiagramSummary } from '../types/diagram';
import type { ProjectWireframe } from '../types/wireframe';

export function ProjectWireframePreviewPage() {
  const { orgId, projectId, wireframeId } = useParams();
  const navigate = useNavigate();
  const [wireframe, setWireframe] = useState<ProjectWireframe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [markupDiagrams, setMarkupDiagrams] = useState<ProjectDiagramSummary[]>(
    [],
  );

  const listPath =
    orgId && projectId
      ? `/organizations/${orgId}/projects/${projectId}/wireframes`
      : '/wireframes';

  const loadWireframe = useCallback(async () => {
    if (!orgId || !projectId || !wireframeId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const [data, markup] = await Promise.all([
        fetchProjectWireframe(orgId, projectId, wireframeId),
        fetchProjectDiagrams(orgId, projectId, { wireframeId }),
      ]);
      setWireframe(data);
      setMarkupDiagrams(markup);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        setForbidden(true);
      } else {
        setError('Failed to load wireframe.');
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId, wireframeId]);

  useEffect(() => {
    void loadWireframe();
  }, [loadWireframe]);

  async function handleRename() {
    if (!orgId || !projectId || !wireframeId) return;
    const title = renameTitle.trim();
    if (!title) {
      setRenameError('Enter a wireframe name.');
      return;
    }
    setRenaming(true);
    setRenameError(null);
    try {
      const updated = await updateProjectWireframe(
        orgId,
        projectId,
        wireframeId,
        { title },
      );
      setWireframe(updated);
      setRenameOpen(false);
    } catch {
      setRenameError('Failed to rename wireframe.');
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete() {
    if (!orgId || !projectId || !wireframeId) return;
    setDeleting(true);
    try {
      await deleteProjectWireframe(orgId, projectId, wireframeId);
      navigate(listPath);
    } catch {
      setError('Failed to delete wireframe.');
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  if (!orgId || !projectId || !wireframeId) {
    return <Navigate to="/organizations" replace />;
  }

  if (forbidden) {
    return (
      <div className="page-shell">
        <header className="page-header">
          <h2>Wireframes</h2>
          <p className="page-subtitle">
            You do not have access to this project&apos;s wireframes.
          </p>
          <div className="page-links">
            <Link to="/organizations" className="text-link">
              Back to organizations
            </Link>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="diagram-editor-page">
      <header className="diagram-editor-header">
        <div className="diagram-editor-header-main">
          <Link to={listPath} className="text-link">
            ← Wireframes
          </Link>
          <h2 className="wireframe-preview-title">
            {wireframe?.title ?? 'Wireframe'}
          </h2>
        </div>
        <div className="diagram-editor-header-actions">
          <WireframeMarkupBlock
            orgId={orgId}
            projectId={projectId}
            wireframeId={wireframeId}
            wireframeTitle={wireframe?.title ?? 'Wireframe'}
            html={wireframe?.html}
            diagrams={markupDiagrams}
            disabled={!wireframe || loading}
            markUpClassName="btn btn-secondary"
            showList={false}
            onDiagramsChange={() => {
              void fetchProjectDiagrams(orgId, projectId, { wireframeId }).then(
                setMarkupDiagrams,
              );
            }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!wireframe || loading}
            onClick={() => {
              setRenameTitle(wireframe?.title ?? '');
              setRenameError(null);
              setRenameOpen(true);
            }}
          >
            Rename
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={!wireframe || loading}
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </button>
        </div>
      </header>

      {markupDiagrams.length > 0 && (
        <div className="wireframe-markup-bar">
          <WireframeMarkupBlock
            orgId={orgId}
            projectId={projectId}
            wireframeId={wireframeId}
            wireframeTitle={wireframe?.title ?? 'Wireframe'}
            html={wireframe?.html}
            diagrams={markupDiagrams}
            disabled={!wireframe || loading}
            showButton={false}
            onDiagramsChange={() => {
              void fetchProjectDiagrams(orgId, projectId, { wireframeId }).then(
                setMarkupDiagrams,
              );
            }}
          />
        </div>
      )}

      {loading && <p className="status-message">Loading wireframe...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && wireframe && (
        <iframe
          className="wireframe-preview-frame"
          title={wireframe.title}
          sandbox="allow-scripts"
          srcDoc={wireframe.html}
        />
      )}

      <Modal
        open={renameOpen}
        onClose={() => (renaming ? undefined : setRenameOpen(false))}
        title="Rename wireframe"
        titleId="preview-rename-wireframe-title"
      >
        <label className="form-field">
          <span>Name</span>
          <input
            type="text"
            value={renameTitle}
            onChange={(event) => setRenameTitle(event.target.value)}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleRename();
              }
            }}
          />
        </label>
        {renameError && <div className="alert alert-error">{renameError}</div>}
        <div className="knowledge-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={renaming}
            onClick={() => void handleRename()}
          >
            {renaming ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={renaming}
            onClick={() => setRenameOpen(false)}
          >
            Cancel
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete wireframe"
        description={`Delete "${wireframe?.title ?? 'this wireframe'}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
