import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { fetchOrganizationActivity } from '../lib/api/activity';
import { fetchOrganizationMembers } from '../lib/api/organizations';
import { Select } from '../components/Select';
import { useWorkspace } from '../context/WorkspaceContext';
import type { UserActivityEntry } from '../types/activity';
import type { OrganizationMember } from '../types/organization';

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

export function OrganizationActivityPage() {
  const { orgId } = useParams();
  const { currentOrganization } = useWorkspace();
  const [activity, setActivity] = useState<UserActivityEntry[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [filterUserId, setFilterUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const memberOptions = useMemo(
    () => [
      { value: '', label: 'All members' },
      ...members.map((member) => ({
        value: member.userId,
        label: member.user?.username ?? member.userId,
      })),
    ],
    [members],
  );

  const loadActivity = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    setError(null);
    try {
      const [entries, memberList] = await Promise.all([
        fetchOrganizationActivity(orgId, {
          userId: filterUserId || undefined,
          limit: 100,
        }),
        fetchOrganizationMembers(orgId),
      ]);
      setActivity(entries);
      setMembers(memberList);
    } catch {
      setError('Failed to load activity or access denied.');
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
    <div className="page-shell">
      <header className="page-header">
        <h2>{currentOrganization?.name ?? 'Organization'} activity</h2>
        <p className="page-subtitle">
          Recent actions by members across tasks, users, and knowledge.
        </p>
        <div className="page-links">
          <Link to={`/organizations/${orgId}`} className="text-link">
            Back to projects
          </Link>
          <Link to={`/organizations/${orgId}/members`} className="text-link">
            Members
          </Link>
        </div>
      </header>

      <label className="board-filter-field">
        Filter by member
        <Select
          value={filterUserId}
          onChange={setFilterUserId}
          options={memberOptions}
        />
      </label>

      {loading && <p className="status-message">Loading activity...</p>}
      {error && <div className="alert alert-error">{error}</div>}

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
