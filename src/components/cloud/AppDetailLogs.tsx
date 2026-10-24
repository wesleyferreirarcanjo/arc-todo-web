import { Select } from '../Select';

interface Props {
  tail: number;
  appLogLines: string[] | null;
  onTailChange: (value: number) => void;
  onRefresh: () => void;
}

export function AppDetailLogs({
  tail,
  appLogLines,
  onTailChange,
  onRefresh,
}: Props) {
  return (
    <div>
      <div className="hub-actions cloud-app-actions">
        <label className="board-filter-field">
          Tail
          <Select
            value={String(tail)}
            onChange={(value) => onTailChange(Number(value))}
            options={[
              { value: '100', label: '100' },
              { value: '200', label: '200' },
              { value: '500', label: '500' },
            ]}
          />
        </label>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onRefresh}
        >
          Refresh
        </button>
      </div>
      {appLogLines === null ? (
        <p className="status-message">Loading container logs...</p>
      ) : appLogLines.length === 0 ? (
        <p className="status-message">No log output.</p>
      ) : (
        <pre className="cloud-log-view" aria-label="Container logs">
          {appLogLines.join('\n')}
        </pre>
      )}
    </div>
  );
}
