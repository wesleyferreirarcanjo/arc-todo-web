import { apiRequest } from './client';
import type {
  CreateTaskCommentInput,
  CreateTaskInput,
  ListTasksQuery,
  Task,
  TaskComment,
  TaskHistoryEntry,
  TaskWithContext,
  UpdateTaskInput,
} from '../../types/todo';

function buildTasksQueryString(query?: ListTasksQuery): string {
  if (!query) return '';

  const params = new URLSearchParams();
  if (query.organizationId) params.set('organizationId', query.organizationId);
  if (query.projectId) params.set('projectId', query.projectId);
  if (query.status) params.set('status', query.status);
  if (query.criticity) params.set('criticity', query.criticity);
  if (query.parentTaskId) params.set('parentTaskId', query.parentTaskId);

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function fetchAllTasks(query?: ListTasksQuery): Promise<TaskWithContext[]> {
  return apiRequest<TaskWithContext[]>(`/tasks${buildTasksQueryString(query)}`);
}

export function fetchProjectTasks(
  orgId: string,
  projectId: string,
): Promise<Task[]> {
  return apiRequest<Task[]>(
    `/organizations/${orgId}/projects/${projectId}/tasks`,
  );
}

export function createProjectTask(
  orgId: string,
  projectId: string,
  input: CreateTaskInput,
): Promise<Task> {
  return apiRequest<Task>(
    `/organizations/${orgId}/projects/${projectId}/tasks`,
    {
      method: 'POST',
      body: input,
    },
  );
}

export function updateProjectTask(
  orgId: string,
  projectId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<Task> {
  return apiRequest<Task>(
    `/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`,
    {
      method: 'PATCH',
      body: input,
    },
  );
}

export function deleteProjectTask(
  orgId: string,
  projectId: string,
  taskId: string,
): Promise<void> {
  return apiRequest<void>(
    `/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`,
    {
      method: 'DELETE',
    },
  );
}

export function fetchTaskComments(
  orgId: string,
  projectId: string,
  taskId: string,
): Promise<TaskComment[]> {
  return apiRequest<TaskComment[]>(
    `/organizations/${orgId}/projects/${projectId}/tasks/${taskId}/comments`,
  );
}

export function createTaskComment(
  orgId: string,
  projectId: string,
  taskId: string,
  input: CreateTaskCommentInput,
): Promise<TaskComment> {
  return apiRequest<TaskComment>(
    `/organizations/${orgId}/projects/${projectId}/tasks/${taskId}/comments`,
    {
      method: 'POST',
      body: input,
    },
  );
}

export function fetchTaskHistory(
  orgId: string,
  projectId: string,
  taskId: string,
): Promise<TaskHistoryEntry[]> {
  return apiRequest<TaskHistoryEntry[]>(
    `/organizations/${orgId}/projects/${projectId}/tasks/${taskId}/history`,
  );
}
