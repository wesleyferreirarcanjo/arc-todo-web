import type {
  AnalyticsByStatus,
  AnalyticsDwellByStatus,
  AnalyticsPersonRow,
  AnalyticsSummary,
} from '../../types/analytics';

export function statusChartRows(byStatus: AnalyticsByStatus) {
  return [
    { name: 'To Do', count: byStatus.todo },
    { name: 'In Progress', count: byStatus.in_progress },
    { name: 'Dev Test', count: byStatus.dev_test },
    { name: 'QA Test', count: byStatus.qa_test },
    { name: 'Done', count: byStatus.done },
  ];
}

export function dwellChartRows(dwellByStatus: AnalyticsDwellByStatus) {
  return [
    { name: 'To Do', ms: dwellByStatus.todo.averageMs ?? 0, sample: dwellByStatus.todo.sampleSize },
    {
      name: 'In Progress',
      ms: dwellByStatus.in_progress.averageMs ?? 0,
      sample: dwellByStatus.in_progress.sampleSize,
    },
    {
      name: 'Dev Test',
      ms: dwellByStatus.dev_test.averageMs ?? 0,
      sample: dwellByStatus.dev_test.sampleSize,
    },
    {
      name: 'QA Test',
      ms: dwellByStatus.qa_test.averageMs ?? 0,
      sample: dwellByStatus.qa_test.sampleSize,
    },
    { name: 'Done', ms: dwellByStatus.done.averageMs ?? 0, sample: dwellByStatus.done.sampleSize },
  ];
}

export function checklistChartRows(summary: AnalyticsSummary) {
  return [
    { name: 'Checked', count: summary.checklistItemsChecked },
    {
      name: 'Remaining',
      count: Math.max(0, summary.checklistItemsTotal - summary.checklistItemsChecked),
    },
  ];
}

export function personChartRows(rows: AnalyticsPersonRow[]) {
  return rows.map((row) => ({
    name: row.username,
    created: row.tasksCreated,
    moves: row.moves,
  }));
}
