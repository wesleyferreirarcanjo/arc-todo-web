import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ErrorAlert } from '../components/ErrorAlert';
import { Select } from '../components/Select';
import { AnalyticsIcon } from '../components/icons';
import {
  ANALYTICS_PERIOD_OPTIONS,
  fetchAnalyticsSummary,
} from '../lib/api/analytics';
import { fetchOrganizations } from '../lib/api/organizations';
import { fetchProjects } from '../lib/api/projects';
import {
  checklistChartRows,
  dwellChartRows,
  personChartRows,
  statusChartRows,
} from '../lib/analytics/chartData';
import { formatAnalyticsDuration } from '../lib/analytics/formatDuration';
import { formatGrowthCopy } from '../lib/analytics/growthCopy';
import {
  analyticsQueryFromFilters,
  readAnalyticsFilters,
  writeAnalyticsFilters,
  type AnalyticsPageFilters,
} from '../lib/analytics/period';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import type { AnalyticsGrowthMetric, AnalyticsSummary } from '../types/analytics';
import type { Organization } from '../types/organization';
import type { Project } from '../types/project';

const CHART_HEIGHT = 220;

function readToken(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function useChartColors() {
  const [colors, setColors] = useState({
    accent: '#4862ce',
    secondary: '#6846b8',
    text: '#e8ecf4',
    muted: '#9aa6bc',
    grid: 'rgba(142, 160, 188, 0.18)',
  });

  useEffect(() => {
    setColors({
      accent: readToken('--accent', '#4862ce'),
      secondary: readToken('--accent-secondary', '#6846b8'),
      text: readToken('--text-primary', '#e8ecf4'),
      muted: readToken('--text-muted', '#9aa6bc'),
      grid: readToken('--border', 'rgba(142, 160, 188, 0.18)'),
    });
  }, []);

  return colors;
}

function durationOrEmpty(ms: number | null, empty: string): string {
  return formatAnalyticsDuration(ms) || empty;
}

function GrowthCard({
  title,
  metric,
  previousLabel,
}: {
  title: string;
  metric: AnalyticsGrowthMetric;
  previousLabel: string | null;
}) {
  const copy = formatGrowthCopy(metric, previousLabel);
  const direction =
    metric.delta === null ? '' : metric.delta > 0 ? 'up' : metric.delta < 0 ? 'down' : 'flat';
  return (
    <article className={`analytics-kpi analytics-growth-card is-${direction || 'none'}`}>
      <h3>{title}</h3>
      <p className="analytics-kpi-value">{metric.current}</p>
      <p className="analytics-kpi-meta">{copy}</p>
    </article>
  );
}

export function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readAnalyticsFilters(searchParams), [searchParams]);
  const colors = useChartColors();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectOptions = useMemo(
    () =>
      filters.organizationId
        ? projects.filter((project) => project.organizationId === filters.organizationId)
        : projects,
    [projects, filters.organizationId],
  );

  const setFilters = useCallback(
    (next: AnalyticsPageFilters) => {
      setSearchParams(writeAnalyticsFilters(next), { replace: true });
    },
    [setSearchParams],
  );

  const queryState = analyticsQueryFromFilters(filters);

  useEffect(() => {
    let cancelled = false;
    async function loadFilters() {
      try {
        const orgs = await fetchOrganizations();
        const projectGroups = await Promise.all(
          orgs.map((organization) => fetchProjects(organization.id)),
        );
        if (!cancelled) {
          setOrganizations(orgs);
          setProjects(projectGroups.flat());
        }
      } catch (err) {
        if (!cancelled) {
          setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'organizations and projects' }));
        }
      }
    }
    void loadFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!filters.projectId) {
      return;
    }
    const project = projects.find((entry) => entry.id === filters.projectId);
    if (project && filters.organizationId && project.organizationId !== filters.organizationId) {
      setFilters({ ...filters, projectId: '' });
    }
  }, [filters, projects, setFilters]);

  useEffect(() => {
    if ('pending' in queryState) {
      setLoading(false);
      setSummary(null);
      setError(null);
      return;
    }
    if ('error' in queryState) {
      setLoading(false);
      setSummary(null);
      setError(queryState.error);
      return;
    }

    const request = queryState;
    let cancelled = false;
    async function loadSummary() {
      setLoading(true);
      setError(null);
      try {
        const next = await fetchAnalyticsSummary(request);
        if (!cancelled) {
          setSummary(next);
        }
      } catch (err) {
        if (!cancelled) {
          setSummary(null);
          setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'analytics' }));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const statusRows = summary ? statusChartRows(summary.byStatus) : [];
  const checklistRows = summary ? checklistChartRows(summary) : [];
  const personRows = summary ? personChartRows(summary.byPerson) : [];
  const dwellRows = summary ? dwellChartRows(summary.dwellByStatus) : [];
  const pendingDates = 'pending' in queryState;
  const periodLabel = summary?.period.label ?? ANALYTICS_PERIOD_OPTIONS.find((option) => option.value === filters.period)?.label;
  const compareCaption =
    summary?.period.previousLabel ??
    (filters.period === 'all' ? null : 'the previous period');

  return (
    <div className="page-shell analytics-page">
      <header className="page-header">
        <h2>Analytics</h2>
        <p className="page-subtitle">
          Growth, board timing, and checklist coverage for administrators.
        </p>
      </header>

      <div className="board-filters diagrams-hub-filters analytics-filters">
        <label className="board-filter-field">
          Organization
          <Select
            value={filters.organizationId}
            onChange={(value) => setFilters({ ...filters, organizationId: value, projectId: '' })}
            options={[
              { value: '', label: 'All organizations' },
              ...organizations.map((organization) => ({
                value: organization.id,
                label: organization.name,
              })),
            ]}
          />
        </label>
        <label className="board-filter-field">
          Project
          <Select
            value={filters.projectId}
            onChange={(value) => setFilters({ ...filters, projectId: value })}
            options={[
              { value: '', label: 'All projects' },
              ...projectOptions.map((project) => ({
                value: project.id,
                label: project.name,
              })),
            ]}
          />
        </label>
      </div>

      <div
        className="board-view-toggle analytics-period-toggle"
        role="group"
        aria-label="Date range"
      >
        {ANALYTICS_PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`board-view-toggle-btn${filters.period === option.value ? ' is-active' : ''}`}
            aria-pressed={filters.period === option.value}
            onClick={() =>
              setFilters({
                ...filters,
                period: option.value,
                compareMode: option.value === 'all' ? 'previous' : filters.compareMode,
              })
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      {filters.period === 'custom' && (
        <div className="analytics-date-row">
          <label className="board-filter-field">
            From
            <input
              type="date"
              value={filters.from}
              onChange={(event) => setFilters({ ...filters, from: event.target.value })}
            />
          </label>
          <label className="board-filter-field">
            To
            <input
              type="date"
              value={filters.to}
              onChange={(event) => setFilters({ ...filters, to: event.target.value })}
            />
          </label>
        </div>
      )}

      {filters.period !== 'all' && (
        <div className="analytics-date-row">
          <label className="board-filter-field">
            Compared with
            <Select
              value={filters.compareMode}
              onChange={(value) =>
                setFilters({
                  ...filters,
                  compareMode: value === 'custom' ? 'custom' : 'previous',
                })
              }
              options={[
                { value: 'previous', label: 'Previous period' },
                { value: 'custom', label: 'Another range' },
              ]}
            />
          </label>
          {filters.compareMode === 'custom' && (
            <>
              <label className="board-filter-field">
                Compare from
                <input
                  type="date"
                  value={filters.compareFrom}
                  onChange={(event) =>
                    setFilters({ ...filters, compareFrom: event.target.value })
                  }
                />
              </label>
              <label className="board-filter-field">
                Compare to
                <input
                  type="date"
                  value={filters.compareTo}
                  onChange={(event) => setFilters({ ...filters, compareTo: event.target.value })}
                />
              </label>
            </>
          )}
        </div>
      )}

      <p className="analytics-period-caption">
        {pendingDates
          ? 'Pick a From date and a To date.'
          : `Showing ${periodLabel}${compareCaption ? ` · compared with ${compareCaption}` : ''}.`}
      </p>

      {error && <ErrorAlert>{error}</ErrorAlert>}
      {loading && <p className="status-message">Loading analytics...</p>}

      {!loading && summary && (
        <>
          <section className="analytics-kpis analytics-growth" aria-label="Growth">
            <header className="analytics-section-head">
              <h3>Growth</h3>
              <p>How production, moves, and bug reports changed versus the comparison window.</p>
            </header>
            <GrowthCard
              title="Tasks created"
              metric={summary.growth.tasksCreated}
              previousLabel={summary.period.previousLabel}
            />
            <GrowthCard
              title="Moves"
              metric={summary.growth.moves}
              previousLabel={summary.period.previousLabel}
            />
            <GrowthCard
              title="Bug reports"
              metric={summary.growth.bugReports}
              previousLabel={summary.period.previousLabel}
            />
          </section>

          <section className="analytics-kpis" aria-label="This period">
            <header className="analytics-section-head">
              <h3>This period</h3>
              <p>Times and averages inside {summary.period.label}.</p>
            </header>
            <article className="analytics-kpi">
              <h3>Average time to Done</h3>
              <p className="analytics-kpi-value">
                {durationOrEmpty(summary.averageMsToDone, 'No completed tasks yet.')}
              </p>
              <p className="analytics-footnote">
                Uses the same completion time as Weekly cycle.
              </p>
            </article>
            <article className="analytics-kpi">
              <h3>Average time to solve a bug</h3>
              <p className="analytics-kpi-value">
                {durationOrEmpty(summary.averageMsToSolveBug, 'No solved bugs yet.')}
              </p>
            </article>
            <article className="analytics-kpi">
              <h3>Average time in test</h3>
              <p className="analytics-kpi-value">
                Dev Test{' '}
                {durationOrEmpty(summary.averageMsInDevTest, 'No finished test times yet.')}
              </p>
              <p className="analytics-kpi-meta">
                QA Test{' '}
                {durationOrEmpty(summary.averageMsInQaTest, 'No finished test times yet.')}
              </p>
            </article>
          </section>

          <section className="analytics-panels">
            <article className="analytics-panel analytics-panel-wide">
              <h3>Where work stayed longest</h3>
              {summary.longestStay ? (
                <p className="analytics-kpi-meta">
                  {summary.longestStay.label} held work the longest —{' '}
                  {formatAnalyticsDuration(summary.longestStay.averageMs)} on average before it
                  moved on.
                </p>
              ) : (
                <p className="analytics-kpi-meta">No finished stays in this period yet.</p>
              )}
              <div className="analytics-chart">
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <BarChart data={dwellRows} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid stroke={colors.grid} horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={104}
                      stroke={colors.muted}
                      tick={{ fill: colors.muted, fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value) => formatAnalyticsDuration(Number(value)) || 'No finished stays yet.'}
                    />
                    <Bar dataKey="ms" name="Average stay" fill={colors.secondary} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <section className="analytics-panels" aria-label="On the board now">
            <header className="analytics-section-head analytics-section-head-wide">
              <h3>On the board now</h3>
              <p>
                Current columns, open bugs, and checklist — not limited to {summary.period.label}.
              </p>
            </header>
            <article className="analytics-panel">
              <h3>By status</h3>
              <p className="analytics-kpi-meta">
                {summary.activeCount} active · {summary.archivedCount} archived · {summary.openBugs}{' '}
                open bugs
              </p>
              <div className="analytics-chart">
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <BarChart data={statusRows} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid stroke={colors.grid} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} stroke={colors.muted} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={104}
                      stroke={colors.muted}
                      tick={{ fill: colors.muted, fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" name="Tasks" fill={colors.accent} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="analytics-panel">
              <h3>Checklist</h3>
              <p className="analytics-kpi-meta">
                {summary.checklistItemsChecked} of {summary.checklistItemsTotal} checked ·{' '}
                {summary.checklistCompleteTasks} complete · {summary.checklistOpenBugs} open bugs
              </p>
              <div className="analytics-chart">
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <BarChart data={checklistRows} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="name" stroke={colors.muted} tick={{ fill: colors.muted }} />
                    <YAxis allowDecimals={false} stroke={colors.muted} />
                    <Tooltip />
                    <Bar dataKey="count" name="Items" fill={colors.secondary} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="analytics-panel analytics-panel-wide">
              <h3>By person</h3>
              <p className="analytics-kpi-meta">
                Tasks created and Moves are for {summary.period.label}. Open bugs are on the board
                now.
              </p>
              {personRows.length === 0 ? (
                <p className="status-message">No person activity in this view yet.</p>
              ) : (
                <>
                  <div className="analytics-chart">
                    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                      <BarChart data={personRows} margin={{ left: 8, right: 8 }}>
                        <CartesianGrid stroke={colors.grid} vertical={false} />
                        <XAxis dataKey="name" stroke={colors.muted} tick={{ fill: colors.muted }} />
                        <YAxis allowDecimals={false} stroke={colors.muted} />
                        <Tooltip />
                        <Bar dataKey="created" name="Tasks created" fill={colors.accent} />
                        <Bar dataKey="moves" name="Moves" fill={colors.secondary} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="analytics-table-wrap">
                    <table className="analytics-table">
                      <caption className="sr-only">By person</caption>
                      <thead>
                        <tr>
                          <th scope="col">Person</th>
                          <th scope="col">Tasks created</th>
                          <th scope="col">Moves</th>
                          <th scope="col">Open bugs now</th>
                          <th scope="col">Time to Done</th>
                          <th scope="col">Time in test</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.byPerson.map((row) => (
                          <tr key={row.userId ?? 'unassigned'}>
                            <th scope="row">{row.username}</th>
                            <td>{row.tasksCreated}</td>
                            <td>{row.moves}</td>
                            <td>{row.openBugs}</td>
                            <td>
                              {durationOrEmpty(row.averageMsToDone, 'No completed tasks yet.')}
                            </td>
                            <td>
                              {durationOrEmpty(row.averageMsInTest, 'No finished test times yet.')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </article>
          </section>
        </>
      )}

      {!loading && !summary && !error && !pendingDates && (
        <div className="diagrams-empty">
          <div className="hub-empty-glyph">
            <AnalyticsIcon className="arc-icon arc-icon-empty" />
          </div>
          <p className="status-message">No tasks in this view yet.</p>
        </div>
      )}
    </div>
  );
}
