import {
  Excalidraw,
  exportToBlob,
} from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ApiError } from '../lib/api/client';
import {
  fetchProjectDiagram,
  updateProjectDiagram,
} from '../lib/api/diagrams';
import type { ExcalidrawSceneJson, ProjectDiagram } from '../types/diagram';

type ExcalidrawElements = Parameters<
  NonNullable<React.ComponentProps<typeof Excalidraw>['onChange']>
>[0];
type ExcalidrawAppState = Parameters<
  NonNullable<React.ComponentProps<typeof Excalidraw>['onChange']>
>[1];
type ExcalidrawFiles = Parameters<
  NonNullable<React.ComponentProps<typeof Excalidraw>['onChange']>
>[2];

const AUTOSAVE_DELAY_MS = 2000;

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function buildThumbnail(
  elements: ExcalidrawElements,
  appState: ExcalidrawAppState,
  files: ExcalidrawFiles,
): Promise<string | null> {
  try {
    const blob = await exportToBlob({
      elements,
      appState: {
        ...appState,
        exportBackground: true,
        exportWithDarkMode: false,
      },
      files,
      mimeType: 'image/png',
      quality: 0.6,
      exportPadding: 16,
      getDimensions: (width: number, height: number) => {
        const maxSide = 320;
        const scale = Math.min(1, maxSide / Math.max(width, height, 1));
        return {
          width: Math.max(1, Math.round(width * scale)),
          height: Math.max(1, Math.round(height * scale)),
          scale,
        };
      },
    });
    return blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function sceneFromDiagram(diagram: ProjectDiagram): {
  elements: ExcalidrawElements;
  appState: Partial<ExcalidrawAppState>;
  files: ExcalidrawFiles;
} {
  const scene = diagram.sceneJson ?? {};
  return {
    elements: Array.isArray(scene.elements)
      ? (scene.elements as ExcalidrawElements)
      : [],
    appState: {
      ...(typeof scene.appState === 'object' && scene.appState
        ? (scene.appState as Partial<ExcalidrawAppState>)
        : {}),
      collaborators: new Map(),
    },
    files:
      typeof scene.files === 'object' && scene.files
        ? (scene.files as ExcalidrawFiles)
        : {},
  };
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved' | 'error';

export function ProjectDiagramEditorPage() {
  const { orgId, projectId, diagramId } = useParams();
  const { theme } = useTheme();
  const [diagram, setDiagram] = useState<ProjectDiagram | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [forbidden, setForbidden] = useState(false);

  const elementsRef = useRef<ExcalidrawElements>([]);
  const appStateRef = useRef<ExcalidrawAppState | null>(null);
  const filesRef = useRef<ExcalidrawFiles>({});
  const titleRef = useRef('');
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const skipNextChangeRef = useRef(true);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialData = useMemo(() => {
    if (!diagram) return null;
    return sceneFromDiagram(diagram);
  }, [diagram]);

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const loadDiagram = useCallback(async () => {
    if (!orgId || !projectId || !diagramId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const data = await fetchProjectDiagram(orgId, projectId, diagramId);
      setDiagram(data);
      setTitle(data.title);
      titleRef.current = data.title;
      const scene = sceneFromDiagram(data);
      elementsRef.current = scene.elements;
      appStateRef.current = scene.appState as ExcalidrawAppState;
      filesRef.current = scene.files;
      dirtyRef.current = false;
      skipNextChangeRef.current = true;
      setSaveStatus('idle');
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        setForbidden(true);
      } else {
        setError('Failed to load diagram.');
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId, diagramId]);

  useEffect(() => {
    void loadDiagram();
    return () => clearAutosaveTimer();
  }, [loadDiagram, clearAutosaveTimer]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleSave = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!orgId || !projectId || !diagramId) return;
      const trimmed = titleRef.current.trim();
      if (!trimmed) {
        if (!options?.silent) setSaveStatus('error');
        return;
      }
      if (savingRef.current) return;

      clearAutosaveTimer();
      savingRef.current = true;
      setSaveStatus('saving');
      try {
        const elements = elementsRef.current;
        const appState = appStateRef.current;
        const files = filesRef.current;
        const sceneJson: ExcalidrawSceneJson = {
          elements,
          appState: appState
            ? {
                viewBackgroundColor: appState.viewBackgroundColor,
                gridSize: appState.gridSize,
                theme: appState.theme,
              }
            : {},
          files,
        };
        const thumbnail =
          appState != null
            ? await buildThumbnail(elements, appState, files)
            : null;

        const updated = await updateProjectDiagram(
          orgId,
          projectId,
          diagramId,
          {
            title: trimmed,
            sceneJson,
            thumbnail,
          },
        );
        setDiagram(updated);
        setTitle(updated.title);
        titleRef.current = updated.title;
        dirtyRef.current = false;
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      } finally {
        savingRef.current = false;
      }
    },
    [orgId, projectId, diagramId, clearAutosaveTimer],
  );

  const scheduleAutosave = useCallback(() => {
    dirtyRef.current = true;
    setSaveStatus('unsaved');
    clearAutosaveTimer();
    autosaveTimerRef.current = setTimeout(() => {
      void handleSave({ silent: true });
    }, AUTOSAVE_DELAY_MS);
  }, [clearAutosaveTimer, handleSave]);

  function handleTitleChange(value: string) {
    setTitle(value);
    titleRef.current = value;
    if (diagram) scheduleAutosave();
  }

  if (!orgId || !projectId || !diagramId) {
    return <Navigate to="/organizations" replace />;
  }

  if (forbidden) {
    return (
      <div className="page-shell">
        <header className="page-header">
          <h2>Diagrams</h2>
          <p className="page-subtitle">
            You do not have access to this project&apos;s diagrams.
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

  const statusLabel: Record<SaveStatus, string | null> = {
    idle: null,
    saving: 'Saving…',
    saved: 'All changes saved',
    unsaved: 'Unsaved changes',
    error: 'Failed to save diagram',
  };

  return (
    <div className="diagram-editor-page">
      <header className="diagram-editor-header">
        <div className="diagram-editor-header-main">
          <Link
            to={`/organizations/${orgId}/projects/${projectId}/diagrams`}
            className="text-link"
          >
            ← Diagrams
          </Link>
          <input
            className="diagram-editor-title"
            type="text"
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            aria-label="Diagram title"
          />
        </div>
        <div className="diagram-editor-header-actions">
          {statusLabel[saveStatus] && (
            <span
              className={`diagram-editor-status diagram-editor-status-${saveStatus}`}
            >
              {statusLabel[saveStatus]}
            </span>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={saveStatus === 'saving' || loading || !diagram}
            onClick={() => void handleSave()}
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {loading && <p className="status-message">Loading diagram...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && diagram && initialData && (
        <div className="diagram-editor-canvas">
          <Excalidraw
            key={diagram.id}
            theme={theme === 'dark' ? 'dark' : 'light'}
            initialData={initialData}
            UIOptions={{
              canvasActions: {
                saveToActiveFile: false,
                loadScene: false,
              },
            }}
            onChange={(elements, appState, files) => {
              elementsRef.current = elements;
              appStateRef.current = appState;
              filesRef.current = files;
              if (skipNextChangeRef.current) {
                skipNextChangeRef.current = false;
                return;
              }
              scheduleAutosave();
            }}
          />
        </div>
      )}
    </div>
  );
}
