import { useRef, useState } from 'react';
import type { VideoEditorState } from '../../pages/ProjectVideoEditorPage';
import {
  MIN_ZOOM_MS,
  timelineToSource,
} from '../../lib/videos/timeline';
import {
  DEFAULT_ZOOM_SCALE,
  MAX_SCALE,
  MIN_SCALE,
  suggestZooms,
} from '../../lib/videos/zoom';
import type {
  VideoEditState,
  ZoomRegion,
} from '../../types/video';

interface ZoomPanelProps {
  editor: VideoEditorState;
}

const NEW_ZOOM_MS = 2000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function ZoomPanel({ editor }: ZoomPanelProps) {
  const { editState } = editor;
  const [message, setMessage] = useState<string | null>(null);
  const dragBaseRef = useRef<VideoEditState | null>(null);

  if (!editState) return null;
  // Non-null alias: narrowing does not persist into the closures below.
  const state: VideoEditState = editState;

  const selected =
    state.zooms.find((zoom) => zoom.id === editor.selectedZoomId) ?? null;

  function patchZoom(
    region: ZoomRegion,
    patch: Partial<ZoomRegion>,
    options?: { pushHistory?: boolean; base?: VideoEditState },
  ): void {
    editor.setEditState(
      {
        ...state,
        zooms: state.zooms.map((zoom) =>
          zoom.id === region.id ? { ...zoom, ...patch } : zoom,
        ),
      },
      options,
    );
  }

  // Slider-style controls: transient updates while dragging, one history
  // entry on release that restores the drag-start state on undo.
  function transientZoom(
    region: ZoomRegion,
    patch: Partial<ZoomRegion>,
  ): void {
    if (!dragBaseRef.current) dragBaseRef.current = state;
    patchZoom(region, patch, { pushHistory: false });
  }

  function commitZoom(): void {
    const base = dragBaseRef.current;
    if (!base) return;
    dragBaseRef.current = null;
    editor.setEditState(state, { base });
  }

  function handleAddZoom(): void {
    const mapped = timelineToSource(state, editor.playheadMs);
    if (!mapped) return;
    const clip = state.clips.find((c) => c.id === mapped.clipId);
    if (!clip) return;
    const sourceStartMs = clamp(
      mapped.sourceMs,
      clip.sourceStartMs,
      clip.sourceEndMs - MIN_ZOOM_MS,
    );
    const region: ZoomRegion = {
      id: crypto.randomUUID(),
      clipId: clip.id,
      sourceStartMs,
      sourceEndMs: Math.min(clip.sourceEndMs, sourceStartMs + NEW_ZOOM_MS),
      scale: DEFAULT_ZOOM_SCALE,
      focus: { x: 0.5, y: 0.5 },
      followCursor: Boolean(editor.cursorTrack),
      origin: 'manual',
    };
    editor.setEditState({
      ...state,
      zooms: [...state.zooms, region],
    });
    editor.selectZoom(region.id);
    setMessage(null);
  }

  function handleSuggest(): void {
    const result = suggestZooms(state, editor.cursorTrack);
    if (result === 'no-cursor-data') {
      setMessage(
        'Auto zoom needs a recording of this tab. Add zooms manually.',
      );
      return;
    }
    if (result.length === 0) {
      setMessage('No new zooms to add.');
      return;
    }
    editor.setEditState({
      ...state,
      zooms: [...state.zooms, ...result],
    });
    setMessage(`Added ${result.length} zooms.`);
  }

  function focusFromEvent(
    event: React.PointerEvent<HTMLDivElement>,
  ): { x: number; y: number } {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
    };
  }

  return (
    <div className="video-panel">
      <div className="video-panel-actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!hasClipAt(editState, editor.playheadMs)}
          onClick={handleAddZoom}
        >
          Add zoom
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleSuggest}
        >
          Suggest zooms
        </button>
      </div>
      {message && <p className="status-message">{message}</p>}

      {selected && (
        <div className="video-panel-section">
          <div className="form-field">
            <span>Depth</span>
            <div className="video-panel-slider">
              <input
                type="range"
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={0.25}
                value={selected.scale}
                aria-label="Zoom depth"
                onChange={(event) =>
                  transientZoom(selected, {
                    scale: Number(event.target.value),
                  })
                }
                onPointerUp={commitZoom}
                onKeyUp={commitZoom}
                onBlur={commitZoom}
              />
              <span className="video-panel-value">{selected.scale}x</span>
            </div>
          </div>

          <div className="form-field">
            <span>Focus</span>
            <div
              className="zoom-focus-picker"
              role="presentation"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                transientZoom(selected, { focus: focusFromEvent(event) });
              }}
              onPointerMove={(event) => {
                if ((event.buttons & 1) === 0 || !dragBaseRef.current) return;
                transientZoom(selected, { focus: focusFromEvent(event) });
              }}
              onPointerUp={commitZoom}
              onPointerCancel={commitZoom}
            >
              <span
                className="zoom-focus-dot"
                style={{
                  left: `${selected.focus.x * 100}%`,
                  top: `${selected.focus.y * 100}%`,
                }}
                aria-hidden="true"
              />
            </div>
          </div>

          <label className="video-panel-check">
            <input
              type="checkbox"
              checked={selected.followCursor}
              disabled={!editor.cursorTrack}
              onChange={(event) =>
                patchZoom(selected, { followCursor: event.target.checked })
              }
            />
            Follow cursor
          </label>
          {!editor.cursorTrack && (
            <p className="status-message">
              Cursor following needs a recording of this tab.
            </p>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              editor.setEditState({
                ...editState,
                zooms: editState.zooms.filter(
                  (zoom) => zoom.id !== selected.id,
                ),
              });
              editor.selectZoom(null);
            }}
          >
            Delete zoom
          </button>
        </div>
      )}
    </div>
  );
}

function hasClipAt(state: VideoEditState, playheadMs: number): boolean {
  return timelineToSource(state, playheadMs) !== null;
}
