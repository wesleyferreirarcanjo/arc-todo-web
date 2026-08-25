import type { AnalyticsByStatus, AnalyticsPersonRow, AnalyticsSummary } from '../../types/analytics';

export function statusChartRows(byStatus: AnalyticsByStatus) {
  return [
    { name: 'To Do', count: byStatus.todo },
    { name: 'In Progress', count: byStatus.in_progress },
    { name: 'Dev Test', count: byStatus.dev_test },
    { name: 'QA Test', count: byStatus.qa_test },
    { name: 'Done', count: byStatus.done },
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
