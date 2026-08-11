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

export function ProjectDiagramEditorPage() {
  const { orgId, projectId, diagramId } = useParams();
  const { theme } = useTheme();
  const [diagram, setDiagram] = useState<ProjectDiagram | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const elementsRef = useRef<ExcalidrawElements>([]);
  const appStateRef = useRef<ExcalidrawAppState | null>(null);
  const filesRef = useRef<ExcalidrawFiles>({});
  const initialData = useMemo(() => {
    if (!diagram) return null;
    return sceneFromDiagram(diagram);
  }, [diagram]);

  const loadDiagram = useCallback(async () => {
    if (!orgId || !projectId || !diagramId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const data = await fetchProjectDiagram(orgId, projectId, diagramId);
      setDiagram(data);
      setTitle(data.title);
      const scene = sceneFromDiagram(data);
      elementsRef.current = scene.elements;
      filesRef.current = scene.files;
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
  }, [loadDiagram]);

  async function handleSave() {
    if (!orgId || !projectId || !diagramId) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setSaveMessage('Title is required.');
      return;
    }

    setSaving(true);
    setSaveMessage(null);
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
      setSaveMessage('Saved.');
    } catch {
      setSaveMessage('Failed to save diagram.');
    } finally {
      setSaving(false);
    }
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
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Diagram title"
          />
        </div>
        <div className="diagram-editor-header-actions">
          {saveMessage && (
            <span className="diagram-editor-status">{saveMessage}</span>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || loading || !diagram}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving...' : 'Save'}
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
            }}
          />
        </div>
      )}
    </div>
  );
}
