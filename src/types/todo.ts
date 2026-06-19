export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
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
  priority?: TaskPriority;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
}
