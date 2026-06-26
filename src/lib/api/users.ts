import { apiRequest } from './client';
import type { User } from '../../types/auth';
import type {
  CreateUserInput,
  ManagedUser,
  UpdateUserInput,
} from '../../types/user';

export function fetchMe(): Promise<User> {
  return apiRequest<User>('/auth/me');
}

export function fetchUsers(): Promise<ManagedUser[]> {
  return apiRequest<ManagedUser[]>('/users');
}

export function createUser(input: CreateUserInput): Promise<ManagedUser> {
  return apiRequest<ManagedUser>('/users', {
    method: 'POST',
    body: input,
  });
}

export function updateUser(
  userId: string,
  input: UpdateUserInput,
): Promise<ManagedUser> {
  return apiRequest<ManagedUser>(`/users/${userId}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteUser(userId: string): Promise<void> {
  return apiRequest<void>(`/users/${userId}`, {
    method: 'DELETE',
  });
}
