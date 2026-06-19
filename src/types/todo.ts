export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskCriticity = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  criticity: TaskCriticity;
  dueDate: string | null;
  projectId: string;
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
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  criticity?: TaskCriticity;
  dueDate?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  criticity?: TaskCriticity;
  dueDate?: string | null;
}
