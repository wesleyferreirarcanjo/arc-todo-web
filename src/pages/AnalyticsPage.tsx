import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AnalyticsClockChip, AnalyticsKpiCard } from '../components/analytics/AnalyticsKpiCard';
import { AnalyticsMetricInfo } from '../components/analytics/AnalyticsMetricInfo';
import { AnalyticsToolbar } from '../components/analytics/AnalyticsToolbar';
import { useChartColors } from '../components/analytics/useChartColors';
import { ErrorAlert } from '../components/ErrorAlert';
import { AnalyticsIcon } from '../components/icons';
import {
  ANALYTICS_PERIOD_OPTIONS,
  fetchAnalyticsBugFlags,
  fetchAnalyticsSummary,
} from '../lib/api/analytics';
import { fetchOrganizations } from '../lib/api/organizations';
import { fetchProjects } from '../lib/api/projects';
import { dwellChartRows, statusChartRows, trendChartRows } from '../lib/analytics/chartData';
import { formatAnalyticsDuration } from '../lib/analytics/formatDuration';
import { formatAnalyticsRelativeTime } from '../lib/analytics/formatRelative';
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
import type { AnalyticsBugFlagDossier, AnalyticsSummary } from '../types/analytics';
import type { Organization } from '../types/organization';
import type { Project } from '../types/project';

const CHART_HEIGHT = 248;
const HERO_HEIGHT = 280;
const VERTICAL_Y_WIDTH = 108;

function durationOrEmpty(ms: number | null, empty: string): string {
  return formatAnalyticsDuration(ms) || empty;
}

function formatLastInteractionClock(iso: string | null): string {
  if (!iso) {
    return '';
  }
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) {
    return '';
  }
  return at.toLocaleString();
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

function PanelHead({
  clock,
  title,
  info,
}: {
  clock: 'window' | 'now';
  title: string;
  info: ReactNode;
}) {
  return (
    <header className="analytics-panel-head">
      <AnalyticsClockChip clock={clock} />
      <h3>{title}</h3>
      <AnalyticsMetricInfo label={title}>{info}</AnalyticsMetricInfo>
    </header>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="analytics-skeleton" aria-hidden="true">
      <div className="analytics-kpis">
        <div className="analytics-skeleton-block" />
        <div className="analytics-skeleton-block" />
        <div className="analytics-skeleton-block" />
        <div className="analytics-skeleton-block" />
      </div>
      <div className="analytics-skeleton-block analytics-skeleton-hero" />
    </div>
  );
}

export function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readAnalyticsFilters(searchParams), [searchParams]);
  const colors = useChartColors();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [bugFlags, setBugFlags] = useState<AnalyticsBugFlagDossier[]>([]);
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
      setBugFlags([]);
      setError(null);
      return;
    }
    if ('error' in queryState) {
      setLoading(false);
      setSummary(null);
      setBugFlags([]);
      setError(queryState.error);
      return;
    }

    const request = queryState;
    let cancelled = false;
    async function loadSummary() {
      setLoading(true);
      setError(null);
      try {
        const [next, flags] = await Promise.all([
          fetchAnalyticsSummary(request),
          fetchAnalyticsBugFlags(request),
        ]);
        if (!cancelled) {
          setSummary(next);
          setBugFlags(flags.items);
        }
      } catch (err) {
        if (!cancelled) {
          setSummary(null);
          setBugFlags([]);
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
  const dwellRows = summary ? dwellChartRows(summary.dwellByStatus) : [];
  const trendRows = summary ? trendChartRows(summary.trend.buckets) : [];
  const pendingDates = 'pending' in queryState;
  const periodLabel =
    summary?.period.label ??
    ANALYTICS_PERIOD_OPTIONS.find((option) => option.value === filters.period)?.label;
  const compareCaption =
    summary?.period.previousLabel ??
    (filters.period === 'all' ? null : 'the previous window');
  const windowName = periodLabel ?? 'this window';
  const completedGrowth = summary?.growth.tasksCompleted ?? {
    current: summary?.tasksCompleted ?? summary?.sampleSize ?? 0,
    previous: null,
    delta: null,
    percent: null,
  };
  const checklistTotal = summary?.checklistItemsTotal ?? 0;
  const checklistChecked = summary?.checklistItemsChecked ?? 0;
  const checklistPercent =
    checklistTotal > 0 ? Math.round((checklistChecked / checklistTotal) * 100) : 0;
  const doneEmpty = !summary || summary.averageMsToDone === null;
  const bugEmpty = !summary || summary.averageMsToSolveBug === null;
  const devTestEmpty = !summary || summary.averageMsInDevTest === null;
  const qaTestEmpty = !summary || summary.averageMsInQaTest === null;
  const caption = formatPeriodCaption({
    pending: pendingDates,
    periodKey: filters.period,
    periodLabel,
    compareLabel: compareCaption,
  });

  return (
    <div className="page-shell analytics-page">
      <AnalyticsToolbar
        filters={filters}
        organizations={organizations}
        projectOptions={projectOptions}
        periodLabel={pendingDates ? undefined : periodLabel}
        compareCaption={filters.period === 'all' ? null : compareCaption}
        caption={caption}
        onChange={setFilters}
      />

      {error && <ErrorAlert>{error}</ErrorAlert>}
      {loading && !summary && <p className="sr-only">Loading analytics...</p>}
      {loading && !summary && <AnalyticsSkeleton />}

      {!loading && !summary && !error && !pendingDates && (
        <div className="diagrams-empty">
          <div className="hub-empty-glyph">
            <AnalyticsIcon className="arc-icon arc-icon-empty" />
          </div>
          <p className="status-message">No tasks in this view yet.</p>
        </div>
      )}

      {summary && (
        <>
          <section className="analytics-row" aria-label="What changed">
            <div className="analytics-row-label">
              <AnalyticsClockChip clock="window" />
            </div>
            <div className="analytics-kpis analytics-growth">
              <AnalyticsKpiCard
                title="New tasks"
                value={String(summary.growth.tasksCreated.current)}
                metric={summary.growth.tasksCreated}
                info={
                  <>
                    <p>Tasks opened in this window.</p>
                    <p>{formatGrowthCopy(summary.growth.tasksCreated, summary.period.previousLabel)}</p>
                  </>
                }
              />
              <AnalyticsKpiCard
                title="Tasks completed"
                value={String(completedGrowth.current)}
                metric={completedGrowth}
                info={
                  <>
                    <p>
                      Tasks that reached Done in {windowName}, including work archived when a
                      sprint closed. This count can be larger than the Done column right now.
                    </p>
                    <p>
                      {formatGrowthCopy(completedGrowth, summary.period.previousLabel)}
                    </p>
                  </>
                }
              />
              <AnalyticsKpiCard
                title="Column moves"
                value={String(summary.growth.moves.current)}
                metric={summary.growth.moves}
                info={
                  <>
                    <p>Times a task changed status.</p>
                    <p>{formatGrowthCopy(summary.growth.moves, summary.period.previousLabel)}</p>
                  </>
                }
              />
              <AnalyticsKpiCard
                title="Bugs flagged"
                value={String(summary.growth.bugReports.current)}
                metric={summary.growth.bugReports}
                info={
                  <>
                    <p>Times a task was marked Bug.</p>
                    <p>{formatGrowthCopy(summary.growth.bugReports, summary.period.previousLabel)}</p>
                  </>
                }
              />
            </div>
          </section>

          <section className="analytics-hero" aria-label="Trend">
            <header className="analytics-panel-head">
              <AnalyticsClockChip clock="window" />
              <h3>Trend</h3>
              <AnalyticsMetricInfo label="Trend">
                New tasks, tasks completed, column moves, and bugs flagged across {windowName}.
              </AnalyticsMetricInfo>
            </header>
            <article className="analytics-panel analytics-panel-wide">
              <p className="analytics-chart-caption">Counts per {summary.trend.granularity} in this window.</p>
              <div className="analytics-chart">
                <ResponsiveContainer width="100%" height={HERO_HEIGHT}>
                  <LineChart data={trendRows} margin={{ top: 8, left: 8, right: 8, bottom: 4 }}>
                    <CartesianGrid stroke={colors.grid} vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke={colors.muted}
                      tick={{ fill: colors.muted, fontSize: 12 }}
                    />
                    <YAxis allowDecimals={false} stroke={colors.muted} />
                    <Tooltip
                      cursor={{ stroke: colors.grid }}
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
                    <Line
                      type="monotone"
                      dataKey="created"
                      name="New tasks"
                      stroke={colors.accent}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      name="Tasks completed"
                      stroke={colors.muted}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="moves"
                      name="Column moves"
                      stroke={colors.secondary}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="bugs"
                      name="Bugs flagged"
                      stroke={colors.tertiary}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <section className="analytics-flow" aria-label="Flow">
            <article className="analytics-panel">
              <PanelHead
                clock="window"
                title="Where work stayed longest"
                info={
                  summary.longestStay
                    ? `Tasks spent the most time in ${summary.longestStay.label} before moving on — ${formatAnalyticsDuration(summary.longestStay.averageMs)} on average. ${formatSampleCopy(summary.longestStay.sampleSize, 'finished stay')} Sprint close counts time in Done.`
                    : 'No finished stays in this window yet. A stay counts when the task leaves that column, or when Done work is archived at sprint close.'
                }
              />
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

            <article className="analytics-panel">
              <PanelHead
                clock="now"
                title="Tasks by column"
                info="How many tasks sit in each status right now. Sprint-archived Done work is not in this chart — it still counts in Tasks completed for the window."
              />
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
          </section>

          <section className="analytics-timing" aria-label="How long work took">
            <div className="analytics-row-label">
              <AnalyticsClockChip clock="window" />
            </div>
            <div className="analytics-kpis analytics-timing-kpis">
              <AnalyticsKpiCard
                title="Create to Done"
                value={durationOrEmpty(summary.averageMsToDone, '—')}
                empty={doneEmpty}
                info={
                  <>
                    <p>
                      From opening a task until it reached Done, for work that finished in{' '}
                      {windowName}, including tasks archived after sprint close.
                    </p>
                    <p>
                      {doneEmpty
                        ? 'No completed tasks in this window yet.'
                        : formatSampleCopy(summary.sampleSize, 'completed task')}
                    </p>
                  </>
                }
              />
              <AnalyticsKpiCard
                title="Bug to solved"
                value={durationOrEmpty(summary.averageMsToSolveBug, '—')}
                empty={bugEmpty}
                info={
                  <>
                    <p>From marking Bug until it was resolved.</p>
                    <p>
                      {bugEmpty
                        ? 'No solved bugs in this window yet.'
                        : formatSampleCopy(summary.sampleSizeBugSolves, 'solved bug')}
                    </p>
                  </>
                }
              />
              <AnalyticsKpiCard
                title="Time in Dev Test"
                value={durationOrEmpty(summary.averageMsInDevTest, '—')}
                empty={devTestEmpty}
                info={
                  <>
                    <p>Average stay in Dev Test before moving on.</p>
                    <p>
                      {devTestEmpty
                        ? 'No finished Dev Test stays in this window yet.'
                        : formatSampleCopy(summary.sampleSizeDevTestDwells, 'finished stay')}
                    </p>
                  </>
                }
              />
              <AnalyticsKpiCard
                title="Time in QA Test"
                value={durationOrEmpty(summary.averageMsInQaTest, '—')}
                empty={qaTestEmpty}
                info={
                  <>
                    <p>Average stay in QA Test before moving on.</p>
                    <p>
                      {qaTestEmpty
                        ? 'No finished QA Test stays in this window yet.'
                        : formatSampleCopy(summary.sampleSizeQaTestDwells, 'finished stay')}
                    </p>
                  </>
                }
              />
              <article className="analytics-kpi">
                <header className="analytics-kpi-head">
                  <h3>QA checklist</h3>
                  <AnalyticsMetricInfo label="QA checklist">
                    Checklist items on tasks that are on the board now. These are not limited to{' '}
                    {windowName}.
                  </AnalyticsMetricInfo>
                </header>
                <AnalyticsClockChip clock="now" />
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

          <section className="analytics-people" aria-label="By person">
            <header className="analytics-panel-head">
              <p className="analytics-scope">Both clocks</p>
              <h3>By person</h3>
              <AnalyticsMetricInfo label="By person">
                New tasks, tasks completed, and column moves are for {windowName}. Open bugs are
                the board right now.
              </AnalyticsMetricInfo>
            </header>
            <article className="analytics-panel analytics-panel-wide">
              {summary.byPerson.length === 0 ? (
                <p className="status-message">No person activity in this view yet.</p>
              ) : (
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
                        <th scope="colgroup" colSpan={3}>
                          In this window
                        </th>
                        <th scope="col">Right now</th>
                        <th scope="colgroup" colSpan={2}>
                          In this window
                        </th>
                      </tr>
                      <tr>
                        <th scope="col">New tasks</th>
                        <th scope="col">Completed</th>
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
                          <td>{row.tasksCompleted ?? row.sampleSizeToDone}</td>
                          <td>{row.moves}</td>
                          <td>{row.openBugs}</td>
                          <td>
                            {durationOrEmpty(row.averageMsToDone, '—')}
                          </td>
                          <td>
                            {durationOrEmpty(row.averageMsInTest, '—')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </section>

          <section className="analytics-activity" aria-label="Last interaction">
            <header className="analytics-panel-head">
              <AnalyticsClockChip clock="now" />
              <h3>Last interaction</h3>
              <AnalyticsMetricInfo label="Last interaction">
                Most recent recorded action per person on these boards — task create, edit,
                move, or delete, plus knowledge changes. Login, comments, and chat are not
                in this log. Org and project still apply; date chips do not.
              </AnalyticsMetricInfo>
            </header>
            <article className="analytics-panel analytics-panel-wide">
              {(summary.lastInteractions ?? []).length === 0 ? (
                <p className="status-message">No people in this view yet.</p>
              ) : (
                <div className="analytics-table-wrap">
                  <table className="analytics-table">
                    <caption className="sr-only">
                      Last recorded interaction per person on these boards
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Person</th>
                        <th scope="col">Last interaction</th>
                        <th scope="col">What they did</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(summary.lastInteractions ?? []).map((row) => {
                        const relative = formatAnalyticsRelativeTime(row.lastInteractedAt);
                        const clock = formatLastInteractionClock(row.lastInteractedAt);
                        const never = !row.lastInteractedAt;
                        return (
                          <tr
                            key={row.userId}
                            className={never ? 'analytics-last-never' : undefined}
                          >
                            <th scope="row">{row.username}</th>
                            <td>
                              {never || !row.lastInteractedAt ? (
                                <span className="analytics-last-relative">{relative}</span>
                              ) : (
                                <time
                                  className="analytics-last-when"
                                  dateTime={row.lastInteractedAt}
                                >
                                  <span className="analytics-last-relative">{relative}</span>
                                  {clock ? (
                                    <span className="analytics-last-clock">{clock}</span>
                                  ) : null}
                                </time>
                              )}
                            </td>
                            <td className="analytics-last-summary">
                              {row.summary || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </section>

          <section className="analytics-flags" aria-label="Grok bug flags">
            <header className="analytics-panel-head">
              <AnalyticsClockChip clock="window" />
              <h3>Grok bug flags</h3>
              <AnalyticsMetricInfo label="Grok bug flags">
                Latest Grok dossier per task in {windowName}. Task is a 1–10 rating of
                the ticket; Flag is a 1–10 rating of the bug report. Admin-only — never
                on the board or in task details.
              </AnalyticsMetricInfo>
            </header>
            <article className="analytics-panel analytics-panel-wide">
              {bugFlags.length === 0 ? (
                <p className="status-message">No Grok bug-flag dossiers in this window yet.</p>
              ) : (
                <div className="analytics-table-wrap">
                  <table className="analytics-table">
                    <caption className="sr-only">
                      Grok bug-flag dossiers for {windowName}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">Title</th>
                        <th scope="col">Primary</th>
                        <th scope="col">Secondary</th>
                        <th scope="col">Task score</th>
                        <th scope="col">Flag score</th>
                        <th scope="col">Motivo</th>
                        <th scope="col">Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bugFlags.map((row) => (
                        <tr key={row.id}>
                          <th scope="row" className="analytics-flag-id">
                            {row.displayId}
                          </th>
                          <td className="analytics-flag-title">{row.title}</td>
                          <td>
                            <span className="analytics-flag-chip">{row.primary}</span>
                          </td>
                          <td>
                            {row.secondary.length === 0 ? (
                              '—'
                            ) : (
                              <div className="analytics-flag-chips">
                                {row.secondary.map((tag) => (
                                  <span key={tag} className="analytics-flag-chip">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="analytics-flag-id">
                            {row.taskScore == null ? '—' : `${row.taskScore}/10`}
                          </td>
                          <td className="analytics-flag-id">
                            {row.flagScore == null ? '—' : `${row.flagScore}/10`}
                          </td>
                          <td className="analytics-flag-motivo">{row.motivo}</td>
                          <td className="analytics-flag-evidence">{row.evidence || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  );
}
