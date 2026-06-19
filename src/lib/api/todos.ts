import { apiRequest } from './client';
import type {
  CreateTaskInput,
  Task,
  UpdateTaskInput,
} from '../../types/todo';

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
