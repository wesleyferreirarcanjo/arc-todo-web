import type {
  CursorTrack,
  VideoEditState,
  ZoomRegion,
} from '../../types/video';
import { sourceToTimeline } from './timeline';

export const ZOOM_RAMP_MS = 350;
export const DEFAULT_ZOOM_SCALE = 2;
export const MIN_SCALE = 1.25;
export const MAX_SCALE = 5;

const CLICK_GROUP_GAP_MS = 1500;
const REGION_LEAD_MS = 600;
const REGION_TAIL_MS = 1400;
const REGION_MIN_MS = 1500;
const FOCUS_RADIUS = 0.1;

export function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function zoomTimelineSpans(
  state: VideoEditState,
): Array<{ region: ZoomRegion; startMs: number; endMs: number }> {
  const spans: Array<{ region: ZoomRegion; startMs: number; endMs: number }> =
    [];
  for (const region of state.zooms) {
    const startMs = sourceToTimeline(state, region.clipId, region.sourceStartMs);
    const endMs = sourceToTimeline(state, region.clipId, region.sourceEndMs);
    if (startMs == null || endMs == null) continue;
    spans.push({ region, startMs, endMs });
  }
  return spans;
}

export function zoomScaleAt(
  state: VideoEditState,
  timelineMs: number,
): { scale: number; region: ZoomRegion | null } {
  let scale = 1;
  let region: ZoomRegion | null = null;
  for (const span of zoomTimelineSpans(state)) {
    if (timelineMs < span.startMs || timelineMs > span.endMs) continue;
    const ramp = Math.min(ZOOM_RAMP_MS, (span.endMs - span.startMs) / 2);
    let k = 1;
    if (timelineMs < span.startMs + ramp) {
      k = easeInOutCubic((timelineMs - span.startMs) / ramp);
    } else if (timelineMs > span.endMs - ramp) {
      k = easeInOutCubic((span.endMs - timelineMs) / ramp);
    }
    const s = 1 + (span.region.scale - 1) * k;
    if (s > scale) {
      scale = s;
      region = span.region;
    }
  }
  return { scale, region };
}

interface TaggedClick {
  clipId: string;
  sourceMs: number;
  timelineMs: number;
  x: number;
  y: number;
}

export function suggestZooms(
  state: VideoEditState,
  cursor: CursorTrack | null,
  newId: () => string = () => crypto.randomUUID(),
): ZoomRegion[] | 'no-cursor-data' {
  if (!cursor || cursor.clicks.length === 0) return 'no-cursor-data';

  const clicks: TaggedClick[] = [];
  for (const [tMs, x, y] of cursor.clicks) {
    const clip = state.clips.find(
      (c) => tMs >= c.sourceStartMs && tMs <= c.sourceEndMs,
    );
    if (!clip) continue;
    const timelineMs = sourceToTimeline(state, clip.id, tMs);
    if (timelineMs == null) continue;
    clicks.push({ clipId: clip.id, sourceMs: tMs, timelineMs, x, y });
  }
  clicks.sort((a, b) => a.timelineMs - b.timelineMs);

  const groups: TaggedClick[][] = [];
  for (const click of clicks) {
    const group = groups[groups.length - 1];
    const prev = group?.[group.length - 1];
    if (
      group &&
      prev &&
      click.clipId === prev.clipId &&
      click.timelineMs - prev.timelineMs <= CLICK_GROUP_GAP_MS
    ) {
      group.push(click);
    } else {
      groups.push([click]);
    }
  }

  const taken = zoomTimelineSpans(state).map((s) => ({
    startMs: s.startMs,
    endMs: s.endMs,
  }));
  const regions: ZoomRegion[] = [];
  for (const group of groups) {
    const clip = state.clips.find((c) => c.id === group[0].clipId);
    if (!clip) continue;
    let startMs = Math.max(clip.sourceStartMs, group[0].sourceMs - REGION_LEAD_MS);
    let endMs = Math.min(
      clip.sourceEndMs,
      group[group.length - 1].sourceMs + REGION_TAIL_MS,
    );
    if (endMs - startMs < REGION_MIN_MS) {
      endMs = Math.min(clip.sourceEndMs, startMs + REGION_MIN_MS);
      startMs = Math.max(clip.sourceStartMs, endMs - REGION_MIN_MS);
    }
    const tlStart = sourceToTimeline(state, clip.id, startMs);
    const tlEnd = sourceToTimeline(state, clip.id, endMs);
    if (tlStart == null || tlEnd == null) continue;
    if (taken.some((s) => tlStart < s.endMs && s.startMs < tlEnd)) continue;

    let focus = group[0];
    let bestCount = -1;
    for (const click of group) {
      let count = 0;
      for (const other of group) {
        if (other === click) continue;
        if (Math.hypot(other.x - click.x, other.y - click.y) <= FOCUS_RADIUS) {
          count += 1;
        }
      }
      if (count > bestCount) {
        focus = click;
        bestCount = count;
      }
    }

    regions.push({
      id: newId(),
      clipId: clip.id,
      sourceStartMs: startMs,
      sourceEndMs: endMs,
      scale: DEFAULT_ZOOM_SCALE,
      focus: { x: focus.x, y: focus.y },
      followCursor: true,
      origin: 'suggested',
    });
    taken.push({ startMs: tlStart, endMs: tlEnd });
  }
  return regions;
}
