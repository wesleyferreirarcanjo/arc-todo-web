import type { CloudDeployment } from '../../types/cloud';

function fmt(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
}

interface Props {
  deployments: CloudDeployment[];
  openLog: string | null;
  liveDeploymentId: string | null;
  liveLines: string[];
  liveStatus: string | null;
  logText: string;
  onToggleLog: (dep: CloudDeployment) => void;
}

export function AppDetailDeployments({
  deployments,
  openLog,
  liveDeploymentId,
  liveLines,
  liveStatus,
  logText,
  onToggleLog,
}: Props) {
  return (
    <div>
      {deployments.length === 0 ? (
        <p className="status-message">No deployments yet.</p>
      ) : (
        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                <th scope="col">Status</th>
                <th scope="col">Image ref</th>
                <th scope="col">Commit</th>
                <th scope="col">Built on</th>
                <th scope="col">Build</th>
                <th scope="col">Trigger</th>
                <th scope="col">Started</th>
                <th scope="col">Finished</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((dep) => (
                <tr key={dep.id}>
                  <th scope="row">
                    <button
                      type="button"
                      className="analytics-row-name"
                      aria-expanded={openLog === dep.id}
                      onClick={() => void onToggleLog(dep)}
                    >
                      {dep.status}
                    </button>
                  </th>
                  <td data-label="Image ref">{dep.imageRef ?? 'compose'}</td>
                  <td data-label="Commit">{dep.commitSha ? dep.commitSha.slice(0, 8) : '—'}</td>
                  <td data-label="Built on">{dep.builtOnName ?? '—'}</td>
                  <td data-label="Build">
                    {dep.buildSeconds === null
                      ? '—'
                      : dep.pushSeconds !== null
                        ? `${dep.buildSeconds}s +${dep.pushSeconds}s`
                        : `${dep.buildSeconds}s`}
                  </td>
                  <td data-label="Trigger">{dep.trigger}</td>
                  <td data-label="Started">{fmt(dep.startedAt)}</td>
                  <td data-label="Finished">{fmt(dep.finishedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {openLog ? (
        <pre className="cloud-log-view" aria-label="Deployment log">
          {openLog === liveDeploymentId && liveLines.length > 0
            ? liveLines.join('\n')
            : logText || 'No log output.'}
          {openLog === liveDeploymentId && !liveStatus ? '\n…live' : ''}
          {openLog === liveDeploymentId && liveStatus
            ? `\nstatus: ${liveStatus}`
            : ''}
        </pre>
      ) : null}
    </div>
  );
}
