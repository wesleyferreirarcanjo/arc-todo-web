import { useEffect, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  recordingSession,
  setRecordingSessionNavigate,
} from '../../lib/videos/recordingSession';

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function RecordingIndicator() {
  const navigate = useNavigate();
  const state = useSyncExternalStore(
    recordingSession.subscribe,
    recordingSession.getState,
  );
  const [nowMs, setNowMs] = useState(() => Date.now());

  // The session store lives outside React; register navigate from inside the
  // Router so post-upload redirects work.
  useEffect(() => {
    setRecordingSessionNavigate(navigate);
  }, [navigate]);

  useEffect(() => {
    if (state.status !== 'recording') return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.status]);

  if (state.status === 'idle') return null;

  return (
    <div className="recording-indicator" role="status">
      {state.status === 'recording' && (
        <>
          <span className="recording-indicator-dot" aria-hidden="true" />
          <span className="recording-indicator-time">
            {formatElapsed(nowMs - (state.startedAt ?? nowMs))}
          </span>
        </>
      )}
      {state.status === 'uploading' && (
        <span className="recording-indicator-message">
          Uploading recording…
        </span>
      )}
      {state.message && (
        <span className="recording-indicator-message">{state.message}</span>
      )}
      {state.status === 'recording' && (
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => void recordingSession.stop()}
        >
          Stop
        </button>
      )}
      {state.status === 'error' && (
        <>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => recordingSession.downloadFailedRecording()}
          >
            Download recording
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => recordingSession.dismiss()}
          >
            Dismiss
          </button>
        </>
      )}
    </div>
  );
}
