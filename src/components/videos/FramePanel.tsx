import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ErrorAlert } from '../ErrorAlert';
import type { VideoEditorState } from '../../pages/ProjectVideoEditorPage';
import { uploadProjectVideoFile } from '../../lib/api/videos';
import { userMessage, WEB_ERROR } from '../../lib/errors/messages';
import { DEFAULT_FRAME } from '../../lib/videos/timeline';
import type {
  FrameAspect,
  FrameBackground,
  FrameStyle,
  VideoEditState,
} from '../../types/video';

interface FramePanelProps {
  editor: VideoEditorState;
}

const ASPECTS: Array<{ value: FrameAspect; label: string }> = [
  { value: 'source', label: 'Source' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
];

const MIN_CROP = 0.2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function FramePanel({ editor }: FramePanelProps) {
  const { orgId, projectId, videoId } = useParams();
  const { editState } = editor;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragBaseRef = useRef<VideoEditState | null>(null);

  if (!editState) return null;
  const state: VideoEditState = editState;
  const { frame } = state;

  function patchFrame(
    patch: Partial<FrameStyle>,
    options?: { pushHistory?: boolean; base?: VideoEditState },
  ): void {
    editor.setEditState(
      { ...state, frame: { ...state.frame, ...patch } },
      options,
    );
  }

  // Slider-style controls: transient updates while dragging, one history
  // entry on release that restores the drag-start state on undo.
  function transient(patch: Partial<FrameStyle>): void {
    if (!dragBaseRef.current) dragBaseRef.current = state;
    patchFrame(patch, { pushHistory: false });
  }

  function commit(): void {
    const base = dragBaseRef.current;
    if (!base) return;
    dragBaseRef.current = null;
    editor.setEditState(state, { base });
  }

  function setBackgroundKind(kind: FrameBackground['kind']): void {
    if (frame.background.kind === kind) return;
    const fallback = DEFAULT_FRAME.background;
    let background: FrameBackground;
    if (kind === 'solid') {
      background = {
        kind: 'solid',
        color: fallback.kind === 'solid' ? fallback.color : '#1f2937',
      };
    } else if (kind === 'gradient') {
      background =
        fallback.kind === 'gradient'
          ? { ...fallback }
          : { kind: 'gradient', from: '#1f2937', to: '#4b5563', angleDeg: 135 };
    } else {
      background = { kind: 'image' };
    }
    patchFrame({ background });
  }

  function transientBackground(patch: Partial<FrameBackground>): void {
    if (!dragBaseRef.current) dragBaseRef.current = state;
    patchFrame(
      {
        background: { ...frame.background, ...patch } as FrameBackground,
      },
      { pushHistory: false },
    );
  }

  function patchCrop(
    patch: Partial<FrameStyle['crop']>,
    options?: { pushHistory?: boolean; base?: VideoEditState },
  ): void {
    const crop = { ...state.frame.crop, ...patch };
    crop.x = clamp(crop.x, 0, 1 - MIN_CROP);
    crop.y = clamp(crop.y, 0, 1 - MIN_CROP);
    crop.width = clamp(crop.width, MIN_CROP, 1 - crop.x);
    crop.height = clamp(crop.height, MIN_CROP, 1 - crop.y);
    patchFrame({ crop }, options);
  }

  function transientCrop(patch: Partial<FrameStyle['crop']>): void {
    if (!dragBaseRef.current) dragBaseRef.current = state;
    patchCrop(patch, { pushHistory: false });
  }

  async function handleBackgroundFile(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !orgId || !projectId || !videoId) return;
    setUploading(true);
    setError(null);
    try {
      const updated = await uploadProjectVideoFile(
        orgId,
        projectId,
        videoId,
        'background',
        file,
        file.name,
      );
      editor.setVideo(updated);
      editor.setBackgroundUrl(URL.createObjectURL(file));
      patchFrame({ background: { kind: 'image' } });
    } catch (err) {
      setError(
        userMessage(err, WEB_ERROR.SAVE, { thing: 'the background image' }),
      );
    } finally {
      setUploading(false);
    }
  }

  const sliderCommit = {
    onPointerUp: commit,
    onKeyUp: commit,
    onBlur: commit,
  } as const;

  return (
    <div className="video-panel">
      <div className="form-field">
        <span>Background</span>
        <div className="frame-bg-kinds">
          {(['solid', 'gradient', 'image'] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              className={`frame-bg-kind${frame.background.kind === kind ? ' is-active' : ''}`}
              onClick={() => setBackgroundKind(kind)}
            >
              {kind === 'solid'
                ? 'Solid'
                : kind === 'gradient'
                  ? 'Gradient'
                  : 'Image'}
            </button>
          ))}
        </div>
        {frame.background.kind === 'solid' && (
          <input
            type="color"
            value={frame.background.color}
            aria-label="Background color"
            onChange={(event) =>
              transientBackground({ color: event.target.value })
            }
            {...sliderCommit}
          />
        )}
        {frame.background.kind === 'gradient' && (
          <div className="frame-gradient-controls">
            <input
              type="color"
              value={frame.background.from}
              aria-label="Gradient start color"
              onChange={(event) =>
                transientBackground({ from: event.target.value })
              }
              {...sliderCommit}
            />
            <input
              type="color"
              value={frame.background.to}
              aria-label="Gradient end color"
              onChange={(event) =>
                transientBackground({ to: event.target.value })
              }
              {...sliderCommit}
            />
            <input
              type="range"
              min={0}
              max={360}
              step={5}
              value={frame.background.angleDeg}
              aria-label="Gradient angle"
              onChange={(event) =>
                transientBackground({ angleDeg: Number(event.target.value) })
              }
              {...sliderCommit}
            />
          </div>
        )}
        {frame.background.kind === 'image' && (
          <div className="frame-image-controls">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploading}
              onChange={(event) => void handleBackgroundFile(event)}
            />
            {uploading && (
              <p className="status-message">Uploading background…</p>
            )}
          </div>
        )}
      </div>

      <div className="form-field">
        <span>Padding</span>
        <div className="video-panel-slider">
          <input
            type="range"
            min={0}
            max={0.3}
            step={0.01}
            value={frame.paddingPct}
            aria-label="Padding"
            onChange={(event) =>
              transient({ paddingPct: Number(event.target.value) })
            }
            {...sliderCommit}
          />
          <span className="video-panel-value">
            {Math.round(frame.paddingPct * 100)}%
          </span>
        </div>
      </div>

      <div className="form-field">
        <span>Corners</span>
        <div className="video-panel-slider">
          <input
            type="range"
            min={0}
            max={48}
            step={1}
            value={frame.cornerRadiusPx}
            aria-label="Corner radius"
            onChange={(event) =>
              transient({ cornerRadiusPx: Number(event.target.value) })
            }
            {...sliderCommit}
          />
          <span className="video-panel-value">{frame.cornerRadiusPx}px</span>
        </div>
      </div>

      <div className="form-field">
        <span>Shadow</span>
        <div className="video-panel-slider">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={frame.shadow}
            aria-label="Shadow"
            onChange={(event) =>
              transient({ shadow: Number(event.target.value) })
            }
            {...sliderCommit}
          />
          <span className="video-panel-value">
            {Math.round(frame.shadow * 100)}%
          </span>
        </div>
      </div>

      <div className="form-field">
        <span>Aspect</span>
        <select
          value={frame.aspect}
          onChange={(event) =>
            patchFrame({ aspect: event.target.value as FrameAspect })
          }
        >
          {ASPECTS.map((aspect) => (
            <option key={aspect.value} value={aspect.value}>
              {aspect.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <span>Crop</span>
        {(
          [
            ['x', 'Left', 0, 1 - MIN_CROP],
            ['y', 'Top', 0, 1 - MIN_CROP],
            ['width', 'Width', MIN_CROP, 1],
            ['height', 'Height', MIN_CROP, 1],
          ] as const
        ).map(([key, label, min, max]) => (
          <div className="video-panel-slider" key={key}>
            <input
              type="range"
              min={min}
              max={max}
              step={0.01}
              value={frame.crop[key]}
              aria-label={`Crop ${label.toLowerCase()}`}
              onChange={(event) =>
                transientCrop({ [key]: Number(event.target.value) })
              }
              {...sliderCommit}
            />
            <span className="video-panel-value">
              {Math.round(frame.crop[key] * 100)}%
            </span>
          </div>
        ))}
      </div>

      <label className="video-panel-check">
        <input
          type="checkbox"
          checked={state.cursor.visible}
          onChange={(event) =>
            editor.setEditState({
              ...state,
              cursor: { ...state.cursor, visible: event.target.checked },
            })
          }
        />
        Show cursor
      </label>

      {error && <ErrorAlert>{error}</ErrorAlert>}
    </div>
  );
}
