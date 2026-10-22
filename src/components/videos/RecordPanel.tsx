import { useState, useSyncExternalStore } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ErrorAlert } from '../ErrorAlert';
import { VideosIcon } from '../icons';
import { userMessage, WEB_ERROR } from '../../lib/errors/messages';
import { recordingSession } from '../../lib/videos/recordingSession';
import type { RecordingSource } from '../../lib/videos/recorder';
import type { FrameStyle } from '../../types/video';

interface RecordPanelProps {
  previousFrame?: FrameStyle;
  onCancel?: () => void;
}

const supportsDisplayCapture = Boolean(
  navigator.mediaDevices?.getDisplayMedia,
);
// ponytail: preferCurrentTab is Chromium-only and cannot be feature-detected —
// unsupported constraints are silently ignored. Upgrade = a real capability
// check if browsers ever expose one.
const supportsThisTab =
  supportsDisplayCapture && !/firefox/i.test(navigator.userAgent);

export function RecordPanel({ previousFrame, onCancel }: RecordPanelProps) {
  const { orgId, projectId, videoId } = useParams();
  const location = useLocation();
  const sessionState = useSyncExternalStore(
    recordingSession.subscribe,
    recordingSession.getState,
  );
  const [source, setSource] = useState<RecordingSource>(
    supportsThisTab ? 'this-tab' : 'other',
  );
  const [microphone, setMicrophone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy =
    sessionState.status === 'recording' || sessionState.status === 'uploading';

  async function handleRecord() {
    if (!orgId || !projectId || !videoId) return;
    setPending(true);
    setError(null);
    try {
      await recordingSession.start(
        {
          orgId,
          projectId,
          videoId,
          editorPath: location.pathname,
          frame: previousFrame,
        },
        { source, microphone },
      );
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.CREATE, { thing: 'the recording' }));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="video-record-empty record-panel">
      <span className="hub-empty-glyph" aria-hidden="true">
        <VideosIcon className="arc-icon-empty" />
      </span>
      <p className="status-message">
        Record your screen, then trim, zoom, and export the result.
      </p>
      <div className="record-panel-options">
        {supportsThisTab && (
          <label className="record-panel-option">
            <input
              type="radio"
              name="record-source"
              checked={source === 'this-tab'}
              onChange={() => setSource('this-tab')}
            />
            This tab
          </label>
        )}
        <label className="record-panel-option">
          <input
            type="radio"
            name="record-source"
            checked={source === 'other'}
            onChange={() => setSource('other')}
          />
          Screen or window
        </label>
        <label className="record-panel-option">
          <input
            type="checkbox"
            checked={microphone}
            onChange={(event) => setMicrophone(event.target.checked)}
          />
          Microphone
        </label>
      </div>
      {error && <ErrorAlert>{error}</ErrorAlert>}
      <div className="record-panel-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!supportsDisplayCapture || pending || busy}
          onClick={() => void handleRecord()}
        >
          {pending ? 'Starting…' : busy ? 'Recording…' : 'Record'}
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
      {!supportsDisplayCapture && (
        <p className="status-message">Recording needs a desktop browser.</p>
      )}
    </div>
  );
}
