import { apiRequest } from './client';
import type {
  CreateTodoInput,
  Todo,
  UpdateTodoInput,
} from '../../types/todo';

export function fetchTodos(): Promise<Todo[]> {
  return apiRequest<Todo[]>('/todos');
}

export function createTodo(input: CreateTodoInput): Promise<Todo> {
  return apiRequest<Todo>('/todos', {
    method: 'POST',
    body: input,
  });
}

export function updateTodo(id: string, input: UpdateTodoInput): Promise<Todo> {
  return apiRequest<Todo>(`/todos/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteTodo(id: string): Promise<void> {
  return apiRequest<void>(`/todos/${id}`, {
    method: 'DELETE',
  });
}
