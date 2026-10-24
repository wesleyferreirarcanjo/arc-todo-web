import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorAlert } from '../components/ErrorAlert';
import { catalogMessage, userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { RecordPanel } from '../components/videos/RecordPanel';
import { VideoPreview } from '../components/videos/VideoPreview';
import { VideoTimeline } from '../components/videos/VideoTimeline';
import { ZoomPanel } from '../components/videos/ZoomPanel';
import { FramePanel } from '../components/videos/FramePanel';
import { ExportDialog } from '../components/videos/ExportDialog';
import { ApiError } from '../lib/api/client';
import { recordingSession } from '../lib/videos/recordingSession';
import {
  downloadProjectVideoFile,
  fetchProjectVideo,
  updateProjectVideo,
} from '../lib/api/videos';
import {
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redo,
  undo,
  type History,
} from '../lib/videos/history';
import {
  deleteClip,
  splitClip,
  timelineDurationMs,
  timelineToSource,
} from '../lib/videos/timeline';
import { videoEditorShortcut } from '../lib/videos/shortcuts';
import type {
  CursorTrack,
  ProjectVideo,
  VideoEditState,
} from '../types/video';

const AUTOSAVE_DELAY_MS = 2000;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved' | 'error';
type SideTab = 'zoom' | 'frame';

export interface VideoEditorState {
  video: ProjectVideo | null;
  history: History | null;
  /** Current edit state; identical to `history.present`. */
  editState: VideoEditState | null;
  /**
   * Applies an edit. By default pushes one history entry; pass
   * `pushHistory: false` for transient updates during a drag, then commit with
   * `base` set to the drag-start state so undo restores the pre-drag state.
   */
  setEditState: (
    next: VideoEditState,
    options?: { pushHistory?: boolean; base?: VideoEditState },
  ) => void;
  undoEditState: () => void;
  redoEditState: () => void;
  canUndoEdit: boolean;
  canRedoEdit: boolean;
  recordingUrl: string | null;
  cursorTrack: CursorTrack | null;
  backgroundUrl: string | null;
  backgroundImage: HTMLImageElement | null;
  setVideo: (video: ProjectVideo) => void;
  setBackgroundUrl: (url: string | null) => void;
  sourceSize: { width: number; height: number } | null;
  setSourceSize: (size: { width: number; height: number } | null) => void;
  playheadMs: number;
  playing: boolean;
  /** Bumped on every `seekTo`; lets the preview reseek the media element. */
  seekVersion: number;
  setPlaying: (playing: boolean) => void;
  setPlayheadMs: (ms: number) => void;
  seekTo: (ms: number) => void;
  selectedClipId: string | null;
  selectClip: (id: string | null) => void;
  selectedZoomId: string | null;
  selectZoom: (id: string | null) => void;
}

interface ProjectVideoEditorPageProps {
  renderPreview?: (state: VideoEditorState) => ReactNode;
  renderTimeline?: (state: VideoEditorState) => ReactNode;
  renderSideTabs?: (state: VideoEditorState) => ReactNode;
  renderExport?: (state: VideoEditorState) => ReactNode;
  renderRecordArea?: (state: VideoEditorState) => ReactNode;
}

export function ProjectVideoEditorPage({
  renderPreview,
  renderTimeline,
  renderSideTabs,
  renderExport,
  renderRecordArea,
}: ProjectVideoEditorPageProps) {
  const { orgId, projectId, videoId } = useParams();
  const [video, setVideo] = useState<ProjectVideo | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [forbidden, setForbidden] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [cursorTrack, setCursorTrack] = useState<CursorTrack | null>(null);
  const [backgroundUrl, setBackgroundUrlValue] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [sourceSize, setSourceSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [seekVersion, setSeekVersion] = useState(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedZoomId, setSelectedZoomId] = useState<string | null>(null);
  const [sideTab, setSideTab] = useState<SideTab>('zoom');
  const [exportOpen, setExportOpen] = useState(false);
  const [rerecording, setRerecording] = useState(false);
  const [rerecordConfirmOpen, setRerecordConfirmOpen] = useState(false);
  const sessionState = useSyncExternalStore(
    recordingSession.subscribe,
    recordingSession.getState,
  );
  const prevSessionStatusRef = useRef(sessionState.status);

  const historyRef = useRef<History | null>(null);
  const playheadRef = useRef(0);
  const titleRef = useRef('');
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const editState = history?.present ?? null;

  const listPath =
    orgId && projectId
      ? `/organizations/${orgId}/projects/${projectId}/videos`
      : '/videos';

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const setBackgroundUrl = useCallback((url: string | null) => {
    if (url) objectUrlsRef.current.push(url);
    setBackgroundUrlValue(url);
  }, []);

  const loadVideo = useCallback(async () => {
    if (!orgId || !projectId || !videoId) return;
    setLoading(true);
    setError(null);
    setMissing(null);
    setForbidden(false);
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
    setRecordingUrl(null);
    setCursorTrack(null);
    setBackgroundUrlValue(null);
    setBackgroundImage(null);
    setSourceSize(null);
    setPlayheadMs(0);
    playheadRef.current = 0;
    setPlaying(false);
    setSelectedClipId(null);
    setSelectedZoomId(null);
    try {
      const data = await fetchProjectVideo(orgId, projectId, videoId);
      setVideo(data);
      setTitle(data.title);
      titleRef.current = data.title;
      const initialHistory = data.editState
        ? createHistory(data.editState)
        : null;
      historyRef.current = initialHistory;
      setHistory(initialHistory);
      dirtyRef.current = false;
      setSaveStatus('idle');

      const urls: string[] = [];
      try {
        if (data.files.recording) {
          const { blob } = await downloadProjectVideoFile(
            orgId,
            projectId,
            videoId,
            'recording',
          );
          const url = URL.createObjectURL(blob);
          urls.push(url);
          setRecordingUrl(url);
        }
        if (data.files.cursor) {
          const { blob } = await downloadProjectVideoFile(
            orgId,
            projectId,
            videoId,
            'cursor',
          );
          try {
            setCursorTrack(JSON.parse(await blob.text()) as CursorTrack);
          } catch {
            setCursorTrack(null);
          }
        }
        if (data.files.background) {
          const { blob } = await downloadProjectVideoFile(
            orgId,
            projectId,
            videoId,
            'background',
          );
          const url = URL.createObjectURL(blob);
          urls.push(url);
          setBackgroundUrlValue(url);
        }
      } finally {
        objectUrlsRef.current = urls;
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ERR-ARC-VIDEO-02') {
        setMissing(err.message);
      } else if (
        err instanceof ApiError &&
        (err.status === 403 || err.status === 404)
      ) {
        setForbidden(true);
      } else {
        setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'this video' }));
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId, videoId]);

  useEffect(() => {
    void loadVideo();
    return () => {
      clearAutosaveTimer();
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, [loadVideo, clearAutosaveTimer]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Reload after a (re)recording for this video finishes uploading.
  useEffect(() => {
    const prev = prevSessionStatusRef.current;
    prevSessionStatusRef.current = sessionState.status;
    if (
      prev === 'uploading' &&
      sessionState.status === 'idle' &&
      sessionState.target?.videoId === videoId
    ) {
      setRerecording(false);
      void loadVideo();
    }
  }, [sessionState, videoId, loadVideo]);

  // Decode the uploaded background image for the renderer/exporter.
  useEffect(() => {
    if (!backgroundUrl) {
      setBackgroundImage(null);
      return;
    }
    const image = new Image();
    image.onload = () => setBackgroundImage(image);
    image.src = backgroundUrl;
    return () => {
      image.onload = null;
    };
  }, [backgroundUrl]);

  const handleSave = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!orgId || !projectId || !videoId) return;
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
        const updated = await updateProjectVideo(orgId, projectId, videoId, {
          title: trimmed,
          editState: historyRef.current?.present ?? undefined,
        });
        setVideo(updated);
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
    [orgId, projectId, videoId, clearAutosaveTimer],
  );

  const scheduleAutosave = useCallback(() => {
    dirtyRef.current = true;
    setSaveStatus('unsaved');
    clearAutosaveTimer();
    autosaveTimerRef.current = setTimeout(() => {
      void handleSave({ silent: true });
    }, AUTOSAVE_DELAY_MS);
  }, [clearAutosaveTimer, handleSave]);

  const setEditState = useCallback(
    (
      next: VideoEditState,
      options?: { pushHistory?: boolean; base?: VideoEditState },
    ) => {
      const current = historyRef.current;
      if (!current) return;
      let nextHistory: History;
      if (options?.pushHistory === false) {
        // Transient update (mid-drag): live preview without a history entry.
        nextHistory = { past: current.past, present: next, future: [] };
      } else {
        const base = options?.base ?? current.present;
        nextHistory = pushHistory({ ...current, present: base }, next);
      }
      historyRef.current = nextHistory;
      setHistory(nextHistory);
      scheduleAutosave();
    },
    [scheduleAutosave],
  );

  const undoEditState = useCallback(() => {
    const current = historyRef.current;
    if (!current || !canUndo(current)) return;
    const next = undo(current);
    historyRef.current = next;
    setHistory(next);
    scheduleAutosave();
  }, [scheduleAutosave]);

  const redoEditState = useCallback(() => {
    const current = historyRef.current;
    if (!current || !canRedo(current)) return;
    const next = redo(current);
    historyRef.current = next;
    setHistory(next);
    scheduleAutosave();
  }, [scheduleAutosave]);

  const setPlayhead = useCallback((ms: number) => {
    playheadRef.current = ms;
    setPlayheadMs(ms);
  }, []);

  const seekTo = useCallback(
    (ms: number) => {
      setPlayhead(ms);
      setSeekVersion((version) => version + 1);
    },
    [setPlayhead],
  );

  const selectClip = useCallback((id: string | null) => {
    setSelectedClipId(id);
    if (id) setSelectedZoomId(null);
  }, []);

  const selectZoom = useCallback((id: string | null) => {
    setSelectedZoomId(id);
    if (id) setSelectedClipId(null);
  }, []);

  function handleTitleChange(value: string) {
    setTitle(value);
    titleRef.current = value;
    if (video) scheduleAutosave();
  }

  // Drop selections that no longer resolve after an edit, and keep the
  // playhead inside the (possibly shorter) timeline.
  useEffect(() => {
    if (!editState) return;
    if (
      selectedClipId &&
      !editState.clips.some((clip) => clip.id === selectedClipId)
    ) {
      setSelectedClipId(null);
    }
    if (
      selectedZoomId &&
      !editState.zooms.some((zoom) => zoom.id === selectedZoomId)
    ) {
      setSelectedZoomId(null);
    }
    const total = timelineDurationMs(editState);
    if (playheadRef.current > total) setPlayhead(total);
  }, [editState, selectedClipId, selectedZoomId, setPlayhead]);

  const editorState = useMemo<VideoEditorState>(
    () => ({
      video,
      history,
      editState,
      setEditState,
      undoEditState,
      redoEditState,
      canUndoEdit: history ? canUndo(history) : false,
      canRedoEdit: history ? canRedo(history) : false,
      recordingUrl,
      cursorTrack,
      backgroundUrl,
      backgroundImage,
      setVideo,
      setBackgroundUrl,
      sourceSize,
      setSourceSize,
      playheadMs,
      playing,
      seekVersion,
      setPlaying,
      setPlayheadMs: setPlayhead,
      seekTo,
      selectedClipId,
      selectClip,
      selectedZoomId,
      selectZoom,
    }),
    [
      video,
      history,
      editState,
      setEditState,
      undoEditState,
      redoEditState,
      recordingUrl,
      cursorTrack,
      backgroundUrl,
      backgroundImage,
      setBackgroundUrl,
      sourceSize,
      playheadMs,
      playing,
      seekVersion,
      setPlayhead,
      seekTo,
      selectedClipId,
      selectClip,
      selectedZoomId,
      selectZoom,
    ],
  );

  const editorStateRef = useRef(editorState);
  useEffect(() => {
    editorStateRef.current = editorState;
  }, [editorState]);

  // Editor keyboard shortcuts. Delete prefers a selected zoom, then clip.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const action = videoEditorShortcut(event);
      if (!action) return;
      const editor = editorStateRef.current;
      const state = editor.editState;
      if (!state || !editor.recordingUrl) return;
      event.preventDefault();
      switch (action) {
        case 'play':
          editor.setPlaying(!editor.playing);
          break;
        case 'split': {
          const mapped = timelineToSource(state, editor.playheadMs);
          if (mapped) {
            editor.setEditState(
              splitClip(state, mapped.clipId, editor.playheadMs),
            );
          }
          break;
        }
        case 'undo':
          editor.undoEditState();
          break;
        case 'redo':
          editor.redoEditState();
          break;
        case 'delete':
          if (editor.selectedZoomId) {
            editor.setEditState({
              ...state,
              zooms: state.zooms.filter(
                (zoom) => zoom.id !== editor.selectedZoomId,
              ),
            });
            editor.selectZoom(null);
          } else if (editor.selectedClipId) {
            editor.setEditState(
              deleteClip(state, editor.selectedClipId),
            );
            editor.selectClip(null);
          }
          break;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!orgId || !projectId || !videoId) {
    return <Navigate to="/organizations" replace />;
  }

  if (forbidden) {
    return (
      <div className="page-shell">
        <header className="page-header">
          <h2>Videos</h2>
          <ErrorAlert code="ERR-ARC-ACL-02">
            You do not have access to this project. Ask an administrator to add
            you.
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

  if (missing) {
    return (
      <div className="page-shell">
        <header className="page-header">
          <h2>Videos</h2>
          <p className="page-subtitle">{missing}</p>
          <div className="page-links">
            <Link to={listPath} className="text-link">
              ← Back to videos
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
    error: catalogMessage(WEB_ERROR.SAVE, { thing: 'this video' }),
  };

  return (
    <div className="diagram-editor-page video-editor-page">
      <header className="diagram-editor-header">
        <div className="diagram-editor-header-main">
          <Link to={listPath} className="text-link">
            ← Videos
          </Link>
          <input
            className="diagram-editor-title"
            type="text"
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            aria-label="Video title"
          />
        </div>
        <div className="diagram-editor-header-actions">
          {statusLabel[saveStatus] && saveStatus !== 'error' && (
            <span
              role="status"
              className={`diagram-editor-status diagram-editor-status-${saveStatus}`}
            >
              {statusLabel[saveStatus]}
            </span>
          )}
          {video?.hasRecording && !rerecording && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRerecordConfirmOpen(true)}
            >
              Re-record
            </button>
          )}
          {renderExport ? (
            renderExport(editorState)
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!editState || !sourceSize || loading}
                onClick={() => setExportOpen(true)}
              >
                Export
              </button>
              {editState && recordingUrl && sourceSize && (
                <ExportDialog
                  open={exportOpen}
                  onClose={() => setExportOpen(false)}
                  state={editState}
                  recordingUrl={recordingUrl}
                  sourceW={sourceSize.width}
                  sourceH={sourceSize.height}
                  cursor={cursorTrack}
                  background={backgroundImage}
                  title={title || 'export'}
                  orgId={orgId}
                  projectId={projectId}
                  videoId={videoId}
                  onSaved={setVideo}
                />
              )}
            </>
          )}
        </div>
      </header>

      {loading && <p className="status-message">Loading video...</p>}
      {error && <ErrorAlert>{error}</ErrorAlert>}
      {saveStatus === 'error' && (
        <ErrorAlert code={WEB_ERROR.SAVE}>
          {catalogMessage(WEB_ERROR.SAVE, { thing: 'this video' })}
        </ErrorAlert>
      )}

      {!loading && !error && video && (
        <div className="video-editor-body">
          {rerecording ? (
            <RecordPanel
              previousFrame={editState?.frame}
              onCancel={() => setRerecording(false)}
            />
          ) : recordingUrl ? (
            <>
              <div className="video-editor-main">
                <div className="video-editor-preview">
                  {renderPreview ? (
                    renderPreview(editorState)
                  ) : (
                    <VideoPreview editor={editorState} />
                  )}
                </div>
                <aside className="video-editor-side">
                  {renderSideTabs ? (
                    renderSideTabs(editorState)
                  ) : (
                    <div className="video-editor-side-panel">
                      <div
                        className="video-editor-side-tabs"
                        role="tablist"
                        aria-label="Video tools"
                      >
                        <button
                          type="button"
                          role="tab"
                          id="video-tab-zoom"
                          aria-controls="video-panel-zoom"
                          aria-selected={sideTab === 'zoom'}
                          className={`video-editor-side-tab${sideTab === 'zoom' ? ' is-active' : ''}`}
                          onClick={() => setSideTab('zoom')}
                        >
                          Zoom
                        </button>
                        <button
                          type="button"
                          role="tab"
                          id="video-tab-frame"
                          aria-controls="video-panel-frame"
                          aria-selected={sideTab === 'frame'}
                          className={`video-editor-side-tab${sideTab === 'frame' ? ' is-active' : ''}`}
                          onClick={() => setSideTab('frame')}
                        >
                          Frame
                        </button>
                      </div>
                      <div
                        role="tabpanel"
                        id="video-panel-zoom"
                        aria-labelledby="video-tab-zoom"
                        hidden={sideTab !== 'zoom'}
                      >
                        <ZoomPanel editor={editorState} />
                      </div>
                      <div
                        role="tabpanel"
                        id="video-panel-frame"
                        aria-labelledby="video-tab-frame"
                        hidden={sideTab !== 'frame'}
                      >
                        <FramePanel editor={editorState} />
                      </div>
                    </div>
                  )}
                </aside>
              </div>
              <div className="video-editor-timeline">
                {renderTimeline ? (
                  renderTimeline(editorState)
                ) : (
                  <VideoTimeline editor={editorState} />
                )}
              </div>
            </>
          ) : renderRecordArea ? (
            renderRecordArea(editorState)
          ) : (
            <RecordPanel />
          )}
        </div>
      )}

      <ConfirmDialog
        open={rerecordConfirmOpen}
        title="Re-record"
        description="Replace the current recording? Edits and zooms will be reset."
        confirmLabel="Replace"
        variant="danger"
        onConfirm={() => {
          setRerecordConfirmOpen(false);
          setRerecording(true);
        }}
        onCancel={() => setRerecordConfirmOpen(false)}
      />
    </div>
  );
}
