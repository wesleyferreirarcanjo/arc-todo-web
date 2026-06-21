export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskCriticity = 'low' | 'medium' | 'high' | 'critical';

export interface SubtaskProgress {
  total: number;
  done: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  criticity: TaskCriticity;
  dueDate: string | null;
  projectId: string;
  parentTaskId?: string | null;
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
  parentTaskId?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  criticity?: TaskCriticity;
  dueDate?: string;
  parentTaskId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  criticity?: TaskCriticity;
  dueDate?: string | null;
  parentTaskId?: string | null;
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
