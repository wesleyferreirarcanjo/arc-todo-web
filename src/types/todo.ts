export type TaskStatus = 'todo' | 'in_progress' | 'dev_test' | 'qa_test' | 'done';
export type TaskCriticity = 'low' | 'medium' | 'high' | 'critical';
export type TaskCategory =
  | 'coding'
  | 'meeting'
  | 'design'
  | 'marketing'
  | 'other';

export interface QaChecklistState {
  checkedItemIds: string[];
}

export interface QaChecklistItem {
  id: string;
  label: string;
}

export interface QaChecklistProgress {
  done: number;
  total: number;
}

export interface TaskEvidence {
  id: string;
  taskId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  createdAt: string;
}

export interface SubtaskProgress {
  total: number;
  done: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  businessDescription?: string | null;
  planCodeDescription?: string | null;
  testDescription?: string | null;
  status: TaskStatus;
  criticity: TaskCriticity;
  dueDate: string | null;
  projectId: string;
  parentTaskId?: string | null;
  taskNumber: number;
  displayId: string;
  category: TaskCategory;
  metadata: Record<string, unknown>;
  isBug?: boolean;
  bugReason?: string | null;
  buggedAt?: string | null;
  buggedById?: string | null;
  qaChecklistState?: QaChecklistState;
  qaChecklistProgress?: QaChecklistProgress | null;
  subtaskProgress?: SubtaskProgress | null;
  subtasks?: Task[];
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithContext extends Task {
  project: {
    id: string;
    name: string;
    organizationId: string;
    color: string;
    acronym: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface ListTasksQuery {
  organizationId?: string;
  projectId?: string;
  status?: TaskStatus;
  criticity?: TaskCriticity;
  category?: TaskCategory;
  parentTaskId?: string;
  isBug?: boolean;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  businessDescription?: string;
  planCodeDescription?: string;
  testDescription?: string;
  status?: TaskStatus;
  criticity?: TaskCriticity;
  dueDate?: string;
  parentTaskId?: string;
  category?: TaskCategory;
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  businessDescription?: string;
  planCodeDescription?: string;
  testDescription?: string;
  status?: TaskStatus;
  criticity?: TaskCriticity;
  dueDate?: string | null;
  parentTaskId?: string | null;
  category?: TaskCategory;
  metadata?: Record<string, unknown>;
  isBug?: boolean;
  bugReason?: string | null;
  qaChecklistState?: QaChecklistState;
}

export type TaskHistoryField = 'title' | 'description' | 'dueDate';

export interface TaskComment {
  id: string;
  taskId: string;
  body: string;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  field: TaskHistoryField;
  oldValue: string | null;
  newValue: string | null;
  changedById: string | null;
  createdAt: string;
}

export interface CreateTaskCommentInput {
  body: string;
}

export interface TaskResolveResponse {
  id: string;
  displayId: string;
  taskNumber: number;
  organizationId: string;
  projectId: string;
  title: string;
  task: Task;
}

export interface TaskExportRow {
  schemaVersion: 2;
  id: string;
  displayId: string;
  organizationId: string;
  organizationName: string;
  projectId: string;
  projectName: string;
  projectAcronym: string;
  parentTaskId: string | null;
  parentDisplayId: string | null;
  title: string;
  description: string | null;
  businessDescription: string | null;
  planCodeDescription: string | null;
  testDescription: string | null;
  status: TaskStatus;
  criticity: TaskCriticity;
  category: TaskCategory;
  metadata: Record<string, unknown>;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskExportDocument {
  schemaVersion: 2;
  exportedAt: string;
  query?: ListTasksQuery;
  tasks: TaskExportRow[];
}

export type TaskExportFormat = 'json' | 'csv' | 'md' | 'xlsx';

export interface TaskImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}
