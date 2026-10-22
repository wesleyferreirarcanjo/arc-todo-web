import type { CursorTrack, VideoEditState } from '../../types/video';
import {
  buildCameraTrack,
  buildCursorTrack,
  sampleTrack,
  TRACK_FPS,
} from './camera';
import { timelineDurationMs } from './timeline';
import { computeLayout, drawFrame, outputSize } from './render';

export const EXPORT_MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
] as const;

export interface ExportFormat {
  mimeType: string;
  label: 'WebM' | 'MP4';
  ext: 'webm' | 'mp4';
}

export function pickExportMimeTypes(
  isTypeSupported: (mimeType: string) => boolean,
): ExportFormat[] {
  const formats: ExportFormat[] = [];
  let webmPicked = false;
  let mp4Picked = false;
  for (const mimeType of EXPORT_MIME_CANDIDATES) {
    const isWebM = mimeType.startsWith('video/webm');
    if ((isWebM && webmPicked) || (!isWebM && mp4Picked)) continue;
    if (!isTypeSupported(mimeType)) continue;
    formats.push(
      isWebM
        ? { mimeType, label: 'WebM', ext: 'webm' }
        : { mimeType, label: 'MP4', ext: 'mp4' },
    );
    if (isWebM) webmPicked = true;
    else mp4Picked = true;
  }
  return formats;
}

export interface ExportVideoOptions {
  state: VideoEditState;
  recordingUrl: string;
  sourceW: number;
  sourceH: number;
  cursor: CursorTrack | null;
  background: CanvasImageSource | null;
  mimeType: string;
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
}

function abortError(): DOMException {
  return new DOMException('Export aborted.', 'AbortError');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// ponytail: real-time export (takes timeline duration). Upgrade = WebCodecs VideoEncoder + muxer for faster-than-real-time, frame-exact output.
export async function exportVideo(opts: ExportVideoOptions): Promise<Blob> {
  const {
    state,
    recordingUrl,
    sourceW,
    sourceH,
    cursor,
    background,
    mimeType,
    onProgress,
    signal,
  } = opts;

  // Dedicated element: createMediaElementSource works once per element, so the
  // preview element can never be reused here.
  const video = document.createElement('video');
  video.src = recordingUrl;
  video.muted = false;
  video.playsInline = true;
  video.preload = 'auto';
  // Kept rendered (2px) so requestVideoFrameCallback keeps firing.
  video.style.cssText =
    'position:fixed;right:0;bottom:0;width:2px;height:2px;opacity:0.01;pointer-events:none;';
  document.body.appendChild(video);

  const chunks: Blob[] = [];
  let audioCtx: AudioContext | null = null;
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let fatal: unknown = null;
  let pausedByVisibility = false;
  let wantRecording = false;

  const throwIfStopped = (): void => {
    if (signal.aborted) throw abortError();
    if (fatal) throw fatal;
  };

  const abortPromise = new Promise<never>((_, reject) => {
    if (signal.aborted) reject(abortError());
    else {
      signal.addEventListener('abort', () => reject(abortError()), {
        once: true,
      });
    }
  });
  // Consumed via Promise.race; keep a handler attached so a rejection while no
  // race is pending never surfaces as an unhandled rejection.
  void abortPromise.catch(() => undefined);

  function once(target: EventTarget, name: string): Promise<void> {
    return Promise.race([
      new Promise<void>((resolve) => {
        target.addEventListener(name, () => resolve(), { once: true });
      }),
      abortPromise,
    ]);
  }

  function handleVisibilityChange(): void {
    if (document.hidden) {
      if (!video.paused) {
        video.pause();
        pausedByVisibility = true;
      }
      if (recorder && recorder.state === 'recording') recorder.pause();
    } else {
      if (recorder && recorder.state === 'paused' && wantRecording) {
        recorder.resume();
      }
      if (pausedByVisibility) {
        pausedByVisibility = false;
        video.play().catch((err: unknown) => {
          fatal = err ?? new Error('Video playback failed during export.');
        });
      }
    }
  }

  const requestFrame = (
    video as HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: () => void) => number;
    }
  ).requestVideoFrameCallback?.bind(video);

  function nextFrame(): Promise<void> {
    if (!requestFrame) {
      return new Promise((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    }
    // Watchdog delay so abort/visibility checks still run when no new frame is
    // presented (e.g. while the video is paused).
    return Promise.race([
      new Promise<void>((resolve) => requestFrame(() => resolve())),
      delay(500),
    ]);
  }

  try {
    throwIfStopped();

    // Route audio into the recording stream, never to the speakers.
    audioCtx = new AudioContext();
    const elementSource = audioCtx.createMediaElementSource(video);
    const audioDest = audioCtx.createMediaStreamDestination();
    elementSource.connect(audioDest);
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    const { width: outW, height: outH } = outputSize(
      state.frame.aspect,
      sourceW,
      sourceH,
      state.frame.crop,
    );
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context is unavailable.');

    stream = canvas.captureStream(30);
    for (const track of audioDest.stream.getAudioTracks()) {
      stream.addTrack(track);
    }

    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8_000_000,
    });
    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.start(1000);
    recorder.pause();

    const cameraTrack = buildCameraTrack(state, cursor, TRACK_FPS);
    const cursorTrack = buildCursorTrack(state, cursor, TRACK_FPS);
    const layout = computeLayout(state.frame, sourceW, sourceH, outW, outH);
    const totalMs = Math.max(1, timelineDurationMs(state));

    if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
      await once(video, 'loadedmetadata');
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    for (const clip of state.clips) {
      throwIfStopped();

      const seeked = once(video, 'seeked');
      video.currentTime = clip.sourceStartMs / 1000;
      await seeked;
      throwIfStopped();

      video.playbackRate = clip.speed;
      wantRecording = true;
      recorder.resume();
      try {
        await Promise.race([video.play(), abortPromise]);
      } catch (err) {
        // play() interrupted by pause() (e.g. tab hidden) surfaces as an
        // AbortError; the frame loop idles until playback resumes.
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          throw err;
        }
      }
      throwIfStopped();

      while (true) {
        throwIfStopped();
        if (video.error) {
          throw new Error('Video playback failed during export.');
        }
        if (video.paused) {
          await delay(100);
          continue;
        }
        const contentMs =
          clip.timelineStartMs +
          (video.currentTime * 1000 - clip.sourceStartMs) / clip.speed;
        drawFrame(
          ctx,
          {
            video,
            sourceW,
            sourceH,
            state,
            camera: sampleTrack(cameraTrack, contentMs),
            cursorXY: cursorTrack ? sampleTrack(cursorTrack, contentMs) : null,
            background,
          },
          layout,
        );
        onProgress(Math.min(1, contentMs / totalMs));
        if (video.currentTime * 1000 >= clip.sourceEndMs) break;
        await nextFrame();
      }

      video.pause();
      wantRecording = false;
      pausedByVisibility = false;
      recorder.pause();
    }

    onProgress(1);
    if (recorder.state !== 'inactive') {
      const stopped = once(recorder, 'stop');
      recorder.stop();
      await stopped;
    }
    return new Blob(chunks, { type: mimeType.split(';')[0] });
  } finally {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    video.pause();
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // already stopping
      }
    }
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
    }
    if (audioCtx) void audioCtx.close().catch(() => undefined);
    video.removeAttribute('src');
    video.load();
    video.remove();
  }
}
