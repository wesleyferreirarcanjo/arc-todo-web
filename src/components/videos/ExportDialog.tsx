import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../Modal';
import { ChoiceGroup } from '../ChoiceGroup';
import { ErrorAlert } from '../ErrorAlert';
import { ApiError, triggerBrowserDownload } from '../../lib/api/client';
import { uploadProjectVideoFile } from '../../lib/api/videos';
import { userMessage, WEB_ERROR } from '../../lib/errors/messages';
import { exportVideo, pickExportMimeTypes } from '../../lib/videos/exporter';
import type {
  CursorTrack,
  ProjectVideo,
  VideoEditState,
} from '../../types/video';

type ExportPhase = 'choose' | 'exporting' | 'done';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  state: VideoEditState;
  recordingUrl: string;
  sourceW: number;
  sourceH: number;
  cursor: CursorTrack | null;
  background: CanvasImageSource | null;
  title: string;
  orgId: string;
  projectId: string;
  videoId: string;
  onSaved?: (video: ProjectVideo) => void;
}

export function ExportDialog({
  open,
  onClose,
  state,
  recordingUrl,
  sourceW,
  sourceH,
  cursor,
  background,
  title,
  orgId,
  projectId,
  videoId,
  onSaved,
}: ExportDialogProps) {
  const formats = useMemo(
    () => pickExportMimeTypes((mimeType) => MediaRecorder.isTypeSupported(mimeType)),
    [],
  );
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [phase, setPhase] = useState<ExportPhase>('choose');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const selected =
    formats.find((format) => format.mimeType === mimeType) ??
    formats[0] ??
    null;

  useEffect(() => {
    if (!open) return;
    setMimeType(null);
    setPhase('choose');
    setProgress(0);
    setResult(null);
    setError(null);
    setSaveError(null);
    setSaved(false);
  }, [open]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  async function handleExport() {
    if (!selected) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('exporting');
    setProgress(0);
    setError(null);
    setResult(null);
    try {
      const blob = await exportVideo({
        state,
        recordingUrl,
        sourceW,
        sourceH,
        cursor,
        background,
        mimeType: selected.mimeType,
        signal: controller.signal,
        onProgress: setProgress,
      });
      setResult(blob);
      setPhase('done');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setPhase('choose');
      } else {
        setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'the export' }));
        setPhase('choose');
      }
    } finally {
      abortRef.current = null;
    }
  }

  async function handleSave() {
    if (!result || !selected || saved) return;
    setSaving(true);
    setSaveError(null);
    try {
      const video = await uploadProjectVideoFile(
        orgId,
        projectId,
        videoId,
        'export',
        result,
        `export.${selected.ext}`,
      );
      setSaved(true);
      onSaved?.(video);
    } catch (err) {
      setSaveError(
        err instanceof ApiError && err.code
          ? err.code
          : userMessage(err, WEB_ERROR.SAVE, { thing: 'the export' }),
      );
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (phase === 'exporting') {
      abortRef.current?.abort();
      return;
    }
    onClose();
  }

  const progressPct = Math.round(progress * 100);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Export video"
      titleId="export-video-title"
    >
      {phase === 'choose' && (
        <>
          {formats.length === 0 ? (
            <p className="status-message">
              This browser cannot record video, so export is unavailable.
            </p>
          ) : (
            <div className="form-field">
              <span>Format</span>
              <ChoiceGroup
                name="export-format"
                label="Format"
                value={selected?.mimeType ?? ''}
                options={formats.map((format) => ({
                  value: format.mimeType,
                  label: format.label,
                }))}
                onChange={setMimeType}
              />
            </div>
          )}
          {error && <ErrorAlert>{error}</ErrorAlert>}
          <div className="hub-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!selected}
              onClick={() => void handleExport()}
            >
              Export
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {phase === 'exporting' && (
        <>
          <div
            className="names-batch-progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
          >
            <span style={{ width: `${progressPct}%` }} />
          </div>
          <p className="status-message">
            Exporting... {progressPct}% — keep this tab open while exporting.
          </p>
          <div className="hub-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => abortRef.current?.abort()}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {phase === 'done' && result && selected && (
        <>
          <p className="status-message">
            {saved ? 'Saved to this project.' : 'Export ready.'}
          </p>
          {saveError && <ErrorAlert>{saveError}</ErrorAlert>}
          <div className="hub-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                triggerBrowserDownload(result, `${title}.${selected.ext}`)
              }
            >
              Download
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving || saved}
              aria-busy={saving}
              onClick={() => void handleSave()}
            >
              {saving ? 'Saving...' : saved ? 'Saved' : 'Save to project'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
