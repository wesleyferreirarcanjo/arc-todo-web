import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { fetchOrganizationActivity } from '../lib/api/activity';
import { OrganizationsIcon } from '../components/icons';
import { PageFiltersToolbar } from '../components/PageFiltersToolbar';
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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

  const activeFilterCount = filterUserId ? 1 : 0;
  const emptyCatalog = !filterUserId && activity.length === 0;
  const filterMiss = Boolean(filterUserId) && activity.length === 0;

  const filterControls = (
    <label className="board-filter-field">
      Filter by user
      <Select
        value={filterUserId}
        onChange={setFilterUserId}
        options={memberOptions}
      />
    </label>
  );

  return (
    <div className="page-shell" style={entityAccentStyle(color)}>
      <header className={`page-header${color ? ' has-accent' : ''}`}>
        <h2>{currentOrganization?.name ?? 'Organization'} activity</h2>
        <div className="page-links">
          <Link to={`/organizations/${orgId}`} className="text-link">
            Back to projects
          </Link>
        </div>
      </header>

      <PageFiltersToolbar
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        activeFilterCount={activeFilterCount}
        panel={filterControls}
        mobileOverlayOpen={mobileFiltersOpen}
        onMobileOverlayOpenChange={setMobileFiltersOpen}
        showToggleOnMobile
      />

      {loading && (
        <p className="status-message" role="status">
          Loading activity...
        </p>
      )}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {!loading && !error && emptyCatalog && (
        <div className="diagrams-empty">
          <span className="hub-empty-glyph" aria-hidden="true">
            <OrganizationsIcon className="arc-icon-empty" />
          </span>
          <p className="status-message">No activity recorded yet.</p>
        </div>
      )}

      {!loading && !error && filterMiss && (
        <div className="diagrams-empty">
          <p className="status-message" role="status">
            No activity matches these filters. {activity.length} matching.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setFilterUserId('')}
          >
            Clear filters
          </button>
        </div>
      )}

      {!loading && !error && activity.length > 0 && (
        <ul className="task-history-list">
          {activity.map((entry) => (
            <li key={entry.id} className="task-history-item">
              <div className="task-history-item-header">
                <strong>{entry.actorUsername}</strong>
                <time dateTime={entry.createdAt}>
                  {formatTimestamp(entry.createdAt)}
                </time>
              </div>
              <p>{entry.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
