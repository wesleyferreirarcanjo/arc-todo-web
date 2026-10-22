import { useEffect, useMemo, useRef } from 'react';
import type { VideoEditorState } from '../../pages/ProjectVideoEditorPage';
import {
  buildCameraTrack,
  buildCursorTrack,
  sampleTrack,
} from '../../lib/videos/camera';
import {
  computeLayout,
  drawFrame,
  outputSize,
} from '../../lib/videos/render';
import {
  timelineDurationMs,
  timelineToSource,
} from '../../lib/videos/timeline';

interface VideoPreviewProps {
  editor: VideoEditorState;
}

export function formatPlaybackMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

type FrameCallbackHandle = number;

function requestVideoFrame(
  video: HTMLVideoElement,
  callback: () => void,
): { handle: FrameCallbackHandle; viaRvfc: boolean } {
  const rvfc = (
    video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
    }
  ).requestVideoFrameCallback;
  if (rvfc) return { handle: rvfc.call(video, callback), viaRvfc: true };
  return { handle: requestAnimationFrame(callback), viaRvfc: false };
}

function cancelVideoFrame(
  video: HTMLVideoElement,
  handle: FrameCallbackHandle,
  viaRvfc: boolean,
): void {
  if (viaRvfc) {
    const cancel = (
      video as HTMLVideoElement & {
        cancelVideoFrameCallback?: (handle: number) => void;
      }
    ).cancelVideoFrameCallback;
    cancel?.call(video, handle);
  } else {
    cancelAnimationFrame(handle);
  }
}

export function VideoPreview({ editor }: VideoPreviewProps) {
  const {
    editState,
    recordingUrl,
    cursorTrack,
    backgroundImage,
    sourceSize,
    playheadMs,
    playing,
    seekVersion,
  } = editor;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cameraTrack = useMemo(
    () => (editState ? buildCameraTrack(editState, cursorTrack) : null),
    [editState, cursorTrack],
  );
  const smoothedCursor = useMemo(
    () => (editState ? buildCursorTrack(editState, cursorTrack) : null),
    [editState, cursorTrack],
  );
  const size = useMemo(
    () =>
      editState && sourceSize
        ? outputSize(
            editState.frame.aspect,
            sourceSize.width,
            sourceSize.height,
            editState.frame.crop,
          )
        : null,
    [editState, sourceSize],
  );
  const layout = useMemo(
    () =>
      editState && sourceSize && size
        ? computeLayout(
            editState.frame,
            sourceSize.width,
            sourceSize.height,
            size.width,
            size.height,
          )
        : null,
    [editState, sourceSize, size],
  );

  // Latest-values ref so playback/seek callbacks never read stale props.
  const latest = useRef({
    editState,
    cameraTrack,
    smoothedCursor,
    layout,
    sourceSize,
    backgroundImage,
    playheadMs,
  });
  useEffect(() => {
    latest.current = {
      editState,
      cameraTrack,
      smoothedCursor,
      layout,
      sourceSize,
      backgroundImage,
      playheadMs,
    };
  });

  function draw(contentMs: number) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const {
      editState: state,
      cameraTrack: camera,
      smoothedCursor: cursor,
      layout: frameLayout,
      sourceSize: source,
      backgroundImage: background,
    } = latest.current;
    if (!canvas || !video || !state || !camera || !frameLayout || !source) {
      return;
    }
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawFrame(
      ctx,
      {
        video,
        sourceW: source.width,
        sourceH: source.height,
        state,
        camera: sampleTrack(camera, contentMs),
        cursorXY: cursor ? sampleTrack(cursor, contentMs) : null,
        background,
      },
      frameLayout,
    );
  }

  // Playback engine: walk the clips like the exporter does — seek to each
  // clip's source start, play at its speed, jump to the next clip at its end.
  // Never reads video.duration: MediaRecorder WebM can report Infinity.
  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    if (!playing) {
      element.pause();
      return;
    }
    // Non-null alias: narrowing does not persist into the closures below.
    const video: HTMLVideoElement = element;
    const initial = latest.current.editState;
    if (!initial || initial.clips.length === 0) {
      editor.setPlaying(false);
      return;
    }

    let cancelled = false;
    let frameHandle: FrameCallbackHandle = 0;
    let viaRvfc = false;

    // Pressing play at the end restarts from the beginning.
    let startMs = latest.current.playheadMs;
    if (startMs >= timelineDurationMs(initial)) startMs = 0;
    const startSource = timelineToSource(initial, startMs);
    const startClip =
      initial.clips.find((clip) => clip.id === startSource?.clipId) ??
      initial.clips[0];
    let activeClipId = startClip.id;
    video.playbackRate = startClip.speed;
    video.currentTime =
      (startSource?.sourceMs ?? startClip.sourceStartMs) / 1000;
    video.play().catch(() => editor.setPlaying(false));

    const schedule = () => {
      const next = requestVideoFrame(video, tick);
      frameHandle = next.handle;
      viaRvfc = next.viaRvfc;
    };

    function tick() {
      if (cancelled) return;
      const state = latest.current.editState;
      if (!state) return;
      const sourceMs = video.currentTime * 1000;
      const clip = state.clips.find((c) => c.id === activeClipId);
      let contentMs: number;
      // video.ended covers a clip end that outlives the actual file.
      if (clip && sourceMs < clip.sourceEndMs && !video.ended) {
        contentMs =
          clip.timelineStartMs +
          (sourceMs - clip.sourceStartMs) / clip.speed;
      } else {
        // Clip finished (or was edited away): jump to the next one.
        const boundaryMs = clip
          ? clip.timelineEndMs
          : latest.current.playheadMs;
        const index = clip ? state.clips.indexOf(clip) : -1;
        const next =
          (index >= 0 ? state.clips[index + 1] : undefined) ??
          state.clips.find(
            (c) =>
              boundaryMs >= c.timelineStartMs &&
              boundaryMs < c.timelineEndMs,
          );
        if (!next) {
          const endMs = timelineDurationMs(state);
          video.pause();
          editor.setPlayheadMs(endMs);
          editor.setPlaying(false);
          draw(endMs);
          return;
        }
        activeClipId = next.id;
        video.playbackRate = next.speed;
        video.currentTime = next.sourceStartMs / 1000;
        if (video.paused) video.play().catch(() => undefined);
        contentMs = next.timelineStartMs;
      }
      contentMs = Math.min(contentMs, timelineDurationMs(state));
      editor.setPlayheadMs(contentMs);
      draw(contentMs);
      schedule();
    }

    schedule();
    return () => {
      cancelled = true;
      cancelVideoFrame(video, frameHandle, viaRvfc);
    };
    // playheadMs is read via latest; seekVersion restarts playback on scrub.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, seekVersion]);

  // Scrubbing while paused: seek the media element and draw on 'seeked'.
  useEffect(() => {
    const video = videoRef.current;
    const state = latest.current.editState;
    if (!video || !state || playing) return;
    const element: HTMLVideoElement = video;
    const mapped = timelineToSource(state, latest.current.playheadMs);
    if (!mapped) return;
    const onSeeked = () => draw(latest.current.playheadMs);
    element.addEventListener('seeked', onSeeked, { once: true });
    element.currentTime = mapped.sourceMs / 1000;
    return () => element.removeEventListener('seeked', onSeeked);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekVersion, playing]);

  // While paused, keep the canvas in sync with edits (tracks/layout/crop).
  useEffect(() => {
    if (playing) return;
    draw(latest.current.playheadMs);
  });

  const totalMs = editState ? timelineDurationMs(editState) : 0;

  return (
    <div className="video-preview">
      {/* Kept rendered (2px) so requestVideoFrameCallback keeps firing. */}
      <video
        ref={videoRef}
        className="video-preview-source"
        src={recordingUrl ?? undefined}
        muted={false}
        playsInline
        preload="auto"
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          if (video.videoWidth > 0) {
            editor.setSourceSize({
              width: video.videoWidth,
              height: video.videoHeight,
            });
          }
        }}
      />
      {size ? (
        <canvas
          ref={canvasRef}
          className="video-preview-canvas"
          width={size.width}
          height={size.height}
        />
      ) : (
        <p className="status-message">Loading preview…</p>
      )}
      <div className="video-preview-controls">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!editState}
          onClick={() => editor.setPlaying(!playing)}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <span className="video-preview-time">
          {formatPlaybackMs(playheadMs)} / {formatPlaybackMs(totalMs)}
        </span>
      </div>
    </div>
  );
}
