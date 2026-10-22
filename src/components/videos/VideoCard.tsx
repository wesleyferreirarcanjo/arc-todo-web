import type { CSSProperties, MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { VideosIcon } from '../icons';
import type { ProjectVideoSummary } from '../../types/video';

export function formatVideoDuration(durationMs: number | null): string {
  if (durationMs == null) return 'No recording yet';
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatUpdatedAt(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatBadgeLabel(label: string): string {
  return label.length > 18 ? `${label.slice(0, 18)}...` : label;
}

interface VideoCardProps {
  video: ProjectVideoSummary;
  editorPath: string;
  orgName?: string;
  projectName?: string;
  accentColor?: string;
  downloadingExport?: boolean;
  onRename: () => void;
  onDelete: () => void;
  onDownloadExport?: () => void;
}

export function VideoCard({
  video,
  editorPath,
  orgName,
  projectName,
  accentColor,
  downloadingExport = false,
  onRename,
  onDelete,
  onDownloadExport,
}: VideoCardProps) {
  const navigate = useNavigate();

  function handleCardClick(event: MouseEvent<HTMLLIElement>) {
    if ((event.target as HTMLElement).closest('a, button')) return;
    navigate(editorPath);
  }

  return (
    <li
      className={`diagram-card diagram-card--video entity-card${accentColor ? ' has-accent' : ''}`}
      style={
        accentColor
          ? ({ '--entity-accent': accentColor } as CSSProperties)
          : undefined
      }
      onClick={handleCardClick}
    >
      <Link
        to={editorPath}
        className="diagram-card-preview-link video-card-preview"
        aria-label={`Open ${video.title}`}
      >
        <span className="video-card-preview-icon" aria-hidden="true">
          <VideosIcon className="arc-icon-empty" />
        </span>
        <span className="video-card-duration">
          {formatVideoDuration(video.durationMs)}
        </span>
      </Link>
      <div className="diagram-card-body">
        {(orgName || projectName) && (
          <div className="diagram-card-badges">
            {orgName && (
              <span className="task-badge task-badge-org" title={orgName}>
                {formatBadgeLabel(orgName)}
              </span>
            )}
            {projectName && (
              <span
                className="task-badge task-badge-project"
                title={projectName}
                style={
                  accentColor
                    ? ({ '--entity-accent': accentColor } as CSSProperties)
                    : undefined
                }
              >
                {formatBadgeLabel(projectName)}
              </span>
            )}
          </div>
        )}
        <h3 className="diagram-card-title">
          <Link to={editorPath}>{video.title}</Link>
        </h3>
        <p className="diagram-card-meta">
          Updated {formatUpdatedAt(video.updatedAt)}
          {video.hasExport && (
            <>
              {' '}
              <span className="task-badge video-badge-exported">Exported</span>
            </>
          )}
        </p>
        <div className="diagram-card-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRename}
          >
            Rename
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={onDelete}
          >
            Delete
          </button>
          {video.hasExport && onDownloadExport && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={downloadingExport}
              onClick={onDownloadExport}
            >
              {downloadingExport ? 'Downloading...' : 'Download export'}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
