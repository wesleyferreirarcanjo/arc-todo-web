const MASK = '••••••••';

interface Props {
  env: Record<string, string> | null;
  revealed: boolean;
  envEditing: boolean;
  envText: string;
  busy: string | null;
  onReveal: () => void;
  onStartEdit: () => void;
  onEnvTextChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function AppDetailEnvironment({
  env,
  revealed,
  envEditing,
  envText,
  busy,
  onReveal,
  onStartEdit,
  onEnvTextChange,
  onSave,
  onCancel,
}: Props) {
  return (
    <div>
      {!envEditing ? (
        <>
          {env === null ? (
            <p className="status-message">Loading environment...</p>
          ) : Object.keys(env).length === 0 ? (
            <p className="status-message">No environment variables.</p>
          ) : (
            <div className="analytics-table-wrap">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th scope="col">Key</th>
                    <th scope="col">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(env).map(([key, value]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{revealed ? value : MASK}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="hub-actions cloud-app-actions">
            {!revealed && env !== null && Object.keys(env).length > 0 ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy !== null}
                onClick={onReveal}
              >
                Reveal values
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy !== null}
              onClick={onStartEdit}
            >
              Edit
            </button>
          </div>
          {revealed ? (
            <p className="status-message">
              Values are visible — this view was audited.
            </p>
          ) : null}
        </>
      ) : (
        <>
          <label className="board-filter-field">
            KEY=value lines — replaces the whole environment
            <textarea
              value={envText}
              onChange={(event) => onEnvTextChange(event.target.value)}
              rows={8}
              autoComplete="off"
              spellCheck={false}
              placeholder={'DATABASE_URL=postgres://…\nSECRET=…'}
            />
          </label>
          <div className="hub-actions cloud-app-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy !== null}
              onClick={onSave}
            >
              Save environment
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
