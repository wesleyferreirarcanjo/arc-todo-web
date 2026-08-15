import { ErrorAlert } from './ErrorAlert';
import { userMessage, catalogMessage, WEB_ERROR } from '../lib/errors/messages';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from './ConfirmDialog';
import { Modal } from './Modal';
import { ApiError } from '../lib/api/client';
import {
  deleteProjectDiagram,
  updateProjectDiagram,
} from '../lib/api/diagrams';
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

type NameMode = 'markup' | 'rename';

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
  const [nameMode, setNameMode] = useState<NameMode | null>(null);
  const [nameTarget, setNameTarget] = useState<ProjectDiagramSummary | null>(
    null,
  );
  const [nameValue, setNameValue] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  const editorPath = (diagramId: string) =>
    `/organizations/${orgId}/projects/${projectId}/diagrams/${diagramId}`;

  function openMarkupName() {
    setNameMode('markup');
    setNameTarget(null);
    setNameValue(`${wireframeTitle} — markup`);
    setNameError(null);
    setError(null);
  }

  function openRename(diagram: ProjectDiagramSummary) {
    setNameMode('rename');
    setNameTarget(diagram);
    setNameValue(diagram.title);
    setNameError(null);
    setError(null);
  }

  function closeNameModal() {
    if (savingName || capturing) return;
    setNameMode(null);
    setNameTarget(null);
    setNameError(null);
  }

  async function handleMarkUp(title: string) {
    setCapturing(true);
    setError(null);
    try {
      const sourceHtml =
        html ??
        (await fetchProjectWireframe(orgId, projectId, wireframeId)).html;
      const created = await createWireframeMarkupDiagram(
        orgId,
        projectId,
        {
          id: wireframeId,
          title: wireframeTitle,
          html: sourceHtml,
        },
        { title },
      );
      navigate(editorPath(created.id));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : userMessage(err, WEB_ERROR.CREATE, { thing: 'this markup' });
      setError(message);
    } finally {
      setCapturing(false);
    }
  }

  async function handleConfirmName() {
    const title = nameValue.trim();
    if (!title) {
      setNameError(catalogMessage(WEB_ERROR.VAL_NAME));
      return;
    }

    if (nameMode === 'markup') {
      setNameMode(null);
      await handleMarkUp(title);
      return;
    }

    if (!nameTarget) return;
    setSavingName(true);
    setNameError(null);
    try {
      await updateProjectDiagram(orgId, projectId, nameTarget.id, { title });
      setNameMode(null);
      setNameTarget(null);
      onDiagramsChange();
    } catch (err) {
      setNameError(userMessage(err, WEB_ERROR.RENAME, { thing: 'this markup' }));
    } finally {
      setSavingName(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProjectDiagram(orgId, projectId, deleteTarget.id);
      setDeleteTarget(null);
      onDiagramsChange();
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.DELETE, { thing: 'this markup' }));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const nameBusy = savingName || capturing;

  return (
    <div className="wireframe-markup">
      {showButton && (
        <div className="wireframe-markup-toolbar">
          <button
            type="button"
            className={markUpClassName}
            disabled={disabled || capturing}
            onClick={openMarkupName}
          >
            {capturing ? 'Capturing...' : 'Mark up'}
          </button>
        </div>
      )}
      {error && <ErrorAlert>{error}</ErrorAlert>}
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
                className="btn btn-secondary btn-sm"
                onClick={() => openRename(diagram)}
              >
                Rename
              </button>
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
      <Modal
        open={Boolean(nameMode)}
        onClose={closeNameModal}
        title={nameMode === 'rename' ? 'Rename markup' : 'New markup'}
        titleId="markup-name-title"
      >
        <label className="form-field">
          <span>Name</span>
          <input
            type="text"
            value={nameValue}
            onChange={(event) => setNameValue(event.target.value)}
            placeholder="e.g. Checkout markup"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleConfirmName();
              }
            }}
          />
        </label>
        {nameError && <ErrorAlert>{nameError}</ErrorAlert>}
        <div className="knowledge-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={nameBusy}
            onClick={() => void handleConfirmName()}
          >
            {nameMode === 'rename'
              ? savingName
                ? 'Saving...'
                : 'Save'
              : capturing
                ? 'Capturing...'
                : 'Create'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={nameBusy}
            onClick={closeNameModal}
          >
            Cancel
          </button>
        </div>
      </Modal>
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
