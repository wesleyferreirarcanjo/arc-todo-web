import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { fetchOrganizationActivity } from '../lib/api/activity';
import { Select } from '../components/Select';
import {
  entityAccentStyle,
  useWorkspaceAccent,
} from '../components/WorkspaceChrome';
import { useWorkspace } from '../context/WorkspaceContext';
import type { UserActivityEntry } from '../types/activity';

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

export function OrganizationActivityPage() {
  const { orgId } = useParams();
  const { currentOrganization } = useWorkspace();
  const { color } = useWorkspaceAccent();
  const [activity, setActivity] = useState<UserActivityEntry[]>([]);
  const [filterUserId, setFilterUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const memberOptions = useMemo(() => {
    const actors = new Map<string, string>();
    for (const entry of activity) {
      actors.set(entry.actorUserId, entry.actorUsername);
    }
    return [
      { value: '', label: 'All users' },
      ...[...actors.entries()].map(([userId, username]) => ({
        value: userId,
        label: username,
      })),
    ];
  }, [activity]);

  const loadActivity = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    setError(null);
    try {
      const entries = await fetchOrganizationActivity(orgId, {
        userId: filterUserId || undefined,
        limit: 100,
      });
      setActivity(entries);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'activity' }));
    } finally {
      setLoading(false);
    }
  }, [orgId, filterUserId]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  if (!orgId) {
    return <Navigate to="/organizations" replace />;
  }

  return (
    <div className="page-shell" style={entityAccentStyle(color)}>
      <header className={`page-header${color ? ' has-accent' : ''}`}>
        <h2>{currentOrganization?.name ?? 'Organization'} activity</h2>
        <p className="page-subtitle">
          Recent actions by users across tasks, knowledge, and project work.
        </p>
        <div className="page-links">
          <Link to={`/organizations/${orgId}`} className="text-link">
            Back to projects
          </Link>
        </div>
      </header>

      <label className="board-filter-field">
        Filter by user
        <Select
          value={filterUserId}
          onChange={setFilterUserId}
          options={memberOptions}
        />
      </label>

      {loading && <p className="status-message">Loading activity...</p>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {!loading && !error && activity.length === 0 && (
        <p className="status-message">No activity recorded yet.</p>
      )}

      {!loading && !error && activity.length > 0 && (
        <ul className="task-history-list">
          {activity.map((entry) => (
            <li key={entry.id} className="task-history-item">
              <div className="task-history-meta">
                <strong>{entry.actorUsername}</strong>
                <span>{formatTimestamp(entry.createdAt)}</span>
              </div>
              <p>{entry.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
