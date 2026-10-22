import { triggerBrowserDownload } from '../api/client';
import {
  updateProjectVideo,
  uploadProjectVideoFile,
} from '../api/videos';
import { userMessage, WEB_ERROR } from '../errors/messages';
import type { FrameStyle } from '../../types/video';
import {
  startVideoRecording,
  type RecordingHandle,
  type RecordingResult,
  type StartVideoRecordingOptions,
} from './recorder';
import { createInitialEditState } from './timeline';

export const SIZE_LIMIT_MESSAGE =
  'Recording stopped: the video reached the 100 MB limit.';

export interface RecordingTarget {
  orgId: string;
  projectId: string;
  videoId: string;
  editorPath: string;
  frame?: FrameStyle;
}

export interface RecordingSessionState {
  status: 'idle' | 'recording' | 'uploading' | 'error';
  startedAt?: number;
  message?: string;
  target?: RecordingTarget;
}

export interface RecordingSessionDeps {
  startVideoRecording: (
    opts: StartVideoRecordingOptions,
  ) => Promise<RecordingHandle | null>;
  uploadProjectVideoFile: typeof uploadProjectVideoFile;
  updateProjectVideo: typeof updateProjectVideo;
  navigate: (path: string) => void;
  download: (blob: Blob, filename: string) => void;
  now?: () => number;
}

export interface RecordingSession {
  start(
    target: RecordingTarget,
    opts: StartVideoRecordingOptions,
  ): Promise<void>;
  stop(): Promise<void>;
  subscribe(cb: () => void): () => void;
  getState(): RecordingSessionState;
  downloadFailedRecording(): void;
  dismiss(): void;
}

function warnBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault();
  event.returnValue = '';
}

function syncBeforeUnload(status: RecordingSessionState['status']) {
  if (typeof window === 'undefined') return;
  if (status === 'recording') {
    // A full reload or tab close kills the recorder; SPA navigation does not.
    window.addEventListener('beforeunload', warnBeforeUnload);
  } else {
    window.removeEventListener('beforeunload', warnBeforeUnload);
  }
}

export function createRecordingSession(
  deps: RecordingSessionDeps,
): RecordingSession {
  const now = deps.now ?? (() => Date.now());
  const listeners = new Set<() => void>();
  let state: RecordingSessionState = { status: 'idle' };
  let handle: RecordingHandle | null = null;
  let finishing = false;
  let failedRecording: { blob: Blob; filename: string } | null = null;

  function setState(next: RecordingSessionState) {
    state = next;
    syncBeforeUnload(next.status);
    for (const cb of listeners) cb();
  }

  async function finish(result: RecordingResult) {
    if (finishing) return;
    finishing = true;
    handle = null;
    const target = state.target;
    const extension = result.mimeType.includes('mp4') ? 'mp4' : 'webm';
    const filename = `recording.${extension}`;
    setState({
      ...state,
      status: 'uploading',
      message:
        result.stopReason === 'size-limit' ? SIZE_LIMIT_MESSAGE : state.message,
    });
    try {
      if (!target) throw new Error('Recording has no upload target.');
      const { orgId, projectId, videoId } = target;
      await deps.uploadProjectVideoFile(
        orgId,
        projectId,
        videoId,
        'recording',
        result.blob,
        filename,
        { durationMs: result.durationMs },
      );
      if (result.cursor) {
        await deps.uploadProjectVideoFile(
          orgId,
          projectId,
          videoId,
          'cursor',
          new Blob([JSON.stringify(result.cursor)], {
            type: 'application/json',
          }),
          'cursor.json',
        );
      }
      await deps.updateProjectVideo(orgId, projectId, videoId, {
        editState: createInitialEditState(result.durationMs, target.frame),
      });
      deps.navigate(target.editorPath);
      setState({ status: 'idle', message: state.message, target });
    } catch (error) {
      // Keep the blob so the user can still download the recording.
      failedRecording = { blob: result.blob, filename };
      setState({
        status: 'error',
        message: userMessage(error, WEB_ERROR.SAVE, {
          thing: 'the recording',
        }),
        target,
      });
    } finally {
      finishing = false;
    }
  }

  return {
    async start(target, opts) {
      if (state.status === 'recording' || state.status === 'uploading') return;
      const next = await deps.startVideoRecording(opts);
      if (!next) return;
      handle = next;
      failedRecording = null;
      next.onAutoStop((result) => void finish(result));
      setState({
        status: 'recording',
        startedAt: now(),
        message: next.notice,
        target,
      });
    },
    async stop() {
      const active = handle;
      if (!active) return;
      const result = await active.stop();
      await finish(result);
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getState() {
      return state;
    },
    downloadFailedRecording() {
      if (!failedRecording) return;
      deps.download(failedRecording.blob, failedRecording.filename);
    },
    dismiss() {
      if (state.status !== 'error') return;
      failedRecording = null;
      setState({ status: 'idle' });
    },
  };
}

let navigateTo: (path: string) => void = () => {
  // Set by a component inside the Router; see setRecordingSessionNavigate.
};

export function setRecordingSessionNavigate(
  navigate: (path: string) => void,
): void {
  navigateTo = navigate;
}

export const recordingSession = createRecordingSession({
  startVideoRecording,
  uploadProjectVideoFile,
  updateProjectVideo,
  navigate: (path) => navigateTo(path),
  download: triggerBrowserDownload,
});
