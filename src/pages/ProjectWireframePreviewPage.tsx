import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, catalogMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { UndoToast } from '../components/UndoToast';
import { WireframeMarkupBlock } from '../components/WireframeMarkupBlock';
import { useDeferredDelete } from '../hooks/useDeferredDelete';
import { ApiError } from '../lib/api/client';
import { fetchProjectDiagrams } from '../lib/api/diagrams';
import {
  deleteProjectWireframe,
  fetchProjectWireframe,
  updateProjectWireframe,
} from '../lib/api/wireframes';
import type { ProjectDiagramSummary } from '../types/diagram';
import type { ProjectWireframe } from '../types/wireframe';

const ACL_PROJECT = 'ERR-ARC-ACL-02';

export function ProjectWireframePreviewPage() {
  const { orgId, projectId, wireframeId } = useParams();
  const navigate = useNavigate();
  const [wireframe, setWireframe] = useState<ProjectWireframe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [forbidden, setForbidden] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameErrorCode, setRenameErrorCode] = useState<string | undefined>();
  const [renaming, setRenaming] = useState(false);
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
    setErrorCode(undefined);
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
        setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'this wireframe' }));
        setErrorCode(WEB_ERROR.LOAD);
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId, wireframeId]);

  useEffect(() => {
    void loadWireframe();
  }, [loadWireframe]);

  const commitDelete = useCallback(async () => {
    if (!orgId || !projectId || !wireframeId) return;
    setDeleting(true);
    try {
      await deleteProjectWireframe(orgId, projectId, wireframeId);
      navigate(listPath);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.DELETE, { thing: 'this wireframe' }));
      setErrorCode(WEB_ERROR.DELETE);
    } finally {
      setDeleting(false);
    }
  }, [listPath, navigate, orgId, projectId, wireframeId]);

  const deferredDelete = useDeferredDelete(commitDelete);

  async function handleRename() {
    if (!orgId || !projectId || !wireframeId) return;
    const title = renameTitle.trim();
    if (!title) {
      setRenameError(catalogMessage(WEB_ERROR.VAL_WIREFRAME));
      setRenameErrorCode(WEB_ERROR.VAL_WIREFRAME);
      return;
    }
    setRenaming(true);
    setRenameError(null);
    setRenameErrorCode(undefined);
    try {
      const updated = await updateProjectWireframe(
        orgId,
        projectId,
        wireframeId,
        { title },
      );
      setWireframe(updated);
      setRenameOpen(false);
    } catch (err) {
      setRenameError(userMessage(err, WEB_ERROR.RENAME, { thing: 'this wireframe' }));
      setRenameErrorCode(WEB_ERROR.RENAME);
    } finally {
      setRenaming(false);
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
          <ErrorAlert code={ACL_PROJECT}>
            {catalogMessage(ACL_PROJECT)}
          </ErrorAlert>
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
            showList={markupDiagrams.length > 0}
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
              setRenameErrorCode(undefined);
              setRenameOpen(true);
            }}
          >
            Rename
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={!wireframe || loading || deleting}
            onClick={() => deferredDelete.requestDelete()}
          >
            Delete
          </button>
        </div>
      </header>

      {loading && <p className="status-message">Loading wireframe...</p>}
      {error && <ErrorAlert code={errorCode}>{error}</ErrorAlert>}

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
        {renameError && (
          <ErrorAlert code={renameErrorCode}>{renameError}</ErrorAlert>
        )}
        <div className="hub-actions">
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
        open={deferredDelete.confirmOpen}
        title="Delete wireframe"
        description={`Delete "${wireframe?.title ?? 'this wireframe'}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => void deferredDelete.confirm()}
        onCancel={deferredDelete.cancel}
      />

      <UndoToast
        open={deferredDelete.toastOpen}
        message="Wireframe deleted"
        onUndo={deferredDelete.undo}
        onDismiss={() => {
          void deferredDelete.dismiss();
        }}
      />
    </div>
  );
}
