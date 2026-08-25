import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
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
import { dwellChartRows, personChartRows, statusChartRows } from '../lib/analytics/chartData';
import { formatAnalyticsDuration } from '../lib/analytics/formatDuration';
import {
  formatGrowthCopy,
  formatPeriodCaption,
  formatSampleCopy,
} from '../lib/analytics/growthCopy';
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

const CHART_HEIGHT = 248;
const VERTICAL_Y_WIDTH = 108;

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

type ChartTooltipRow = {
  name?: string;
  value?: number | string;
  payload?: Record<string, unknown>;
};

function ChartTooltip({
  active,
  label,
  payload,
  formatValue,
}: {
  active?: boolean;
  label?: string | number;
  payload?: ChartTooltipRow[];
  formatValue?: (value: number, name: string, row: Record<string, unknown>) => string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="analytics-tooltip">
      {label != null && label !== '' && <p className="analytics-tooltip-label">{label}</p>}
      {payload.map((entry) => {
        const name = String(entry.name ?? '');
        const numeric = Number(entry.value);
        const formatted = formatValue
          ? formatValue(numeric, name, entry.payload ?? {})
          : String(entry.value ?? '');
        return (
          <p key={name || String(entry.value)}>
            <span>{name}</span>
            <strong>{formatted}</strong>
          </p>
        );
      })}
    </div>
  );
}

function ScopeHeader({
  clock,
  title,
  children,
}: {
  clock: 'window' | 'now';
  title: string;
  children: ReactNode;
}) {
  return (
    <header className="analytics-section-head">
      <p className="analytics-scope">{clock === 'window' ? 'In this window' : 'Right now'}</p>
      <h3>{title}</h3>
      {typeof children === 'string' ? <p>{children}</p> : children}
    </header>
  );
}

function GrowthCard({
  title,
  hint,
  metric,
  previousLabel,
}: {
  title: string;
  hint: string;
  metric: AnalyticsGrowthMetric;
  previousLabel: string | null;
}) {
  const copy = formatGrowthCopy(metric, previousLabel);
  const direction =
    metric.delta === null ? '' : metric.delta > 0 ? 'up' : metric.delta < 0 ? 'down' : 'flat';
  return (
    <article className={`analytics-kpi analytics-growth-card is-${direction || 'none'}`}>
      <h3>{title}</h3>
      <p className="analytics-kpi-hint">{hint}</p>
      <p className="analytics-kpi-value">{metric.current}</p>
      <p className="analytics-kpi-meta">{copy}</p>
    </article>
  );
}

function DurationCard({
  title,
  hint,
  value,
  empty,
  sample,
}: {
  title: string;
  hint: string;
  value: string;
  empty: boolean;
  sample: string;
}) {
  return (
    <article className="analytics-kpi">
      <h3>{title}</h3>
      <p className="analytics-kpi-hint">{hint}</p>
      {empty ? (
        <p className="analytics-kpi-empty">{value}</p>
      ) : (
        <p className="analytics-kpi-value">{value}</p>
      )}
      {sample ? <p className="analytics-footnote">{sample}</p> : null}
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
  const personRows = summary ? personChartRows(summary.byPerson) : [];
  const dwellRows = summary ? dwellChartRows(summary.dwellByStatus) : [];
  const pendingDates = 'pending' in queryState;
  const periodLabel =
    summary?.period.label ??
    ANALYTICS_PERIOD_OPTIONS.find((option) => option.value === filters.period)?.label;
  const compareCaption =
    summary?.period.previousLabel ??
    (filters.period === 'all' ? null : 'the previous window');
  const windowName = periodLabel ?? 'this window';
  const checklistTotal = summary?.checklistItemsTotal ?? 0;
  const checklistChecked = summary?.checklistItemsChecked ?? 0;
  const checklistPercent =
    checklistTotal > 0 ? Math.round((checklistChecked / checklistTotal) * 100) : 0;
  const doneEmpty = !summary || summary.averageMsToDone === null;
  const bugEmpty = !summary || summary.averageMsToSolveBug === null;
  const devTestEmpty = !summary || summary.averageMsInDevTest === null;
  const qaTestEmpty = !summary || summary.averageMsInQaTest === null;

  return (
    <div className="page-shell analytics-page">
      <header className="page-header">
        <h2>Analytics</h2>
        <p className="page-subtitle">
          Window numbers count the dates you pick. Board-now numbers are the columns and checklist
          sitting there at this moment.
        </p>
      </header>

      <div className="analytics-controls">
        <div className="analytics-control-block">
          <p className="analytics-scope">Whose boards</p>
          <div className="board-filters diagrams-hub-filters analytics-filters">
            <label className="board-filter-field">
              Organization
              <Select
                value={filters.organizationId}
                onChange={(value) =>
                  setFilters({ ...filters, organizationId: value, projectId: '' })
                }
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
        </div>

        <div className="analytics-control-block">
          <p className="analytics-scope">Which dates</p>
          <div
            className="board-view-toggle analytics-period-toggle"
            role="group"
            aria-label="Time window"
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
                    { value: 'previous', label: 'Previous window' },
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
                      onChange={(event) =>
                        setFilters({ ...filters, compareTo: event.target.value })
                      }
                    />
                  </label>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="analytics-period-caption">
        {formatPeriodCaption({
          pending: pendingDates,
          periodKey: filters.period,
          periodLabel,
          compareLabel: compareCaption,
        })}
      </p>

      {error && <ErrorAlert>{error}</ErrorAlert>}
      {loading && <p className="status-message">Loading analytics...</p>}

      {!loading && summary && (
        <>
          <section className="analytics-chapter" aria-label="What changed">
            <ScopeHeader clock="window" title="What changed">
              How many tasks were opened, moved to another column, or marked Bug in {windowName}.
            </ScopeHeader>
            <div className="analytics-kpis analytics-growth">
              <GrowthCard
                title="New tasks"
                hint="Tasks opened in this window"
                metric={summary.growth.tasksCreated}
                previousLabel={summary.period.previousLabel}
              />
              <GrowthCard
                title="Column moves"
                hint="Times a task changed status"
                metric={summary.growth.moves}
                previousLabel={summary.period.previousLabel}
              />
              <GrowthCard
                title="Bugs flagged"
                hint="Times a task was marked Bug"
                metric={summary.growth.bugReports}
                previousLabel={summary.period.previousLabel}
              />
            </div>
          </section>

          <section className="analytics-chapter" aria-label="How long work took">
            <ScopeHeader clock="window" title="How long work took">
              Averages for work that finished inside {windowName}.
            </ScopeHeader>
            <div className="analytics-kpis">
              <DurationCard
                title="Create to Done"
                hint="From opening a task until it reached Done"
                value={durationOrEmpty(
                  summary.averageMsToDone,
                  'No completed tasks in this window yet.',
                )}
                empty={doneEmpty}
                sample={formatSampleCopy(summary.sampleSize, 'completed task')}
              />
              <DurationCard
                title="Bug to solved"
                hint="From marking Bug until it was resolved"
                value={durationOrEmpty(
                  summary.averageMsToSolveBug,
                  'No solved bugs in this window yet.',
                )}
                empty={bugEmpty}
                sample={formatSampleCopy(summary.sampleSizeBugSolves, 'solved bug')}
              />
              <DurationCard
                title="Time in Dev Test"
                hint="Average stay in Dev Test before moving on"
                value={durationOrEmpty(
                  summary.averageMsInDevTest,
                  'No finished Dev Test stays in this window yet.',
                )}
                empty={devTestEmpty}
                sample={formatSampleCopy(summary.sampleSizeDevTestDwells, 'finished stay')}
              />
              <DurationCard
                title="Time in QA Test"
                hint="Average stay in QA Test before moving on"
                value={durationOrEmpty(
                  summary.averageMsInQaTest,
                  'No finished QA Test stays in this window yet.',
                )}
                empty={qaTestEmpty}
                sample={formatSampleCopy(summary.sampleSizeQaTestDwells, 'finished stay')}
              />
            </div>
          </section>

          <section className="analytics-chapter" aria-label="Where work stayed longest">
            <ScopeHeader clock="window" title="Where work stayed longest">
              {summary.longestStay
                ? `Tasks spent the most time in ${summary.longestStay.label} before moving on — ${formatAnalyticsDuration(summary.longestStay.averageMs)} on average. ${formatSampleCopy(summary.longestStay.sampleSize, 'finished stay')}`
                : 'No finished stays in this window yet. A stay counts when the task leaves that column.'}
            </ScopeHeader>
            <article className="analytics-panel analytics-panel-wide">
              <p className="analytics-chart-caption">
                Bar length is average time in that column before the task moved on.
              </p>
              <div className="analytics-chart">
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <BarChart
                    data={dwellRows}
                    layout="vertical"
                    margin={{ top: 4, left: 4, right: 72, bottom: 4 }}
                  >
                    <CartesianGrid stroke={colors.grid} horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={VERTICAL_Y_WIDTH}
                      stroke={colors.muted}
                      tick={{ fill: colors.muted, fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: colors.grid }}
                      content={
                        <ChartTooltip
                          formatValue={(value, _name, row) => {
                            const sample = Number(row.sample ?? 0);
                            if (!value || sample === 0) {
                              return 'No finished stays yet';
                            }
                            return `${formatAnalyticsDuration(value) || '—'} average · ${sample} finished ${sample === 1 ? 'stay' : 'stays'}`;
                          }}
                        />
                      }
                    />
                    <Bar dataKey="ms" name="Average stay" fill={colors.secondary} radius={[0, 6, 6, 0]}>
                      <LabelList
                        dataKey="ms"
                        position="right"
                        fill={colors.text}
                        fontSize={12}
                        formatter={(value) =>
                          Number(value) > 0 ? formatAnalyticsDuration(Number(value)) || '—' : '—'
                        }
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <section className="analytics-chapter is-now" aria-label="On the board now">
            <ScopeHeader clock="now" title="On the board now">
              Current columns, open bugs, and checklist. These are not limited to {windowName}.
            </ScopeHeader>
            <div className="analytics-panels">
              <article className="analytics-panel">
                <h3>Tasks by column</h3>
                <p className="analytics-kpi-hint">How many tasks sit in each status right now</p>
                <p className="analytics-kpi-meta">
                  {summary.activeCount} active · {summary.archivedCount} archived · {summary.openBugs}{' '}
                  open bugs
                </p>
                <div className="analytics-chart">
                  <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                    <BarChart
                      data={statusRows}
                      layout="vertical"
                      margin={{ top: 4, left: 4, right: 40, bottom: 4 }}
                    >
                      <CartesianGrid stroke={colors.grid} horizontal={false} />
                      <XAxis type="number" allowDecimals={false} hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={VERTICAL_Y_WIDTH}
                        stroke={colors.muted}
                        tick={{ fill: colors.muted, fontSize: 12 }}
                      />
                      <Tooltip
                        cursor={{ fill: colors.grid }}
                        content={
                          <ChartTooltip
                            formatValue={(value) =>
                              `${value} ${value === 1 ? 'task' : 'tasks'} in this column now`
                            }
                          />
                        }
                      />
                      <Bar dataKey="count" name="Tasks now" fill={colors.accent} radius={[0, 6, 6, 0]}>
                        <LabelList dataKey="count" position="right" fill={colors.text} fontSize={12} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="analytics-panel">
                <h3>QA checklist</h3>
                <p className="analytics-kpi-hint">
                  Checklist items on tasks that are on the board now
                </p>
                {checklistTotal === 0 ? (
                  <p className="analytics-kpi-empty">No checklist items on the board yet.</p>
                ) : (
                  <>
                    <p className="analytics-kpi-value">
                      {checklistChecked}
                      <span className="analytics-kpi-unit">of {checklistTotal} checked</span>
                    </p>
                    <div
                      className="analytics-progress"
                      role="img"
                      aria-label={`${checklistChecked} of ${checklistTotal} checklist items checked`}
                    >
                      <span style={{ width: `${checklistPercent}%` }} />
                    </div>
                    <p className="analytics-kpi-meta">
                      {checklistPercent}% checked · {summary.checklistCompleteTasks} tasks fully
                      checked · {summary.checklistOpenBugs} open bugs
                    </p>
                  </>
                )}
              </article>
            </div>
          </section>

          <section className="analytics-chapter" aria-label="By person">
            <header className="analytics-section-head">
              <p className="analytics-scope">Both clocks</p>
              <h3>By person</h3>
              <p>
                New tasks and column moves are for {windowName}. Open bugs are the board right now.
              </p>
            </header>
            <article className="analytics-panel analytics-panel-wide">
              {personRows.length === 0 ? (
                <p className="status-message">No person activity in this view yet.</p>
              ) : (
                <>
                  <p className="analytics-chart-caption">
                    Bars are this window only — new tasks opened and times that person moved a
                    task.
                  </p>
                  <div className="analytics-chart">
                    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                      <BarChart data={personRows} margin={{ top: 8, left: 8, right: 8, bottom: 4 }}>
                        <CartesianGrid stroke={colors.grid} vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke={colors.muted}
                          tick={{ fill: colors.muted, fontSize: 12 }}
                        />
                        <YAxis allowDecimals={false} stroke={colors.muted} />
                        <Tooltip
                          cursor={{ fill: colors.grid }}
                          content={
                            <ChartTooltip
                              formatValue={(value, name) =>
                                `${value} ${name.toLowerCase()} in ${windowName}`
                              }
                            />
                          }
                        />
                        <Legend
                          wrapperStyle={{ color: colors.muted, fontSize: 12 }}
                          formatter={(value) => (
                            <span style={{ color: colors.muted }}>{value}</span>
                          )}
                        />
                        <Bar dataKey="created" name="New tasks" fill={colors.accent} />
                        <Bar dataKey="moves" name="Column moves" fill={colors.secondary} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="analytics-table-wrap">
                    <table className="analytics-table">
                      <caption className="sr-only">
                        By person: window counts and board-now open bugs
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col" rowSpan={2}>
                            Person
                          </th>
                          <th scope="colgroup" colSpan={2}>
                            In this window
                          </th>
                          <th scope="col">Right now</th>
                          <th scope="colgroup" colSpan={2}>
                            In this window
                          </th>
                        </tr>
                        <tr>
                          <th scope="col">New tasks</th>
                          <th scope="col">Column moves</th>
                          <th scope="col">Open bugs</th>
                          <th scope="col">Avg to Done</th>
                          <th scope="col">Avg in test</th>
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
                              {durationOrEmpty(
                                row.averageMsToDone,
                                'No completed tasks yet.',
                              )}
                            </td>
                            <td>
                              {durationOrEmpty(
                                row.averageMsInTest,
                                'No finished test times yet.',
                              )}
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
