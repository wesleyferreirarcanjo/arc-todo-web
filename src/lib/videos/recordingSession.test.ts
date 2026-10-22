import { describe, expect, it, vi } from 'vitest';
import type { CursorTrack, ProjectVideo } from '../../types/video';
import type { RecordingHandle, RecordingResult } from './recorder';
import { createRecordingSession, SIZE_LIMIT_MESSAGE } from './recordingSession';
import type { RecordingSessionDeps } from './recordingSession';
import { createInitialEditState } from './timeline';

const TARGET = {
  orgId: 'org-1',
  projectId: 'proj-1',
  videoId: 'vid-1',
  editorPath: '/organizations/org-1/projects/proj-1/videos/vid-1',
};

function makeResult(partial: Partial<RecordingResult> = {}): RecordingResult {
  return {
    blob: new Blob(['video-bytes'], { type: 'video/webm' }),
    mimeType: 'video/webm;codecs=vp9,opus',
    durationMs: 5000,
    cursor: null,
    stopReason: 'user',
    ...partial,
  };
}

function makeHandle(result: RecordingResult) {
  let autoStop: ((result: RecordingResult) => void) | undefined;
  const handle: RecordingHandle = {
    stop: vi.fn(async () => result),
    onAutoStop: (cb) => {
      autoStop = cb;
    },
  };
  return {
    handle,
    fireAutoStop: () => autoStop?.(result),
  };
}

function makeDeps(handle: RecordingHandle | null) {
  const deps: RecordingSessionDeps = {
    startVideoRecording: vi.fn(async () => handle),
    uploadProjectVideoFile: vi.fn(async () => ({}) as ProjectVideo),
    updateProjectVideo: vi.fn(async () => ({}) as ProjectVideo),
    navigate: vi.fn(),
    download: vi.fn(),
  };
  return deps;
}

const OPTS = { source: 'this-tab' as const, microphone: true };

function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe('recordingSession', () => {
  it('moves to recording on start and stays idle on picker cancel', async () => {
    const { handle } = makeHandle(makeResult());
    const deps = makeDeps(handle);
    const session = createRecordingSession(deps);
    const states: string[] = [];
    session.subscribe(() => states.push(session.getState().status));

    await session.start(TARGET, OPTS);
    expect(session.getState()).toMatchObject({
      status: 'recording',
      target: TARGET,
    });
    expect(session.getState().startedAt).toBeTypeOf('number');
    expect(states).toEqual(['recording']);

    const cancelled = createRecordingSession(makeDeps(null));
    await cancelled.start(TARGET, OPTS);
    expect(cancelled.getState().status).toBe('idle');
    expect(deps.uploadProjectVideoFile).not.toHaveBeenCalled();
  });

  it('uploads recording, updates edit state, navigates, then returns to idle', async () => {
    const result = makeResult();
    const { handle } = makeHandle(result);
    const deps = makeDeps(handle);
    const session = createRecordingSession(deps);
    const order: string[] = [];
    deps.uploadProjectVideoFile = vi.fn(async () => {
      order.push('upload');
      return {} as ProjectVideo;
    });
    deps.updateProjectVideo = vi.fn(async () => {
      order.push('update');
      return {} as ProjectVideo;
    });
    const frame = createInitialEditState(1).frame;

    await session.start({ ...TARGET, frame }, OPTS);
    await session.stop();

    expect(handle.stop).toHaveBeenCalled();
    expect(deps.uploadProjectVideoFile).toHaveBeenCalledWith(
      'org-1',
      'proj-1',
      'vid-1',
      'recording',
      result.blob,
      'recording.webm',
      { durationMs: 5000 },
    );
    expect(order).toEqual(['upload', 'update']);
    const update = vi.mocked(deps.updateProjectVideo).mock.calls[0];
    expect(update.slice(0, 3)).toEqual(['org-1', 'proj-1', 'vid-1']);
    expect(update[3].editState?.sourceDurationMs).toBe(5000);
    expect(update[3].editState?.frame).toBe(frame);
    expect(deps.navigate).toHaveBeenCalledWith(TARGET.editorPath);
    expect(session.getState().status).toBe('idle');
  });

  it('uploads the cursor track only when present', async () => {
    const cursor: CursorTrack = {
      version: 1,
      viewport: { width: 1000, height: 500 },
      samples: [[0, 0.5, 0.5]],
      clicks: [],
    };
    const { handle } = makeHandle(makeResult({ cursor }));
    const deps = makeDeps(handle);
    const session = createRecordingSession(deps);

    await session.start(TARGET, OPTS);
    await session.stop();

    const calls = vi.mocked(deps.uploadProjectVideoFile).mock.calls;
    expect(calls).toHaveLength(2);
    const cursorCall = calls[1];
    expect(cursorCall[3]).toBe('cursor');
    expect(cursorCall[5]).toBe('cursor.json');
    const blob = cursorCall[4] as Blob;
    expect(blob.type).toBe('application/json');
    expect(JSON.parse(await blobText(blob))).toEqual(cursor);
  });

  it('runs the same flow on size-limit auto-stop and sets the limit message', async () => {
    const { handle, fireAutoStop } = makeHandle(
      makeResult({ stopReason: 'size-limit' }),
    );
    const deps = makeDeps(handle);
    const session = createRecordingSession(deps);

    await session.start(TARGET, OPTS);
    fireAutoStop();
    await vi.waitFor(() => {
      expect(session.getState().status).toBe('idle');
    });

    expect(deps.uploadProjectVideoFile).toHaveBeenCalled();
    expect(deps.navigate).toHaveBeenCalledWith(TARGET.editorPath);
    expect(session.getState().message).toBe(SIZE_LIMIT_MESSAGE);
    expect(session.getState().message).toContain('100 MB');
  });

  it('keeps the blob on upload failure and offers a download', async () => {
    const result = makeResult();
    const { handle } = makeHandle(result);
    const deps = makeDeps(handle);
    deps.uploadProjectVideoFile = vi.fn(async () => {
      throw new Error('Upload too large');
    });
    const session = createRecordingSession(deps);

    await session.start(TARGET, OPTS);
    await session.stop();

    expect(session.getState()).toMatchObject({
      status: 'error',
      message: 'Upload too large',
    });
    expect(deps.navigate).not.toHaveBeenCalled();

    session.downloadFailedRecording();
    expect(deps.download).toHaveBeenCalledWith(result.blob, 'recording.webm');
  });
});
