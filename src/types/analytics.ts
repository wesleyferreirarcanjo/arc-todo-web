export type AnalyticsTaskStatus =
  | 'todo'
  | 'in_progress'
  | 'dev_test'
  | 'qa_test'
  | 'done';

export type AnalyticsByStatus = Record<AnalyticsTaskStatus, number>;

export interface AnalyticsPersonRow {
  userId: string | null;
  username: string;
  tasksCreated: number;
  moves: number;
  openBugs: number;
  averageMsToDone: number | null;
  sampleSizeToDone: number;
  averageMsInTest: number | null;
  sampleSizeTestDwells: number;
}

export interface AnalyticsSummary {
  tasksCreated: number;
  tasksCreatedLast7Days: number;
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
  checklistTasks: number;
  checklistItemsTotal: number;
  checklistItemsChecked: number;
  checklistCompleteTasks: number;
  checklistOpenBugs: number;
  byPerson: AnalyticsPersonRow[];
}

export interface AnalyticsSummaryQuery {
  organizationId?: string;
  projectId?: string;
}
