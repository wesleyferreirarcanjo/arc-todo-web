import { apiRequest } from './client';
import type { LoginInput, LoginResponse } from '../../types/auth';

export function login(input: LoginInput): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: input,
    auth: false,
  });
}
