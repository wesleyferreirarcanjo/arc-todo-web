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
import { fetchAnalyticsSummary } from '../lib/api/analytics';
import { fetchOrganizations } from '../lib/api/organizations';
import { fetchProjects } from '../lib/api/projects';
import {
  checklistChartRows,
  personChartRows,
  statusChartRows,
} from '../lib/analytics/chartData';
import { formatAnalyticsDuration } from '../lib/analytics/formatDuration';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import type { AnalyticsSummary } from '../types/analytics';
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

export function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const orgFilter = searchParams.get('organizationId') ?? '';
  const projectFilter = searchParams.get('projectId') ?? '';
  const colors = useChartColors();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectOptions = useMemo(
    () =>
      orgFilter
        ? projects.filter((project) => project.organizationId === orgFilter)
        : projects,
    [projects, orgFilter],
  );

  const setFilters = useCallback(
    (nextOrg: string, nextProject: string) => {
      const next = new URLSearchParams();
      if (nextOrg) next.set('organizationId', nextOrg);
      if (nextProject) next.set('projectId', nextProject);
      setSearchParams(next, { replace: true });
    },
    [setSearchParams],
  );

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
    if (!projectFilter) {
      return;
    }
    const project = projects.find((entry) => entry.id === projectFilter);
    if (project && orgFilter && project.organizationId !== orgFilter) {
      setFilters(orgFilter, '');
    }
  }, [orgFilter, projectFilter, projects, setFilters]);

  useEffect(() => {
    let cancelled = false;
    async function loadSummary() {
      setLoading(true);
      setError(null);
      try {
        const next = await fetchAnalyticsSummary({
          organizationId: orgFilter || undefined,
          projectId: projectFilter || undefined,
        });
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
  }, [orgFilter, projectFilter]);

  const statusRows = summary ? statusChartRows(summary.byStatus) : [];
  const checklistRows = summary ? checklistChartRows(summary) : [];
  const personRows = summary ? personChartRows(summary.byPerson) : [];

  return (
    <div className="page-shell analytics-page">
      <header className="page-header">
        <h2>Analytics</h2>
        <p className="page-subtitle">
          Task, checklist, and board timing for administrators.
        </p>
      </header>

      <div className="board-filters diagrams-hub-filters analytics-filters">
        <label className="board-filter-field">
          Organization
          <Select
            value={orgFilter}
            onChange={(value) => setFilters(value, '')}
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
            value={projectFilter}
            onChange={(value) => setFilters(orgFilter, value)}
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

      {error && <ErrorAlert>{error}</ErrorAlert>}
      {loading && <p className="status-message">Loading analytics...</p>}

      {!loading && summary && summary.tasksCreated === 0 && (
        <div className="diagrams-empty">
          <div className="hub-empty-glyph">
            <AnalyticsIcon className="arc-icon arc-icon-empty" />
          </div>
          <p className="status-message">No tasks in this view yet.</p>
        </div>
      )}

      {!loading && summary && summary.tasksCreated > 0 && (
        <>
          <section className="analytics-kpis" aria-label="Analytics figures">
            <article className="analytics-kpi">
              <h3>Tasks created</h3>
              <p className="analytics-kpi-value">{summary.tasksCreated}</p>
              <p className="analytics-kpi-meta">
                {summary.activeCount} active · {summary.archivedCount} archived
              </p>
            </article>
            <article className="analytics-kpi">
              <h3>Last 7 days</h3>
              <p className="analytics-kpi-value">{summary.tasksCreatedLast7Days}</p>
            </article>
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
              <h3>Moves</h3>
              <p className="analytics-kpi-value">{summary.moves}</p>
            </article>
            <article className="analytics-kpi">
              <h3>Bug flags</h3>
              <p className="analytics-kpi-value">{summary.openBugs}</p>
              <p className="analytics-kpi-meta">{summary.bugReports} reports</p>
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
            <article className="analytics-kpi">
              <h3>Checklist</h3>
              <p className="analytics-kpi-value">
                {summary.checklistItemsChecked} / {summary.checklistItemsTotal}
              </p>
              <p className="analytics-kpi-meta">
                {summary.checklistCompleteTasks} complete · {summary.checklistOpenBugs} open
                bugs
              </p>
            </article>
          </section>

          <section className="analytics-panels">
            <article className="analytics-panel">
              <h3>By status</h3>
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
                {summary.checklistItemsChecked} of {summary.checklistItemsTotal} checked
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
                          <th scope="col">Open bugs</th>
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
    </div>
  );
}
