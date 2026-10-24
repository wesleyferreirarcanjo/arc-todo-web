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
          <select
            value={tail}
            onChange={(event) => onTailChange(Number(event.target.value))}
          >
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>
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
