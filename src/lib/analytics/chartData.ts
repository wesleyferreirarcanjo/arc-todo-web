import type {
  AnalyticsByStatus,
  AnalyticsDwellByStatus,
  AnalyticsTrendBucket,
} from '../../types/analytics';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

export function trendChartRows(buckets: AnalyticsTrendBucket[]) {
  return buckets.map((bucket) => ({
    date: bucket.date,
    label: formatTrendTick(bucket.date),
    created: bucket.tasksCreated,
    completed: bucket.tasksCompleted ?? 0,
    moves: bucket.moves,
    bugs: bucket.bugReports,
  }));
}

function formatTrendTick(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) {
    return iso;
  }
  return `${day} ${MONTHS[month - 1]}`;
}
