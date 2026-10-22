import type {
  FrameStyle,
  VideoClip,
  VideoEditState,
  ZoomRegion,
} from '../../types/video';

export const MIN_CLIP_MS = 100;
export const MIN_ZOOM_MS = 100;
export const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 4] as const;

export const DEFAULT_FRAME: FrameStyle = {
  background: {
    kind: 'gradient',
    from: '#1f2937',
    to: '#4b5563',
    angleDeg: 135,
  },
  paddingPct: 0.08,
  cornerRadiusPx: 16,
  shadow: 0.5,
  crop: { x: 0, y: 0, width: 1, height: 1 },
  aspect: '16:9',
};

const MIN_SPEED = SPEEDS[0];
const MAX_SPEED = SPEEDS[SPEEDS.length - 1];

type NewId = () => string;

const defaultNewId: NewId = () => crypto.randomUUID();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createInitialEditState(
  sourceDurationMs: number,
  frame: FrameStyle = DEFAULT_FRAME,
  newId: NewId = defaultNewId,
): VideoEditState {
  return {
    version: 1,
    sourceDurationMs,
    clips: [
      {
        id: newId(),
        sourceStartMs: 0,
        sourceEndMs: sourceDurationMs,
        speed: 1,
        timelineStartMs: 0,
        timelineEndMs: sourceDurationMs,
      },
    ],
    zooms: [],
    frame,
    cursor: { visible: true, scale: 1 },
  };
}

export function repack(clips: VideoClip[]): VideoClip[] {
  let cursor = 0;
  return clips.map((clip) => {
    const durationMs = Math.round(
      (clip.sourceEndMs - clip.sourceStartMs) / clip.speed,
    );
    const packed = {
      ...clip,
      timelineStartMs: cursor,
      timelineEndMs: cursor + durationMs,
    };
    cursor += durationMs;
    return packed;
  });
}

export function timelineDurationMs(state: VideoEditState): number {
  const last = state.clips[state.clips.length - 1];
  return last ? last.timelineEndMs : 0;
}

export function timelineToSource(
  state: VideoEditState,
  timelineMs: number,
): { clipId: string; sourceMs: number } | null {
  const lastIndex = state.clips.length - 1;
  for (let i = 0; i <= lastIndex; i += 1) {
    const clip = state.clips[i];
    const inRange =
      timelineMs >= clip.timelineStartMs &&
      (timelineMs < clip.timelineEndMs ||
        (i === lastIndex && timelineMs === clip.timelineEndMs));
    if (inRange) {
      return {
        clipId: clip.id,
        sourceMs:
          clip.sourceStartMs + (timelineMs - clip.timelineStartMs) * clip.speed,
      };
    }
  }
  return null;
}

export function sourceToTimeline(
  state: VideoEditState,
  clipId: string,
  sourceMs: number,
): number | null {
  const clip = state.clips.find((c) => c.id === clipId);
  if (!clip) return null;
  if (sourceMs < clip.sourceStartMs || sourceMs > clip.sourceEndMs) return null;
  return clip.timelineStartMs + (sourceMs - clip.sourceStartMs) / clip.speed;
}

function clampZoomToClip(zoom: ZoomRegion, clip: VideoClip): ZoomRegion | null {
  const sourceStartMs = Math.max(zoom.sourceStartMs, clip.sourceStartMs);
  const sourceEndMs = Math.min(zoom.sourceEndMs, clip.sourceEndMs);
  if (sourceEndMs - sourceStartMs < MIN_ZOOM_MS) return null;
  return { ...zoom, clipId: clip.id, sourceStartMs, sourceEndMs };
}

export function trimClip(
  state: VideoEditState,
  clipId: string,
  patch: { sourceStartMs?: number; sourceEndMs?: number },
): VideoEditState {
  const clip = state.clips.find((c) => c.id === clipId);
  if (!clip) return state;

  const duration = state.sourceDurationMs;
  let sourceStartMs = clamp(
    patch.sourceStartMs ?? clip.sourceStartMs,
    0,
    duration,
  );
  let sourceEndMs = clamp(patch.sourceEndMs ?? clip.sourceEndMs, 0, duration);
  if (sourceEndMs - sourceStartMs < MIN_CLIP_MS) {
    if (patch.sourceEndMs !== undefined && patch.sourceStartMs === undefined) {
      sourceEndMs = Math.min(duration, sourceStartMs + MIN_CLIP_MS);
    } else {
      sourceStartMs = Math.max(0, sourceEndMs - MIN_CLIP_MS);
    }
  }

  const trimmed: VideoClip = { ...clip, sourceStartMs, sourceEndMs };
  const clips = repack(
    state.clips.map((c) => (c.id === clipId ? trimmed : c)),
  );
  const zooms = state.zooms
    .map((z) => (z.clipId === clipId ? clampZoomToClip(z, trimmed) : z))
    .filter((z): z is ZoomRegion => z !== null);

  return { ...state, clips, zooms };
}

export function splitClip(
  state: VideoEditState,
  clipId: string,
  timelineMs: number,
  newId: NewId = defaultNewId,
): VideoEditState {
  const index = state.clips.findIndex((c) => c.id === clipId);
  if (index === -1) return state;
  const clip = state.clips[index];

  const mapped = timelineToSource(state, timelineMs);
  if (!mapped || mapped.clipId !== clipId) return state;
  const sourceMs = mapped.sourceMs;
  if (
    sourceMs - clip.sourceStartMs < MIN_CLIP_MS ||
    clip.sourceEndMs - sourceMs < MIN_CLIP_MS
  ) {
    return state;
  }

  const left: VideoClip = { ...clip, id: newId(), sourceEndMs: sourceMs };
  const right: VideoClip = { ...clip, id: newId(), sourceStartMs: sourceMs };
  const clips = repack([
    ...state.clips.slice(0, index),
    left,
    right,
    ...state.clips.slice(index + 1),
  ]);

  const zooms: ZoomRegion[] = [];
  for (const zoom of state.zooms) {
    if (zoom.clipId !== clipId) {
      zooms.push(zoom);
      continue;
    }
    const leftPart = clampZoomToClip(zoom, left);
    if (leftPart) zooms.push(leftPart);
    const rightPart = clampZoomToClip(zoom, right);
    if (rightPart) {
      zooms.push(leftPart ? { ...rightPart, id: newId() } : rightPart);
    }
  }

  return { ...state, clips, zooms };
}

export function reorderClip(
  state: VideoEditState,
  clipId: string,
  toIndex: number,
): VideoEditState {
  const fromIndex = state.clips.findIndex((c) => c.id === clipId);
  if (fromIndex === -1) return state;
  const target = clamp(toIndex, 0, state.clips.length - 1);
  if (target === fromIndex) return state;

  const clips = [...state.clips];
  const [moved] = clips.splice(fromIndex, 1);
  clips.splice(target, 0, moved);

  return { ...state, clips: repack(clips) };
}

export function setClipSpeed(
  state: VideoEditState,
  clipId: string,
  speed: number,
): VideoEditState {
  const clip = state.clips.find((c) => c.id === clipId);
  if (!clip) return state;
  const nextSpeed = clamp(speed, MIN_SPEED, MAX_SPEED);

  const clips = repack(
    state.clips.map((c) => (c.id === clipId ? { ...c, speed: nextSpeed } : c)),
  );

  return { ...state, clips };
}

export function deleteClip(state: VideoEditState, clipId: string): VideoEditState {
  if (state.clips.length <= 1) return state;
  const clip = state.clips.find((c) => c.id === clipId);
  if (!clip) return state;

  const clips = repack(state.clips.filter((c) => c.id !== clipId));
  const zooms = state.zooms.filter((z) => z.clipId !== clipId);

  return { ...state, clips, zooms };
}
