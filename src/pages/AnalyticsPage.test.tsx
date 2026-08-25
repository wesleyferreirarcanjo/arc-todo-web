import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsSummary } from '../types/analytics';

const fetchAnalyticsSummary = vi.hoisted(() => vi.fn());
const fetchOrganizations = vi.hoisted(() => vi.fn());
const fetchProjects = vi.hoisted(() => vi.fn());

vi.mock('../lib/api/analytics', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/analytics')>(
    '../lib/api/analytics',
  );
  return {
    ...actual,
    fetchAnalyticsSummary,
  };
});

vi.mock('../lib/api/organizations', () => ({
  fetchOrganizations,
}));

vi.mock('../lib/api/projects', () => ({
  fetchProjects,
}));

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 248 }}>{children}</div>
    ),
  };
});

import { AnalyticsPage } from './AnalyticsPage';

const emptyDwell = { averageMs: null, sampleSize: 0 };

const summary: AnalyticsSummary = {
  period: {
    key: '30d',
    label: 'Last 30 days',
    from: '2026-07-26',
    to: '2026-08-25',
    previousLabel: 'Previous period (26 Jun 2026 – 25 Jul 2026)',
    compareFrom: '2026-06-26',
    compareTo: '2026-07-25',
  },
  growth: {
    tasksCreated: { current: 15, previous: 10, delta: 5, percent: 50 },
    tasksCompleted: { current: 8, previous: 4, delta: 4, percent: 100 },
    moves: { current: 40, previous: 40, delta: 0, percent: 0 },
    bugReports: { current: 2, previous: 5, delta: -3, percent: -60 },
  },
  tasksCreated: 15,
  tasksCompleted: 8,
  activeCount: 8,
  archivedCount: 1,
  byStatus: { todo: 3, in_progress: 2, dev_test: 1, qa_test: 1, done: 1 },
  openBugs: 2,
  bugReports: 2,
  moves: 40,
  averageMsToDone: 4 * 24 * 60 * 60 * 1000,
  sampleSize: 3,
  completionTimestampSource: 'cycle',
  averageMsToSolveBug: null,
  sampleSizeBugSolves: 0,
  averageMsInDevTest: 8 * 60 * 60 * 1000,
  sampleSizeDevTestDwells: 2,
  averageMsInQaTest: null,
  sampleSizeQaTestDwells: 0,
  testDurationSource: 'activity',
  dwellByStatus: {
    todo: { averageMs: 2 * 24 * 60 * 60 * 1000, sampleSize: 4 },
    in_progress: emptyDwell,
    dev_test: emptyDwell,
    qa_test: emptyDwell,
    done: emptyDwell,
  },
  longestStay: {
    status: 'todo',
    label: 'To Do',
    averageMs: 2 * 24 * 60 * 60 * 1000,
    sampleSize: 4,
  },
  checklistTasks: 5,
  checklistItemsTotal: 20,
  checklistItemsChecked: 12,
  checklistCompleteTasks: 2,
  checklistOpenBugs: 1,
  byPerson: [
    {
      userId: 'u1',
      username: 'wesley',
      tasksCreated: 4,
      tasksCompleted: 2,
      moves: 10,
      openBugs: 1,
      averageMsToDone: 4 * 24 * 60 * 60 * 1000,
      sampleSizeToDone: 2,
      averageMsInTest: null,
      sampleSizeTestDwells: 0,
    },
  ],
  trend: {
    granularity: 'day',
    buckets: [
      { date: '2026-07-26', tasksCreated: 1, tasksCompleted: 0, moves: 2, bugReports: 0 },
      { date: '2026-07-27', tasksCreated: 0, tasksCompleted: 1, moves: 1, bugReports: 1 },
    ],
  },
};

describe('AnalyticsPage copy', () => {
  it('names the window clock versus the board-now clock', async () => {
    fetchOrganizations.mockResolvedValue([]);
    fetchProjects.mockResolvedValue([]);
    fetchAnalyticsSummary.mockResolvedValue(summary);

    render(
      <MemoryRouter initialEntries={['/analytics']}>
        <AnalyticsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'New tasks' })).toBeInTheDocument();
    });

    expect(screen.getAllByText('In this window').length).toBeGreaterThan(1);
    expect(screen.getByRole('heading', { name: 'Column moves' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tasks completed' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bugs flagged' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Completed' })).toBeInTheDocument();
    expect(screen.getByText('5 more +50%')).toBeInTheDocument();
    expect(screen.getByText('3 fewer −60%')).toBeInTheDocument();
    expect(screen.queryByText(/good|bad|success|danger/i)).not.toBeInTheDocument();
    expect(document.querySelector('.analytics-delta.is-up')).toBeTruthy();
    expect(document.querySelector('.analytics-delta.is-down')).toBeTruthy();
    expect(document.querySelector('.analytics-delta.is-success')).toBeNull();
    expect(document.querySelector('.analytics-delta.is-danger')).toBeNull();
    expect(
      screen.getByRole('img', { name: '12 of 20 checklist items checked' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Right now' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Open bugs' })).toBeInTheDocument();
  });
});
