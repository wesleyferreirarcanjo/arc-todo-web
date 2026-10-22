import type { CursorTrack } from '../../types/video';
import { startCursorCapture, type CursorCapture } from './cursorCapture';
import { pickRecorderMimeType } from './mime';

// ponytail: mirrors API default MINIO_MAX_UPLOAD_BYTES; server still enforces the real cap. Upgrade = expose the cap from the API.
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const AUTO_STOP_RATIO = 0.95;
export const RECORD_TIMESLICE_MS = 1000;
export const MIC_UNAVAILABLE_NOTICE =
  'Microphone unavailable — recording without it.';

export type RecordingSource = 'this-tab' | 'other';
export type RecordStopReason = 'user' | 'size-limit' | 'track-ended';

export interface StartVideoRecordingOptions {
  source: RecordingSource;
  microphone: boolean;
}

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  cursor: CursorTrack | null;
  stopReason: RecordStopReason;
}

export interface RecordingHandle {
  notice?: string;
  stop(): Promise<RecordingResult>;
  onAutoStop(cb: (result: RecordingResult) => void): void;
}

export function isDisplayMediaCancel(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = (error as { name?: unknown }).name;
  return name === 'NotAllowedError' || name === 'AbortError';
}

export async function startVideoRecording(
  opts: StartVideoRecordingOptions,
): Promise<RecordingHandle | null> {
  let displayStream: MediaStream;
  try {
    displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: true,
      preferCurrentTab: opts.source === 'this-tab',
      selfBrowserSurface: opts.source === 'this-tab' ? 'include' : 'exclude',
      surfaceSwitching: 'exclude',
    } as DisplayMediaStreamOptions);
  } catch (error) {
    if (isDisplayMediaCancel(error)) return null;
    throw error;
  }

  let micStream: MediaStream | null = null;
  let notice: string | undefined;
  if (opts.microphone) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      notice = MIC_UNAVAILABLE_NOTICE;
    }
  }

  const videoTrack = displayStream.getVideoTracks()[0];
  const audioTracks = [
    ...displayStream.getAudioTracks(),
    ...(micStream?.getAudioTracks() ?? []),
  ];

  let audioContext: AudioContext | null = null;
  const tracks: MediaStreamTrack[] = [videoTrack];
  if (audioTracks.length === 1) {
    tracks.push(audioTracks[0]);
  } else if (audioTracks.length > 1) {
    // MediaRecorder takes one audio track; mix display audio + mic into one.
    audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    for (const track of audioTracks) {
      audioContext
        .createMediaStreamSource(new MediaStream([track]))
        .connect(destination);
    }
    tracks.push(...destination.stream.getAudioTracks());
  }
  const stream = new MediaStream(tracks);

  const mimeType = pickRecorderMimeType((mime) =>
    MediaRecorder.isTypeSupported(mime),
  );
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2_500_000,
  });

  const inTab =
    opts.source === 'this-tab' &&
    videoTrack.getSettings().displaySurface === 'browser';

  const chunks: Blob[] = [];
  let bytes = 0;
  let startedAt = 0;
  let cursorCapture: CursorCapture | null = null;
  let settled = false;
  let requestedReason: RecordStopReason | null = null;
  const autoStopCallbacks = new Set<(result: RecordingResult) => void>();

  let resolveDone!: (result: RecordingResult) => void;
  const done = new Promise<RecordingResult>((resolve) => {
    resolveDone = resolve;
  });

  function stopAllTracks() {
    for (const track of stream.getTracks()) track.stop();
    for (const track of displayStream.getTracks()) track.stop();
    if (micStream) {
      for (const track of micStream.getTracks()) track.stop();
    }
    if (audioContext) void audioContext.close();
  }

  function requestStop(reason: RecordStopReason): Promise<RecordingResult> {
    if (!requestedReason) requestedReason = reason;
    if (!settled && recorder.state !== 'inactive') {
      recorder.stop();
    }
    return done;
  }

  recorder.addEventListener('start', () => {
    startedAt = performance.now();
    if (inTab) {
      cursorCapture = startCursorCapture(startedAt);
    }
  });

  recorder.addEventListener('dataavailable', (event) => {
    const blobEvent = event as BlobEvent;
    if (!blobEvent.data || blobEvent.data.size === 0) return;
    chunks.push(blobEvent.data);
    bytes += blobEvent.data.size;
    if (bytes >= VIDEO_MAX_BYTES * AUTO_STOP_RATIO) {
      void requestStop('size-limit');
    }
  });

  recorder.addEventListener('stop', () => {
    if (settled) return;
    settled = true;
    const durationMs = Math.round(performance.now() - startedAt);
    const cursor = cursorCapture ? cursorCapture.stop() : null;
    stopAllTracks();
    const result: RecordingResult = {
      blob: new Blob(chunks, {
        type: mimeType?.split(';')[0] ?? 'video/webm',
      }),
      mimeType: mimeType ?? 'video/webm',
      durationMs,
      cursor,
      stopReason: requestedReason ?? 'user',
    };
    resolveDone(result);
    if (result.stopReason !== 'user') {
      for (const cb of autoStopCallbacks) cb(result);
    }
  });

  // The browser's own "Stop sharing" control ends the track.
  videoTrack.addEventListener('ended', () => {
    void requestStop('track-ended');
  });

  try {
    recorder.start(RECORD_TIMESLICE_MS);
  } catch (error) {
    stopAllTracks();
    throw error;
  }

  return {
    notice,
    stop: () => requestStop('user'),
    onAutoStop(cb) {
      autoStopCallbacks.add(cb);
    },
  };
}
