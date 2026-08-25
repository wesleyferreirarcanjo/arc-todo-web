export type AnalyticsTaskStatus =
  | 'todo'
  | 'in_progress'
  | 'dev_test'
  | 'qa_test'
  | 'done';

export type AnalyticsPeriodKey = '7d' | '30d' | '90d' | 'all' | 'custom';
export type AnalyticsCompareMode = 'previous' | 'custom';

export type AnalyticsByStatus = Record<AnalyticsTaskStatus, number>;

export interface AnalyticsPersonRow {
  userId: string | null;
  username: string;
  tasksCreated: number;
  tasksCompleted?: number;
  moves: number;
  openBugs: number;
  averageMsToDone: number | null;
  sampleSizeToDone: number;
  averageMsInTest: number | null;
  sampleSizeTestDwells: number;
}

export interface AnalyticsGrowthMetric {
  current: number;
  previous: number | null;
  delta: number | null;
  percent: number | null;
}

export interface AnalyticsPeriodInfo {
  key: AnalyticsPeriodKey;
  label: string;
  from: string | null;
  to: string | null;
  previousLabel: string | null;
  compareFrom: string | null;
  compareTo: string | null;
}

export interface AnalyticsDwellStat {
  averageMs: number | null;
  sampleSize: number;
}

export type AnalyticsDwellByStatus = Record<AnalyticsTaskStatus, AnalyticsDwellStat>;

export interface AnalyticsLongestStay {
  status: AnalyticsTaskStatus;
  label: string;
  averageMs: number;
  sampleSize: number;
}

export type AnalyticsTrendGranularity = 'day' | 'week';

export interface AnalyticsTrendBucket {
  date: string;
  tasksCreated: number;
  tasksCompleted?: number;
  moves: number;
  bugReports: number;
}

export interface AnalyticsTrend {
  granularity: AnalyticsTrendGranularity;
  buckets: AnalyticsTrendBucket[];
}

export interface AnalyticsSummary {
  period: AnalyticsPeriodInfo;
  growth: {
    tasksCreated: AnalyticsGrowthMetric;
    tasksCompleted?: AnalyticsGrowthMetric;
    moves: AnalyticsGrowthMetric;
    bugReports: AnalyticsGrowthMetric;
  };
  tasksCreated: number;
  tasksCompleted?: number;
  activeCount: number;
  archivedCount: number;
  byStatus: AnalyticsByStatus;
  openBugs: number;
  bugReports: number;
  moves: number;
  averageMsToDone: number | null;
  sampleSize: number;
  completionTimestampSource: string;
  averageMsToSolveBug: number | null;
  sampleSizeBugSolves: number;
  averageMsInDevTest: number | null;
  sampleSizeDevTestDwells: number;
  averageMsInQaTest: number | null;
  sampleSizeQaTestDwells: number;
  testDurationSource: string;
  dwellByStatus: AnalyticsDwellByStatus;
  longestStay: AnalyticsLongestStay | null;
  checklistTasks: number;
  checklistItemsTotal: number;
  checklistItemsChecked: number;
  checklistCompleteTasks: number;
  checklistOpenBugs: number;
  byPerson: AnalyticsPersonRow[];
  trend: AnalyticsTrend;
}

export interface AnalyticsSummaryQuery {
  organizationId?: string;
  projectId?: string;
  period?: AnalyticsPeriodKey;
  from?: string;
  to?: string;
  compareMode?: AnalyticsCompareMode;
  compareFrom?: string;
  compareTo?: string;
}
