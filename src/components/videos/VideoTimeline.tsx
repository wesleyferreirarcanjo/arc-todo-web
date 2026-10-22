import { useRef, useState } from 'react';
import type { VideoEditorState } from '../../pages/ProjectVideoEditorPage';
import {
  deleteClip,
  MIN_ZOOM_MS,
  reorderClip,
  setClipSpeed,
  SPEEDS,
  splitClip,
  sourceToTimeline,
  timelineDurationMs,
  timelineToSource,
  trimClip,
} from '../../lib/videos/timeline';
import { zoomTimelineSpans } from '../../lib/videos/zoom';
import type {
  VideoClip,
  VideoEditState,
  ZoomRegion,
} from '../../types/video';
import { formatPlaybackMs } from './VideoPreview';

interface VideoTimelineProps {
  editor: VideoEditorState;
}

type Drag =
  | {
      kind: 'trim';
      clip: VideoClip;
      edge: 'start' | 'end';
      startX: number;
      pxPerMs: number;
      base: VideoEditState;
    }
  | { kind: 'move'; clip: VideoClip; base: VideoEditState }
  | {
      kind: 'zoom';
      region: ZoomRegion;
      edge: 'start' | 'end';
      grabOffsetMs: number;
      base: VideoEditState;
    };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function VideoTimeline({ editor }: VideoTimelineProps) {
  const { editState } = editor;
  const tracksRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  if (!editState) return null;
  // Non-null alias: narrowing does not persist into the closures below.
  const state: VideoEditState = editState;

  const totalMs = Math.max(1, timelineDurationMs(state));
  const playheadPct = (editor.playheadMs / totalMs) * 100;
  const selectedClip =
    state.clips.find((clip) => clip.id === editor.selectedClipId) ?? null;
  const playheadClip = timelineToSource(state, editor.playheadMs);
  const zoomSpans = zoomTimelineSpans(state);

  function pointerTimelineMs(clientX: number): number {
    const tracks = tracksRef.current;
    if (!tracks) return 0;
    const rect = tracks.getBoundingClientRect();
    return clamp((clientX - rect.left) / rect.width, 0, 1) * totalMs;
  }

  /** Pre-removal insertion index (0..clips.length) for the drop indicator. */
  function insertIndexAt(clientX: number): number {
    const t = pointerTimelineMs(clientX);
    for (let i = 0; i < state.clips.length; i += 1) {
      const clip = state.clips[i];
      if (t < (clip.timelineStartMs + clip.timelineEndMs) / 2) return i;
    }
    return state.clips.length;
  }

  /** reorderClip's toIndex is expressed in the post-removal array. */
  function dropIndexAt(clientX: number, selfId: string): number {
    const insert = insertIndexAt(clientX);
    const fromIndex = state.clips.findIndex((clip) => clip.id === selfId);
    return insert > fromIndex ? insert - 1 : insert;
  }

  function beginDrag(
    event: React.PointerEvent<HTMLElement>,
    drag: Drag,
  ): void {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = drag;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleDragMove(event: React.PointerEvent<HTMLElement>): void {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.kind === 'trim') {
      const deltaMs = ((event.clientX - drag.startX) / drag.pxPerMs) * drag.clip.speed;
      const patch =
        drag.edge === 'start'
          ? { sourceStartMs: drag.clip.sourceStartMs + deltaMs }
          : { sourceEndMs: drag.clip.sourceEndMs + deltaMs };
      editor.setEditState(trimClip(drag.base, drag.clip.id, patch), {
        pushHistory: false,
      });
      return;
    }
    if (drag.kind === 'move') {
      setDropIndex(insertIndexAt(event.clientX));
      return;
    }
    // zoom edge drag: map back to source, must stay on the same clip.
    const targetMs = pointerTimelineMs(event.clientX) - drag.grabOffsetMs;
    const mapped = timelineToSource(drag.base, targetMs);
    if (!mapped || mapped.clipId !== drag.region.clipId) return;
    const clip = drag.base.clips.find((c) => c.id === drag.region.clipId);
    if (!clip) return;
    let { sourceStartMs, sourceEndMs } = drag.region;
    if (drag.edge === 'start') {
      sourceStartMs = clamp(
        mapped.sourceMs,
        clip.sourceStartMs,
        sourceEndMs - MIN_ZOOM_MS,
      );
    } else {
      sourceEndMs = clamp(
        mapped.sourceMs,
        sourceStartMs + MIN_ZOOM_MS,
        clip.sourceEndMs,
      );
    }
    editor.setEditState(
      {
        ...drag.base,
        zooms: drag.base.zooms.map((zoom) =>
          zoom.id === drag.region.id
            ? { ...zoom, sourceStartMs, sourceEndMs }
            : zoom,
        ),
      },
      { pushHistory: false },
    );
  }

  function handleDragEnd(event: React.PointerEvent<HTMLElement>): void {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.kind === 'trim') {
      const deltaMs = ((event.clientX - drag.startX) / drag.pxPerMs) * drag.clip.speed;
      const patch =
        drag.edge === 'start'
          ? { sourceStartMs: drag.clip.sourceStartMs + deltaMs }
          : { sourceEndMs: drag.clip.sourceEndMs + deltaMs };
      editor.setEditState(trimClip(drag.base, drag.clip.id, patch), {
        base: drag.base,
      });
      return;
    }
    if (drag.kind === 'move') {
      const target = dropIndexAt(event.clientX, drag.clip.id);
      setDropIndex(null);
      const fromIndex = drag.base.clips.findIndex(
        (clip) => clip.id === drag.clip.id,
      );
      if (target !== fromIndex) {
        editor.setEditState(reorderClip(drag.base, drag.clip.id, target));
      }
      return;
    }
    // Commit the zoom resize as a single history entry off the drag base.
    editor.setEditState(state, { base: drag.base });
  }

  function handleRulerPointer(
    event: React.PointerEvent<HTMLDivElement>,
  ): void {
    if (event.type === 'pointerdown') {
      event.currentTarget.setPointerCapture(event.pointerId);
    } else if ((event.buttons & 1) === 0) {
      return;
    }
    editor.seekTo(pointerTimelineMs(event.clientX));
  }

  function pxPerMs(): number {
    const tracks = tracksRef.current;
    return tracks ? tracks.getBoundingClientRect().width / totalMs : 1;
  }

  return (
    <div className="video-timeline">
      <div className="video-timeline-toolbar">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!playheadClip}
          onClick={() => {
            if (playheadClip) {
              editor.setEditState(
                splitClip(editState, playheadClip.clipId, editor.playheadMs),
              );
            }
          }}
        >
          Split
        </button>
        <label className="video-timeline-speed">
          Speed
          <select
            value={selectedClip?.speed ?? 1}
            disabled={!selectedClip}
            onChange={(event) => {
              if (selectedClip) {
                editor.setEditState(
                  setClipSpeed(
                    editState,
                    selectedClip.id,
                    Number(event.target.value),
                  ),
                );
              }
            }}
          >
            {SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!selectedClip || editState.clips.length <= 1}
          onClick={() => {
            if (selectedClip) {
              editor.setEditState(deleteClip(editState, selectedClip.id));
              editor.selectClip(null);
            }
          }}
        >
          Delete clip
        </button>
        <span className="video-timeline-toolbar-gap" />
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!editor.canUndoEdit}
          onClick={editor.undoEditState}
        >
          Undo
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!editor.canRedoEdit}
          onClick={editor.redoEditState}
        >
          Redo
        </button>
      </div>

      <div className="video-timeline-tracks" ref={tracksRef}>
        <div
          className="video-timeline-ruler"
          role="presentation"
          onPointerDown={handleRulerPointer}
          onPointerMove={handleRulerPointer}
        />
        <div className="video-timeline-clips">
          {editState.clips.map((clip, index) => {
            const left = (clip.timelineStartMs / totalMs) * 100;
            const width =
              ((clip.timelineEndMs - clip.timelineStartMs) / totalMs) * 100;
            const selected = clip.id === editor.selectedClipId;
            return (
              <div
                key={clip.id}
                className={`video-timeline-clip${selected ? ' is-selected' : ''}`}
                style={{ left: `${left}%`, width: `${width}%` }}
                role="button"
                tabIndex={0}
                title={`Clip ${index + 1} · ${formatPlaybackMs(clip.timelineEndMs - clip.timelineStartMs)}`}
                onPointerDown={(event) => {
                  editor.selectClip(clip.id);
                  beginDrag(event, {
                    kind: 'move',
                    clip,
                    base: editState,
                  });
                }}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onPointerCancel={handleDragEnd}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') editor.selectClip(clip.id);
                }}
              >
                <span
                  className="video-timeline-clip-edge is-start"
                  onPointerDown={(event) => {
                    editor.selectClip(clip.id);
                    beginDrag(event, {
                      kind: 'trim',
                      clip,
                      edge: 'start',
                      startX: event.clientX,
                      pxPerMs: pxPerMs(),
                      base: editState,
                    });
                  }}
                  onPointerMove={handleDragMove}
                  onPointerUp={handleDragEnd}
                  onPointerCancel={handleDragEnd}
                />
                <span className="video-timeline-clip-label">
                  {clip.speed}x
                </span>
                <span
                  className="video-timeline-clip-edge is-end"
                  onPointerDown={(event) => {
                    editor.selectClip(clip.id);
                    beginDrag(event, {
                      kind: 'trim',
                      clip,
                      edge: 'end',
                      startX: event.clientX,
                      pxPerMs: pxPerMs(),
                      base: editState,
                    });
                  }}
                  onPointerMove={handleDragMove}
                  onPointerUp={handleDragEnd}
                  onPointerCancel={handleDragEnd}
                />
              </div>
            );
          })}
          {dropIndex != null && (
            <span
              className="video-timeline-drop"
              style={{
                left: `${
                  ((dropIndex < editState.clips.length
                    ? editState.clips[dropIndex].timelineStartMs
                    : totalMs) /
                    totalMs) *
                  100
                }%`,
              }}
              aria-hidden="true"
            />
          )}
        </div>
        <div className="video-timeline-zooms">
          {zoomSpans.map(({ region, startMs, endMs }) => {
            const clip = editState.clips.find((c) => c.id === region.clipId);
            const edgeStart = clip
              ? sourceToTimeline(editState, clip.id, region.sourceStartMs)
              : null;
            const edgeEnd = clip
              ? sourceToTimeline(editState, clip.id, region.sourceEndMs)
              : null;
            const selected = region.id === editor.selectedZoomId;
            return (
              <div
                key={region.id}
                className={`video-timeline-zoom is-${region.origin}${selected ? ' is-selected' : ''}`}
                style={{
                  left: `${(startMs / totalMs) * 100}%`,
                  width: `${((endMs - startMs) / totalMs) * 100}%`,
                }}
                role="button"
                tabIndex={0}
                title={`Zoom ${region.scale}x · ${region.origin}`}
                onPointerDown={() => editor.selectZoom(region.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') editor.selectZoom(region.id);
                }}
              >
                <span
                  className="video-timeline-zoom-edge is-start"
                  onPointerDown={(event) => {
                    editor.selectZoom(region.id);
                    if (edgeStart == null) return;
                    beginDrag(event, {
                      kind: 'zoom',
                      region,
                      edge: 'start',
                      grabOffsetMs:
                        pointerTimelineMs(event.clientX) - edgeStart,
                      base: editState,
                    });
                  }}
                  onPointerMove={handleDragMove}
                  onPointerUp={handleDragEnd}
                  onPointerCancel={handleDragEnd}
                />
                <span
                  className="video-timeline-zoom-edge is-end"
                  onPointerDown={(event) => {
                    editor.selectZoom(region.id);
                    if (edgeEnd == null) return;
                    beginDrag(event, {
                      kind: 'zoom',
                      region,
                      edge: 'end',
                      grabOffsetMs:
                        pointerTimelineMs(event.clientX) - edgeEnd,
                      base: editState,
                    });
                  }}
                  onPointerMove={handleDragMove}
                  onPointerUp={handleDragEnd}
                  onPointerCancel={handleDragEnd}
                />
              </div>
            );
          })}
        </div>
        <div
          className="video-timeline-playhead"
          style={{ left: `${playheadPct}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
