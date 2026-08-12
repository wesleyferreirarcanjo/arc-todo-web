import { apiRequest } from './client';
import type { GoogleSsoInput, LoginInput, LoginResponse } from '../../types/auth';

export function login(input: LoginInput): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: input,
    auth: false,
  });
}

export function loginWithGoogle(input: GoogleSsoInput): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/sso/google', {
    method: 'POST',
    body: input,
    auth: false,
  });
}
